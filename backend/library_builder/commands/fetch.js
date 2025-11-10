const { logger } = require('../utils/logger');
const StateManager = require('../utils/stateManager');
const GuardianFetcher = require('../services/guardianFetcher');
const BatchFormatter = require('../services/batchFormatter');

/**
 * Fetch Command - Fetch articles and create batch file (without submitting)
 */
async function fetch(options) {
    const { section, days } = options;
    
    logger.section(`FETCH: ${section} section (last ${days} days)`);
    
    if (!section) {
        throw new Error('Section is required to fetch articles');
    }

    const stateManager = new StateManager({ section });
    
    // Check if there's already a fetched/submitted batch
    if (stateManager.hasState()) {
        const existingState = stateManager.loadState();
        logger.warn('Existing batch found', { 
            status: existingState.status,
            section: existingState.section
        });
        throw new Error(`Batch already exists for section "${section}" (status: ${existingState.status}). Clear state first to re-fetch.`);
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
        
        // Step 3: Save state
        logger.subsection('Step 3: Saving state');
        const state = {
            status: 'fetched',
            section,
            days,
            fetchedAt: new Date().toISOString(),
            articleCount: articles.length,
            batchFilePath: batchFile.filePath,
            articles: articles
        };
        
        stateManager.saveState(state);
        logger.info('✅ State saved');
        
        // Summary
        logger.section('FETCH COMPLETE');
        logger.info(`Section: ${section}`);
        logger.info(`Articles: ${articles.length}`);
        logger.info(`Batch file: ${batchFile.filePath}`);
        logger.info('');
        logger.info('Next steps:');
        logger.info('  1. Review the batch file to verify the input');
        logger.info('  2. Run: node generate-library.js submit');
        
        return {
            success: true,
            articleCount: articles.length,
            batchFilePath: batchFile.filePath
        };
        
    } catch (error) {
        logger.error('Fetch failed', { error: error.message });
        throw error;
    }
}

module.exports = fetch;

