const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');
const { SYSTEM_PROMPT, OPENAI_MODEL, formatUserPrompt } = require('../config/constants');
const Validator = require('../utils/validator');

/**
 * BatchFormatter - Creates JSONL batch files for OpenAI Batch API
 */
class BatchFormatter {
    constructor() {
        this.validator = new Validator();
    }

    /**
     * Create batch JSONL file from articles
     * @param {Array} articles - Array of article objects
     * @param {string} section - Section name (for filename)
     * @returns {Promise<Object>} - {filePath, articleCount}
     */
    async createBatchFile(articles, section) {
        logger.info(`Creating batch file for ${articles.length} articles`);
        
        try {
            // Validate articles first
            const validation = this.validator.validateArticles(articles);
            if (!validation.valid) {
                throw new Error(`Article validation failed: ${validation.errors.join(', ')}`);
            }
            
            // Generate filename
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${section}-${timestamp}.jsonl`;
            const filePath = path.join(__dirname, '../data/batches', filename);
            
            // Ensure directory exists
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Create JSONL content
            const lines = articles.map(article => {
                const request = this.formatArticleRequest(article);
                return JSON.stringify(request);
            });
            
            const content = lines.join('\n');
            
            // Write to file
            fs.writeFileSync(filePath, content, 'utf8');
            
            logger.info(`Batch file created`, { 
                filePath, 
                articleCount: articles.length,
                fileSize: `${(content.length / 1024).toFixed(2)} KB`
            });
            
            // Validate JSONL file
            const jsonlValidation = this.validator.validateJsonlFile(filePath);
            if (!jsonlValidation.valid) {
                throw new Error(`JSONL validation failed: ${jsonlValidation.errors.join(', ')}`);
            }
            
            return {
                filePath,
                articleCount: articles.length,
                fileSize: content.length
            };
            
        } catch (error) {
            logger.error('Failed to create batch file', { error: error.message });
            throw error;
        }
    }

    /**
     * Format a single article into a batch request object
     * @param {Object} article - Article object
     * @returns {Object} - Batch request object
     */
    formatArticleRequest(article) {
        const userPrompt = formatUserPrompt(article);
        
        return {
            custom_id: article.id,
            method: 'POST',
            url: '/v1/chat/completions',
            body: {
                model: OPENAI_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: SYSTEM_PROMPT
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 1,
                response_format: { type: 'json_object' }
            }
        };
    }
}

module.exports = BatchFormatter;

