const { logger } = require('../utils/logger');
const StateManager = require('../utils/stateManager');
const BatchMonitor = require('../services/batchMonitor');
const ResultsProcessor = require('../services/resultsProcessor');
const LibraryBuilder = require('../services/libraryBuilder');
const GithubUploader = require('../services/githubUploader');
const BatchFormatter = require('../services/batchFormatter');
const BatchSubmitter = require('../services/batchSubmitter');

/**
 * Complete Command - Download results, build library, upload to GitHub
 * Includes automatic retry logic for failed articles
 */
async function complete() {
    logger.section('COMPLETE: Download Results & Build Library');
    
    const stateManager = new StateManager();
    
    // Load state
    const state = stateManager.loadState();
    if (!state) {
        logger.error('No batch in progress');
        throw new Error('No batch found. Run submit command first.');
    }
    
    try {
        // Step 1: Verify batch is complete
        logger.subsection('Step 1: Verifying batch status');
        const monitor = new BatchMonitor();
        const status = await monitor.checkStatus(state.batchId);
        
        if (status.status !== 'completed') {
            throw new Error(`Batch not complete yet (status: ${status.status}). Run 'check' to see progress.`);
        }
        
        if (!status.outputFileId) {
            throw new Error('No output file available');
        }
        
        logger.info('✅ Batch completed');
        
        // Step 2: Download and process results
        logger.subsection('Step 2: Downloading results');
        const processor = new ResultsProcessor();
        const jsonlContent = await processor.downloadResults(status.outputFileId);
        
        logger.subsection('Step 3: Processing results');
        let results = processor.parseResults(jsonlContent);
        
        logger.info('Initial results:', results.statistics);
        
        // Step 4: Handle failures with retry logic
        let allSuccessful = results.successful;
        let remainingFailed = results.failed;
        const retryBatches = [];
        const maxRetries = 3;
        let retryCount = 0;
        
        while (remainingFailed.length > 0 && retryCount < maxRetries) {
            retryCount++;
            logger.section(`RETRY ${retryCount}/${maxRetries}: ${remainingFailed.length} failed articles`);
            
            // Get failed articles from original state
            const failedArticles = state.articles.filter(article => 
                remainingFailed.some(f => f.articleId === article.id)
            );
            
            logger.info(`Retrying ${failedArticles.length} articles`);
            
            // Create retry batch
            logger.subsection('Creating retry batch');
            const formatter = new BatchFormatter();
            const retryBatchFile = await formatter.createBatchFile(
                failedArticles,
                `${state.section}-retry${retryCount}`
            );
            
            // Submit retry batch
            const submitter = new BatchSubmitter();
            const retryFileId = await submitter.uploadFile(retryBatchFile.filePath);
            const retryBatch = await submitter.createBatch(retryFileId, {
                section: state.section,
                retry: retryCount,
                article_count: failedArticles.length
            });
            
            retryBatches.push(retryBatch.id);
            logger.info(`Retry batch created: ${retryBatch.id}`);
            
            // Wait for retry batch to complete
            logger.info('Waiting for retry batch to complete...');
            const retryStatus = await monitor.pollUntilComplete(retryBatch.id, 5);
            
            // Download retry results
            logger.info('Downloading retry results');
            const retryJsonl = await processor.downloadResults(retryStatus.outputFileId);
            const retryResults = processor.parseResults(retryJsonl);
            
            logger.info('Retry results:', retryResults.statistics);
            
            // Update results
            allSuccessful = [...allSuccessful, ...retryResults.successful];
            remainingFailed = retryResults.failed;
        }
        
        // Final validation
        if (remainingFailed.length > 0) {
            logger.error(`Failed to process ${remainingFailed.length} articles after ${maxRetries} retries`);
            logger.error('Failed articles:', remainingFailed.map(f => f.articleId));
            throw new Error(`Library incomplete: ${remainingFailed.length} articles failed after retries`);
        }
        
        logger.section('✅ ALL ARTICLES PROCESSED SUCCESSFULLY');
        logger.info(`Total successful: ${allSuccessful.length}/${state.articleCount}`);
        
        // Step 5: Build library
        logger.subsection('Step 4: Building library');
        const builder = new LibraryBuilder();
        const library = builder.buildLibrary(
            state.articles,
            allSuccessful,
            {
                section: state.section,
                batchId: state.batchId,
                retryBatches: retryBatches,
                totalTokens: results.statistics.tokens.total,
                processingTimeHours: calculateProcessingTime(state.submittedAt)
            }
        );
        
        logger.info('✅ Library built');
        logger.info(`   Articles: ${library.articles.length}`);
        logger.info(`   Date range: ${library.metadata.date_range.from} to ${library.metadata.date_range.to}`);
        
        // Save library locally
        const filename = `${state.section}.json`;
        const localPath = builder.saveToFile(library, filename);
        logger.info(`✅ Saved locally: ${localPath}`);
        
        // Step 6: Upload to GitHub
        logger.subsection('Step 5: Uploading to GitHub');
        const uploader = new GithubUploader();
        const targetPath = `backend/data/article-library/${state.section}.json`;
        const uploadResult = await uploader.uploadLibrary(library, targetPath);
        
        logger.info('✅ Uploaded to GitHub');
        logger.info(`   URL: ${uploadResult.fileUrl}`);
        
        // Step 7: Clear state
        logger.subsection('Step 6: Cleaning up');
        stateManager.clearState();
        logger.info('✅ State cleared');
        
        // Final summary
        logger.section('🎉 COMPLETE!');
        logger.info(`Section: ${state.section}`);
        logger.info(`Articles: ${library.articles.length}`);
        logger.info(`Retries: ${retryCount}`);
        logger.info(`Total tokens: ${results.statistics.tokens.total.toLocaleString()}`);
        logger.info(`Average tokens/summary: ${results.statistics.averageTokensPerSummary}`);
        logger.info(`GitHub URL: ${uploadResult.fileUrl}`);
        logger.info('');
        logger.info('Library is now available in juggernaut-reports repository!');
        
        return {
            success: true,
            library,
            githubUrl: uploadResult.fileUrl,
            statistics: results.statistics
        };
        
    } catch (error) {
        logger.error('Complete failed', { error: error.message });
        throw error;
    }
}

/**
 * Calculate processing time in hours
 */
function calculateProcessingTime(submittedAt) {
    const submitted = new Date(submittedAt);
    const now = new Date();
    const diffMs = now - submitted;
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.round(diffHours * 10) / 10; // Round to 1 decimal
}

module.exports = complete;

