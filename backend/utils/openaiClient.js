const { logger, logApiCall } = require('./logger');
const { retry, RETRY_CONFIGS } = require('./retryUtils');

/**
 * Shared OpenAI client for consistent API calls across all services
 */
class OpenAIClient {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.model = 'gpt-4o';
        this.temperature = 0.7;
        this.maxTokens = 800;
        this.timeout = 30000;
    }

    /**
     * Make OpenAI API call with retry logic and error handling
     * @param {Array} messages - Conversation messages
     * @param {number} temperature - Response temperature (optional)
     * @param {number} maxTokens - Maximum tokens (optional)
     * @returns {Promise<string>} AI response
     */
    async callOpenAI(messages, temperature = this.temperature, maxTokens = this.maxTokens) {
        try {
            const response = await retry(
                () => this.makeOpenAIRequest(messages, temperature, maxTokens),
                RETRY_CONFIGS.OPENAI
            );
            
            logApiCall('openai', 'callOpenAI', { 
                messageCount: messages.length,
                responseLength: response.length,
                temperature,
                maxTokens
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
     * @param {number} maxTokens - Maximum tokens
     * @returns {Promise<string>} AI response
     */
    async makeOpenAIRequest(messages, temperature, maxTokens) {
        const https = require('https');
        
        const requestData = {
            model: this.model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens
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
            const timeout = setTimeout(() => reject(new Error('OpenAI API request timeout')), this.timeout);
            
            const req = https.request(options, (res) => {
                clearTimeout(timeout);
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
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
                clearTimeout(timeout);
                reject(err);
            });

            req.write(data);
            req.end();
        });
    }
}

module.exports = OpenAIClient;
