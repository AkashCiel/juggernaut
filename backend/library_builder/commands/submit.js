const { logger } = require('../utils/logger');
const StateManager = require('../utils/stateManager');
const BatchSubmitter = require('../services/batchSubmitter');

/**
 * Submit Command - Submit fetched batch to OpenAI
 */
async function submit(options = {}) {
    logger.section('SUBMIT: Upload batch to OpenAI');
    
    const { section } = options;
    
    if (!section) {
        throw new Error('Section is required to submit a batch');
    }
    
    const stateManager = new StateManager({ section });
    
    // Load state
    const state = stateManager.loadState();
    if (!state) {
        logger.error('No fetched batch found');
        throw new Error('No batch found. Run fetch command first.');
    }

    if (state.section && state.section !== section) {
        logger.error('State section mismatch', { expected: section, found: state.section });
        throw new Error(`Batch state belongs to "${state.section}" but "${section}" was requested.`);
    }

    // Ensure section is recorded in state for legacy files
    if (!state.section) {
        state.section = section;
        stateManager.updateState({ section });
    }
    
    // Validate state
    if (state.status === 'submitted' || state.status === 'validating' || state.status === 'in_progress') {
        logger.warn('Batch already submitted', { 
            batchId: state.batchId,
            status: state.status
        });
        throw new Error(`Batch already submitted (${state.batchId}). Run 'check' to see status.`);
    }
    
    if (state.status !== 'fetched') {
        logger.warn('Invalid state', { status: state.status });
        throw new Error(`Cannot submit batch in state: ${state.status}. Expected 'fetched'.`);
    }
    
    logger.info('Submitting batch', { 
        section: state.section,
        articleCount: state.articleCount,
        batchFile: state.batchFilePath
    });
    
    try {
        // Step 1: Upload to OpenAI
        logger.subsection('Step 1: Uploading to OpenAI');
        const submitter = new BatchSubmitter();
        const fileId = await submitter.uploadFile(state.batchFilePath);
        
        logger.info(`✅ File uploaded: ${fileId}`);
        
        // Step 2: Create batch job
        logger.subsection('Step 2: Creating batch job');
        const batch = await submitter.createBatch(fileId, {
            section: String(state.section),
            days: String(state.days),
            article_count: String(state.articleCount)
        });
        
        logger.info(`✅ Batch created: ${batch.id}`);
        logger.info(`   Status: ${batch.status}`);
        logger.info(`   Requests: ${batch.request_counts?.total || state.articleCount}`);
        
        // Step 3: Update state
        logger.subsection('Step 3: Updating state');
        stateManager.updateState({
            batchId: batch.id,
            status: batch.status,
            submittedAt: new Date().toISOString(),
            inputFileId: fileId
        });
        
        logger.info('✅ State updated');
        
        // Summary
        logger.section('SUBMIT COMPLETE');
        logger.info(`Batch ID: ${batch.id}`);
        logger.info(`Articles: ${state.articleCount}`);
        logger.info(`Status: ${batch.status}`);
        logger.info('');
        logger.info('Next steps:');
        logger.info('  1. Wait ~24 hours for batch processing');
        logger.info('  2. Run: node generate-library.js check');
        logger.info('  3. When complete, run: node generate-library.js complete');
        
        return {
            success: true,
            batchId: batch.id,
            articleCount: state.articleCount
        };
        
    } catch (error) {
        logger.error('Submit failed', { error: error.message });
        throw error;
    }
}

module.exports = submit;
