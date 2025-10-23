const { logger, logApiCall } = require('../utils/logger');
const { retry, RETRY_CONFIGS } = require('../utils/retryUtils');
const { CHAT_SYSTEM_PROMPT, CHAT_WELCOME_MESSAGE, TOPIC_EXTRACTION_PROMPT, SYSTEM_PROMPTS } = require('../config/constants');

class ConversationService {
    constructor() {
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.model = 'gpt-4o';
        this.temperature = 0.7;
        this.maxTokens = 800;
        this.timeout = 30000;
        this.systemPrompt = CHAT_SYSTEM_PROMPT;
    }

    /**
     * Generate conversational response using OpenAI
     * @param {string} message - User's current message
     * @param {Array} chatHistory - Previous conversation messages
     * @returns {Promise<Object>} Response object
     */
    async generateResponse(message, chatHistory = []) {
        try {

            // Build conversation context
            const messages = this.buildConversationContext(message, chatHistory);
            
            // Call OpenAI API
            const response = await this.callOpenAI(messages);
            
            logApiCall('openai', 'conversation', { 
                messageLength: message.length,
                responseLength: response.length,
                historyLength: chatHistory.length
            });

            return {
                success: true,
                response: response,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Check if conversation is complete based on AI response format
     * @param {string} response - AI response text
     * @returns {boolean} True if conversation is complete
     */
    isConversationComplete(response) {
        return response.includes('[CONVERSATION_COMPLETE]');
    }

    /**
     * Build conversation context for OpenAI API
     * @param {string} message - Current user message
     * @param {Array} chatHistory - Previous messages
     * @returns {Array} Formatted messages for OpenAI
     */
    buildConversationContext(message, chatHistory) {
        const messages = [
            { role: 'system', content: this.systemPrompt }
        ];

        // If this is the first message (no chat history), add welcome message
        if (chatHistory.length === 0) {
            messages.push({
                role: 'assistant',
                content: CHAT_WELCOME_MESSAGE
            });
        }

        // Add conversation history
        chatHistory.forEach(msg => {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        });

        // Add current message
        messages.push({
            role: 'user',
            content: message
        });

        return messages;
    }

    /**
     * Call OpenAI API with retry logic
     * @param {Array} messages - Conversation messages
     * @param {number} temperature - Response temperature
     * @param {number} maxTokens - Maximum tokens
     * @returns {Promise<string>} AI response
     */
    async callOpenAI(messages, temperature = this.temperature, maxTokens = this.maxTokens) {
        // Temporarily bypass retry to see actual error
        try {
            return await this.makeOpenAIRequest(messages, temperature, maxTokens);
        } catch (error) {
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
        console.log('🔍 Request data:', data);
        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.openaiApiKey}`,
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

    /**
     * Format chat history for topic extraction
     * @param {Array} chatHistory - Conversation history
     * @returns {string} Formatted history
     */
    formatHistoryForExtraction(chatHistory) {
        return chatHistory.map(msg => 
            `${msg.role}: ${msg.content}`
        ).join('\n');
    }



}

module.exports = ConversationService;
