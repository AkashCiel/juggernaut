const { logger, logApiCall } = require('./logger-vercel');
const { OPENAI_MODEL, OPENAI_TEMPERATURE } = require('../config/constants');

/**
 * Shared OpenAI client for consistent API calls across all services
 */
class OpenAIClient {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.model = OPENAI_MODEL;
        this.temperature = OPENAI_TEMPERATURE || 1.0;
    }

    /**
     * Make OpenAI API call without retry logic (retry handled by caller)
     * @param {Array} messages - Conversation messages
     * @param {number} temperature - Response temperature (optional)
     * @returns {Promise<string>} AI response
     */
    async callOpenAI(messages, temperature = this.temperature) {
        try {
            const response = await this.makeOpenAIRequest(messages, temperature);
            
            logApiCall('openai', 'callOpenAI', { 
                messageCount: messages.length,
                responseLength: response.length,
                temperature
            });
            
            return response;
        } catch (error) {
            logger.error(`❌ OpenAI API call failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Make actual OpenAI API request
     * @param {Array} messages - Conversation messages
     * @param {number} temperature - Response temperature
     * @returns {Promise<string>} AI response
     */
    async makeOpenAIRequest(messages, temperature) {
        const https = require('https');
        
        const requestData = {
            model: this.model,
            messages: messages,
            temperature: temperature
        };
        
        let data;
        try {
            data = JSON.stringify(requestData);
        } catch (jsonError) {
            throw new Error(`JSON serialization failed: ${jsonError.message}`);
        }
        
        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Length': Buffer.byteLength(data, 'utf8')
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    // Check HTTP status code before parsing
                    if (res.statusCode !== 200) {
                        // Try to parse error response as JSON
                        try {
                            const errorJson = JSON.parse(responseData);
                            if (errorJson.error && errorJson.error.message) {
                                reject(new Error(`OpenAI API error (${res.statusCode}): ${errorJson.error.message}`));
                            } else {
                                reject(new Error(`OpenAI API error (${res.statusCode}): ${responseData.substring(0, 200)}`));
                            }
                        } catch (parseError) {
                            // Response is not JSON (likely HTML error page)
                            reject(new Error(`OpenAI API returned non-200 status (${res.statusCode}). Response: ${responseData.substring(0, 200)}`));
                        }
                        return;
                    }
                    
                    // Status 200 - parse JSON response
                    try {
                        const json = JSON.parse(responseData);
                        if (json.error) {
                            reject(new Error(`OpenAI API error: ${json.error.message}`));
                        } else {
                            resolve(json.choices[0].message.content);
                        }
                    } catch (e) {
                        reject(new Error(`Failed to parse OpenAI response: ${e.message}`));
                    }
                });
            });

            req.on('error', (err) => {
                reject(err);
            });

            req.write(data);
            req.end();
        });
    }
}

module.exports = OpenAIClient;
