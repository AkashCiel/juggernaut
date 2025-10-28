const { logger } = require('../utils/logger');
const StateManager = require('../utils/stateManager');
const GuardianFetcher = require('../services/guardianFetcher');
const BatchFormatter = require('../services/batchFormatter');
const BatchSubmitter = require('../services/batchSubmitter');

/**
 * Submit Command - Fetch articles and submit batch to OpenAI
 */
async function submit(options) {
    const { section, days } = options;
    
    logger.section(`SUBMIT: ${section} section (last ${days} days)`);
    
    const stateManager = new StateManager();
    
    // Check if there's already an in-progress batch
    if (stateManager.hasState()) {
        const existingState = stateManager.loadState();
        logger.warn('Existing batch found', { 
            batchId: existingState.batchId,
            status: existingState.status
        });
        throw new Error(`Batch already in progress (${existingState.batchId}). Run 'check' or clear state first.`);
    }
    
    try {
        // Step 1: Fetch articles from Guardian
        logger.subsection('Step 1: Fetching articles from Guardian');
        const fetcher = new GuardianFetcher();
        const articles = await fetcher.fetchSectionArticles(section, days);
        
        if (articles.length === 0) {
            throw new Error(`No articles found for ${section} in the last ${days} days`);
        }
        
        logger.info(`✅ Fetched ${articles.length} articles`);
        
        // Step 2: Create batch JSONL file
        logger.subsection('Step 2: Creating batch file');
        const formatter = new BatchFormatter();
        const batchFile = await formatter.createBatchFile(articles, section);
        
        logger.info(`✅ Batch file created: ${batchFile.filePath}`);
        logger.info(`   Articles: ${batchFile.articleCount}`);
        logger.info(`   Size: ${(batchFile.fileSize / 1024).toFixed(2)} KB`);
        
        // Step 3: Upload to OpenAI
        logger.subsection('Step 3: Uploading to OpenAI');
        const submitter = new BatchSubmitter();
        const fileId = await submitter.uploadFile(batchFile.filePath);
        
        logger.info(`✅ File uploaded: ${fileId}`);
        
        // Step 4: Create batch job
        logger.subsection('Step 4: Creating batch job');
        const batch = await submitter.createBatch(fileId, {
            section,
            days,
            article_count: articles.length
        });
        
        logger.info(`✅ Batch created: ${batch.id}`);
        logger.info(`   Status: ${batch.status}`);
        logger.info(`   Requests: ${batch.request_counts?.total || articles.length}`);
        
        // Step 5: Save state
        logger.subsection('Step 5: Saving state');
        const state = {
            batchId: batch.id,
            section,
            days,
            status: batch.status,
            submittedAt: new Date().toISOString(),
            articleCount: articles.length,
            batchFilePath: batchFile.filePath,
            inputFileId: fileId,
            articles: articles
        };
        
        stateManager.saveState(state);
        logger.info('✅ State saved');
        
        // Summary
        logger.section('SUBMIT COMPLETE');
        logger.info(`Batch ID: ${batch.id}`);
        logger.info(`Articles: ${articles.length}`);
        logger.info(`Status: ${batch.status}`);
        logger.info('');
        logger.info('Next steps:');
        logger.info('  1. Wait ~24 hours for batch processing');
        logger.info('  2. Run: node generate-library.js check');
        logger.info('  3. When complete, run: node generate-library.js complete');
        
        return {
            success: true,
            batchId: batch.id,
            articleCount: articles.length
        };
        
    } catch (error) {
        logger.error('Submit failed', { error: error.message });
        throw error;
    }
}

module.exports = submit;

