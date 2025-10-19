const { logger, logApiCall } = require('../utils/logger');
const { retry, RETRY_CONFIGS } = require('../utils/retryUtils');
const { CHAT_SYSTEM_PROMPT } = require('../config/constants');

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
            logger.info('🤖 Generating conversational response', { 
                messageLength: message.length,
                historyLength: chatHistory.length 
            });

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
            logger.error('❌ Conversation generation failed:', error.message);
            logger.error('❌ Full error details:', error);
            throw error;
        }
    }

    /**
     * Extract news topics from conversation history
     * @param {Array} chatHistory - Full conversation history
     * @returns {Promise<Array>} Array of extracted topics
     */
    async extractTopics(chatHistory) {
        try {
            logger.info('🔍 Extracting topics from conversation', { 
                historyLength: chatHistory.length 
            });

            const extractionPrompt = `Analyze this conversation and extract 3-5 specific news topics that this person is interested in. Return only a JSON array of topic strings, nothing else.

Conversation:
${this.formatHistoryForExtraction(chatHistory)}

Topics:`;

            const messages = [
                { role: 'system', content: 'You are a topic extraction expert. Extract specific news topics from conversations.' },
                { role: 'user', content: extractionPrompt }
            ];

            const response = await this.callOpenAI(messages, 0.3, 200);
            
            // Parse JSON response
            const topics = this.parseTopicsResponse(response);
            
            logApiCall('openai', 'topicExtraction', { 
                topicsFound: topics.length,
                topics: topics
            });

            return topics;
        } catch (error) {
            logger.error('❌ Topic extraction failed:', error.message);
            return [];
        }
    }

    /**
     * Check if conversation has enough information to extract topics
     * @param {Array} chatHistory - Conversation history
     * @returns {boolean} True if conversation is complete
     */
    isConversationComplete(chatHistory) {
        // Simple heuristic: if we have 6+ messages and user has mentioned specific topics
        if (chatHistory.length < 6) return false;
        
        const userMessages = chatHistory.filter(msg => msg.role === 'user');
        const hasSpecificTopics = userMessages.some(msg => 
            msg.content.toLowerCase().includes('interested in') ||
            msg.content.toLowerCase().includes('care about') ||
            msg.content.toLowerCase().includes('follow') ||
            msg.content.toLowerCase().includes('news about')
        );
        
        return hasSpecificTopics;
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
            logger.error('❌ Direct OpenAI API call failed:', error.message);
            logger.error('❌ Full error object:', error);
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
        
        // Debug: Log the request data
        logger.info('🔍 OpenAI request data:', {
            model: this.model,
            messagesCount: messages.length,
            temperature: temperature,
            maxTokens: maxTokens,
            apiKeyLength: this.openaiApiKey ? this.openaiApiKey.length : 0
        });
        
        const requestData = {
            model: this.model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens
        };
        
        let data;
        try {
            console.log('🔍 Request object:', JSON.stringify(requestData, null, 2));
            
            data = JSON.stringify(requestData);
            
            console.log('🔍 JSON data length:', data.length);
            console.log('🔍 JSON data preview:', data.substring(0, 200) + '...');
        } catch (jsonError) {
            console.error('❌ JSON.stringify failed:', jsonError.message);
            throw new Error(`JSON serialization failed: ${jsonError.message}`);
        }

        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.openaiApiKey}`,
                'Content-Length': data.length
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

    /**
     * Parse topics from OpenAI response
     * @param {string} response - OpenAI response
     * @returns {Array} Parsed topics
     */
    parseTopicsResponse(response) {
        try {
            // Try to parse as JSON array
            const topics = JSON.parse(response);
            if (Array.isArray(topics)) {
                return topics.filter(topic => typeof topic === 'string' && topic.trim().length > 0);
            }
        } catch (e) {
            // If JSON parsing fails, try to extract topics from text
            const topicMatches = response.match(/"([^"]+)"/g);
            if (topicMatches) {
                return topicMatches.map(match => match.replace(/"/g, ''));
            }
        }
        
        return [];
    }
}

module.exports = ConversationService;
