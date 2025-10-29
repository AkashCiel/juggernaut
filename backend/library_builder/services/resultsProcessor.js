const https = require('https');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

/**
 * ResultsProcessor - Downloads and processes batch results
 */
class ResultsProcessor {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        if (!this.apiKey) {
            throw new Error('OPENAI_API_KEY environment variable not set');
        }
    }

    /**
     * Download results file from OpenAI
     * @param {string} fileId - Output file ID
     * @returns {Promise<string>} - JSONL content
     */
    async downloadResults(fileId) {
        logger.info('Downloading results file', { fileId });
        
        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: `/v1/files/${fileId}/content`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`
            }
        };
        
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        logger.error('Results download failed', { 
                            status: res.statusCode 
                        });
                        reject(new Error(`Download failed with status ${res.statusCode}`));
                        return;
                    }
                    
                    logger.info('Results downloaded', { 
                        size: `${(data.length / 1024).toFixed(2)} KB`
                    });
                    
                    // Save to file for backup
                    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
                    const filename = `results-${fileId}-${timestamp}.jsonl`;
                    const filepath = path.join(__dirname, '../data/results', filename);
                    
                    const dir = path.dirname(filepath);
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }
                    
                    fs.writeFileSync(filepath, data, 'utf8');
                    logger.debug('Results saved to file', { filepath });
                    
                    resolve(data);
                });
            });
            
            req.on('error', (err) => {
                logger.error('Download request failed', { error: err.message });
                reject(err);
            });
            
            req.end();
        });
    }

    /**
     * Parse JSONL results into successful and failed arrays
     * @param {string} jsonlContent - JSONL content
     * @returns {Object} - {successful, failed, statistics}
     */
    parseResults(jsonlContent) {
        logger.info('Parsing results');
        
        const successful = [];
        const failed = [];
        const lines = jsonlContent.trim().split('\n');
        
        let totalTokens = 0;
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;
        
        lines.forEach((line, index) => {
            try {
                const result = JSON.parse(line);
                const customId = result.custom_id;
                
                if (result.error) {
                    // Request failed
                    logger.warn('Request failed', { 
                        customId,
                        error: result.error 
                    });
                    failed.push({
                        articleId: customId,
                        error: result.error
                    });
                } else if (result.response && result.response.body) {
                    // Request succeeded
                    const body = result.response.body;
                    const summary = this.extractSummary(body);
                    
                    if (summary) {
                        successful.push({
                            articleId: customId,
                            summary: summary.summary,
                            summaryTokens: body.usage?.completion_tokens || 0
                        });
                        
                        // Accumulate token usage
                        if (body.usage) {
                            totalPromptTokens += body.usage.prompt_tokens || 0;
                            totalCompletionTokens += body.usage.completion_tokens || 0;
                            totalTokens += body.usage.total_tokens || 0;
                        }
                    } else {
                        logger.warn('Failed to extract summary', { customId });
                        failed.push({
                            articleId: customId,
                            error: 'Failed to parse summary from response'
                        });
                    }
                }
            } catch (e) {
                logger.error('Failed to parse result line', { 
                    line: index + 1,
                    error: e.message 
                });
            }
        });
        
        const statistics = {
            total: lines.length,
            successful: successful.length,
            failed: failed.length,
            successRate: ((successful.length / lines.length) * 100).toFixed(1) + '%',
            tokens: {
                prompt: totalPromptTokens,
                completion: totalCompletionTokens,
                total: totalTokens
            },
            averageTokensPerSummary: successful.length > 0 
                ? Math.round(totalCompletionTokens / successful.length)
                : 0
        };
        
        logger.info('Results parsed', statistics);
        
        return {
            successful,
            failed,
            statistics
        };
    }

    /**
     * Extract summary from OpenAI response body
     * GPT-5 returns format: {"article-id": "summary text"}
     * @param {Object} responseBody - Response body from OpenAI
     * @returns {Object|null} - {id, summary} or null
     */
    extractSummary(responseBody) {
        try {
            const content = responseBody.choices[0].message.content;
            const parsed = JSON.parse(content);
            
            // Expected format: {"article-id": "summary text"}
            const keys = Object.keys(parsed);
            
            if (keys.length === 0) {
                logger.warn('Empty response object', { content });
                return null;
            }
            
            if (keys.length > 1) {
                logger.warn('Multiple keys in response (expected 1)', { 
                    keyCount: keys.length,
                    keys: keys
                });
            }
            
            const articleId = keys[0];
            const summaryText = parsed[articleId];
            
            if (typeof summaryText !== 'string' || summaryText.length === 0) {
                logger.warn('Invalid summary format', { 
                    articleId,
                    summaryType: typeof summaryText
                });
                return null;
            }
            
            return {
                id: articleId,
                summary: summaryText
            };
            
        } catch (e) {
            logger.error('Failed to extract summary', { error: e.message });
            return null;
        }
    }
}

module.exports = ResultsProcessor;

