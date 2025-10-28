const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');
const Validator = require('../utils/validator');

/**
 * LibraryBuilder - Builds final article library JSON
 */
class LibraryBuilder {
    constructor() {
        this.validator = new Validator();
    }

    /**
     * Build article library from articles and summaries
     * @param {Array} articles - Original article objects
     * @param {Array} summaries - Summary objects from results processor
     * @param {Object} batchMetadata - Metadata from batch processing
     * @returns {Object} - Complete library object
     */
    buildLibrary(articles, summaries, batchMetadata = {}) {
        logger.info('Building article library', { 
            articleCount: articles.length,
            summaryCount: summaries.length
        });
        
        // Validate completeness
        this.validateCompleteness(articles, summaries);
        
        // Create lookup map for summaries
        const summaryMap = new Map();
        summaries.forEach(summary => {
            summaryMap.set(summary.articleId, summary);
        });
        
        // Build library articles array
        const libraryArticles = articles.map(article => {
            const summary = summaryMap.get(article.id);
            
            if (!summary) {
                logger.warn('No summary found for article', { articleId: article.id });
                throw new Error(`Missing summary for article: ${article.id}`);
            }
            
            return {
                id: article.id,
                title: article.title,
                webUrl: article.webUrl,
                apiUrl: article.apiUrl,
                section: article.section,
                publishedDate: article.publishedDate,
                summary: summary.summary,
                summaryTokens: summary.summaryTokens,
                generatedAt: new Date().toISOString()
            };
        });
        
        // Calculate date range
        const dates = articles
            .map(a => new Date(a.publishedDate))
            .filter(d => !isNaN(d.getTime()))
            .sort((a, b) => a - b);
        
        const fromDate = dates.length > 0 ? dates[0].toISOString().split('T')[0] : null;
        const toDate = dates.length > 0 ? dates[dates.length - 1].toISOString().split('T')[0] : null;
        
        // Build complete library object
        const library = {
            metadata: {
                section: batchMetadata.section || articles[0]?.section || 'unknown',
                generated_at: new Date().toISOString(),
                date_range: {
                    from: fromDate,
                    to: toDate
                },
                article_count: libraryArticles.length,
                batch_info: {
                    initial_batch_id: batchMetadata.batchId,
                    retry_batches: batchMetadata.retryBatches || [],
                    total_tokens: batchMetadata.totalTokens || 0,
                    processing_time_hours: batchMetadata.processingTimeHours || 0
                }
            },
            articles: libraryArticles
        };
        
        // Validate library structure
        const validation = this.validator.validateLibrary(library);
        if (!validation.valid) {
            throw new Error(`Library validation failed: ${validation.errors.join(', ')}`);
        }
        
        logger.info('Library built successfully', { 
            articleCount: library.articles.length,
            dateRange: `${fromDate} to ${toDate}`
        });
        
        return library;
    }

    /**
     * Validate that every article has a summary
     * @param {Array} articles - Article objects
     * @param {Array} summaries - Summary objects
     */
    validateCompleteness(articles, summaries) {
        const articleIds = new Set(articles.map(a => a.id));
        const summaryIds = new Set(summaries.map(s => s.articleId));
        
        // Check for missing summaries
        const missingSummaries = [];
        articleIds.forEach(id => {
            if (!summaryIds.has(id)) {
                missingSummaries.push(id);
            }
        });
        
        if (missingSummaries.length > 0) {
            logger.error('Incomplete library - missing summaries', { 
                count: missingSummaries.length,
                examples: missingSummaries.slice(0, 5)
            });
            throw new Error(`Missing ${missingSummaries.length} summaries. Library is incomplete.`);
        }
        
        // Check for duplicate article IDs
        const duplicateArticles = articles.length - articleIds.size;
        if (duplicateArticles > 0) {
            throw new Error(`Found ${duplicateArticles} duplicate article IDs`);
        }
        
        logger.debug('Completeness validation passed');
    }

    /**
     * Save library to JSON file
     * @param {Object} library - Library object
     * @param {string} filename - Output filename (e.g., 'technology.json')
     * @returns {string} - File path
     */
    saveToFile(library, filename) {
        const filepath = path.join(__dirname, '../data', filename);
        
        // Ensure directory exists
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // Write JSON with pretty printing
        fs.writeFileSync(
            filepath,
            JSON.stringify(library, null, 2),
            'utf8'
        );
        
        const fileSize = fs.statSync(filepath).size;
        
        logger.info('Library saved to file', { 
            filepath,
            fileSize: `${(fileSize / 1024).toFixed(2)} KB`
        });
        
        return filepath;
    }
}

module.exports = LibraryBuilder;

