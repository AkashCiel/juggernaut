const { logger } = require('../utils/logger');
const StateManager = require('../utils/stateManager');
const BatchMonitor = require('../services/batchMonitor');

/**
 * Check Command - Check batch processing status
 */
async function check() {
    logger.section('CHECK: Batch Status');
    
    const stateManager = new StateManager();
    
    // Load state
    const state = stateManager.loadState();
    if (!state) {
        logger.error('No batch in progress');
        throw new Error('No batch found. Run submit command first.');
    }
    
    logger.info('Checking batch', { 
        batchId: state.batchId,
        section: state.section,
        submittedAt: state.submittedAt
    });
    
    try {
        // Check status
        const monitor = new BatchMonitor();
        const status = await monitor.checkStatus(state.batchId);
        
        // Update state with latest status
        stateManager.updateState({
            status: status.status,
            lastChecked: new Date().toISOString(),
            outputFileId: status.outputFileId,
            errorFileId: status.errorFileId,
            requestCounts: status.requestCounts
        });
        
        // Display status
        logger.section('BATCH STATUS');
        logger.info(`Batch ID: ${status.batchId}`);
        logger.info(`Status: ${status.status}`);
        
        if (status.requestCounts) {
            const { total, completed, failed } = status.requestCounts;
            const percentage = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
            
            logger.info(`Progress: ${percentage}% (${completed}/${total} completed)`);
            
            if (failed > 0) {
                logger.warn(`Failed requests: ${failed}`);
            }
        }
        
        // Provide next steps
        logger.info('');
        if (status.status === 'completed') {
            logger.info('✅ Batch processing complete!');
            logger.info('');
            logger.info('Next step:');
            logger.info('  Run: node generate-library.js complete');
        } else if (status.status === 'failed' || status.status === 'expired' || status.status === 'cancelled') {
            logger.error(`❌ Batch ${status.status}`);
            logger.info('');
            logger.info('You may need to submit a new batch');
        } else {
            logger.info('⏳ Batch still processing');
            logger.info('');
            logger.info('Check again later:');
            logger.info('  Run: node generate-library.js check');
        }
        
        return {
            success: true,
            status: status.status,
            progress: status.requestCounts
        };
        
    } catch (error) {
        logger.error('Check failed', { error: error.message });
        throw error;
    }
}

module.exports = check;

