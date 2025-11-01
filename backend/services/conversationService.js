const { logger, logApiCall } = require('../utils/logger-vercel');
const { CHAT_SYSTEM_PROMPT, CHAT_WELCOME_MESSAGE} = require('../config/constants');
const OpenAIClient = require('../utils/openaiClient');

class ConversationService {
    constructor() {
        this.systemPrompt = CHAT_SYSTEM_PROMPT;
        this.openaiClient = new OpenAIClient();
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
            const response = await this.openaiClient.callOpenAI(messages);
            
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
