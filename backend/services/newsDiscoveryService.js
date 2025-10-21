const { logger, logApiCall } = require('../utils/logger');
const { retry, RETRY_CONFIGS } = require('../utils/retryUtils');
const { CHAT_SYSTEM_PROMPT, CHAT_WELCOME_MESSAGE, TOPIC_EXTRACTION_PROMPT, SYSTEM_PROMPTS } = require('../config/constants');

class NewsDiscoveryService {
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
     * Extract user interests description from conversation history
     * @param {Array} chatHistory - Full conversation history
     * @returns {Promise<string>} 2-5 sentence description of user interests
     */
    async extractTopics(chatHistory) {
        try {
            const extractionPrompt = `${TOPIC_EXTRACTION_PROMPT}

Conversation:
${this.formatHistoryForExtraction(chatHistory)}

Description:`;

            const messages = [
                { role: 'system', content: SYSTEM_PROMPTS.TOPIC_EXTRACTION },
                { role: 'user', content: extractionPrompt }
            ];

            const response = await this.callOpenAI(messages, 0.3, 300);
            
            // Return the description directly (no JSON parsing needed)
            const description = response.trim();
            
            logApiCall('openai', 'topicExtraction', { 
                descriptionLength: description.length,
                description: description.substring(0, 100) + '...'
            });

            return description;
        } catch (error) {
            return 'Unable to extract user interests from conversation.';
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


    /**
     * Map topics to Guardian sections using AI
     * This is a dedicated method separate from chat functionality
     * @param {Array<string>} topics - Array of news topics
     * @param {Array<string>} sections - Array of available Guardian sections
     * @returns {Promise<string>} Pipe-separated string of relevant sections
     */
    async mapTopicsToSections(topics, sections) {
        const { SECTION_MAPPING_PROMPT } = require('../config/constants');
        
        const prompt = SECTION_MAPPING_PROMPT
            .replace('{topics}', topics.join(', '))
            .replace('{sections}', sections.join(', '));

        const messages = [
            {
                role: 'system',
                content: SYSTEM_PROMPTS.SECTION_MAPPING
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        try {
            const result = await this.callOpenAI(messages);
            return result.trim();
        } catch (error) {
            logger.error(`❌ Failed to map topics to sections: ${error.message}`);
            // Fallback to generic sections
            return 'news|world';
        }
    }

    /**
     * Filter articles for relevance to a specific topic using AI
     * @param {Array} articles - Array of article objects
     * @param {string} topic - Topic to filter for
     * @returns {Promise<Array>} Array of relevant articles
     */
    async filterRelevantArticles(articles, topic) {
        if (!articles || articles.length === 0) {
            return [];
        }

        logger.info(`🔍 Filtering ${articles.length} articles for relevance to "${topic}"`);

        // Create a prompt for AI to filter articles
        const articleSummaries = articles.map((article, index) => ({
            index: index,
            title: article.title,
            summary: article.summarySource || '',
            section: article.section,
            publishedAt: article.publishedAt
        }));

        const prompt = `Given these news articles, return ONLY the indices (numbers) of articles that are relevant to "${topic}".

Articles:
${articleSummaries.map(article => 
    `${article.index}. ${article.title} (${article.section}) - ${article.summary.substring(0, 100)}...`
).join('\n')}

Return ONLY a comma-separated list of relevant article indices (e.g., "0,3,7,12"). No explanations.`;

        const messages = [
            {
                role: 'system',
                content: SYSTEM_PROMPTS.ARTICLE_RELEVANCE
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        try {
            const result = await this.callOpenAI(messages);
            const relevantIndices = result.trim().split(',').map(idx => parseInt(idx.trim())).filter(idx => !isNaN(idx));
            
            const relevantArticles = relevantIndices
                .filter(idx => idx >= 0 && idx < articles.length)
                .map(idx => articles[idx]);

            logger.info(`✅ Filtered to ${relevantArticles.length} relevant articles out of ${articles.length} total`);
            return relevantArticles;

        } catch (error) {
            logger.error(`❌ Failed to filter articles for relevance: ${error.message}`);
            // Fallback: return first 10 articles if filtering fails
            return articles.slice(0, 10);
        }
    }
}

module.exports = NewsDiscoveryService;
