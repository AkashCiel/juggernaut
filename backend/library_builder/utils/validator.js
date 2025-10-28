const fs = require('fs');
const { logger } = require('./logger');

/**
 * Validator - Validates data structures and files
 */
class Validator {
    /**
     * Validate JSONL file format
     * @param {string} filePath - Path to JSONL file
     * @returns {Object} - {valid: boolean, errors: Array}
     */
    validateJsonlFile(filePath) {
        const errors = [];
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.trim().split('\n');
            
            lines.forEach((line, index) => {
                try {
                    const obj = JSON.parse(line);
                    
                    // Check required fields
                    if (!obj.custom_id) {
                        errors.push(`Line ${index + 1}: Missing custom_id`);
                    }
                    if (!obj.method) {
                        errors.push(`Line ${index + 1}: Missing method`);
                    }
                    if (!obj.url) {
                        errors.push(`Line ${index + 1}: Missing url`);
                    }
                    if (!obj.body) {
                        errors.push(`Line ${index + 1}: Missing body`);
                    }
                } catch (e) {
                    errors.push(`Line ${index + 1}: Invalid JSON - ${e.message}`);
                }
            });
            
            const valid = errors.length === 0;
            
            if (valid) {
                logger.debug('JSONL file validation passed', { 
                    filePath, 
                    lines: lines.length 
                });
            } else {
                logger.warn('JSONL file validation failed', { 
                    filePath, 
                    errorCount: errors.length 
                });
            }
            
            return { valid, errors };
            
        } catch (error) {
            logger.error('JSONL validation error', { error: error.message });
            return { 
                valid: false, 
                errors: [`File error: ${error.message}`] 
            };
        }
    }

    /**
     * Validate articles array
     * @param {Array} articles - Array of article objects
     * @returns {Object} - {valid: boolean, errors: Array}
     */
    validateArticles(articles) {
        const errors = [];
        
        if (!Array.isArray(articles)) {
            return { 
                valid: false, 
                errors: ['Articles must be an array'] 
            };
        }
        
        if (articles.length === 0) {
            return { 
                valid: false, 
                errors: ['Articles array is empty'] 
            };
        }
        
        const seenIds = new Set();
        
        articles.forEach((article, index) => {
            // Check required fields
            if (!article.id) {
                errors.push(`Article ${index}: Missing id`);
            }
            if (!article.title) {
                errors.push(`Article ${index}: Missing title`);
            }
            if (!article.bodyText && !article.trailText) {
                errors.push(`Article ${index}: Missing both bodyText and trailText`);
            }
            
            // Check for duplicates
            if (article.id) {
                if (seenIds.has(article.id)) {
                    errors.push(`Article ${index}: Duplicate id ${article.id}`);
                }
                seenIds.add(article.id);
            }
        });
        
        const valid = errors.length === 0;
        
        if (valid) {
            logger.debug('Articles validation passed', { 
                count: articles.length 
            });
        } else {
            logger.warn('Articles validation failed', { 
                errorCount: errors.length 
            });
        }
        
        return { valid, errors };
    }

    /**
     * Validate library structure
     * @param {Object} library - Library object
     * @returns {Object} - {valid: boolean, errors: Array}
     */
    validateLibrary(library) {
        const errors = [];
        
        // Check top-level structure
        if (!library.metadata) {
            errors.push('Missing metadata');
        }
        if (!library.articles) {
            errors.push('Missing articles array');
        }
        
        // Validate metadata
        if (library.metadata) {
            if (!library.metadata.section) {
                errors.push('Metadata missing section');
            }
            if (!library.metadata.generated_at) {
                errors.push('Metadata missing generated_at');
            }
            if (!library.metadata.article_count) {
                errors.push('Metadata missing article_count');
            }
        }
        
        // Validate articles
        if (library.articles) {
            if (!Array.isArray(library.articles)) {
                errors.push('Articles must be an array');
            } else {
                library.articles.forEach((article, index) => {
                    if (!article.id) {
                        errors.push(`Article ${index}: Missing id`);
                    }
                    if (!article.summary) {
                        errors.push(`Article ${index}: Missing summary`);
                    }
                });
                
                // Check count matches
                if (library.metadata && library.metadata.article_count !== library.articles.length) {
                    errors.push(`Article count mismatch: metadata says ${library.metadata.article_count}, but found ${library.articles.length}`);
                }
            }
        }
        
        const valid = errors.length === 0;
        
        if (valid) {
            logger.debug('Library validation passed');
        } else {
            logger.warn('Library validation failed', { 
                errorCount: errors.length 
            });
        }
        
        return { valid, errors };
    }
}

module.exports = Validator;

