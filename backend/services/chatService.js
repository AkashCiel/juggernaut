const { logger, logApiCall } = require('../utils/logger');
const ConversationService = require('./conversationService');

class ChatService {
    constructor() {
        this.welcomeMessage = "Hello! I'm here to help you discover news you care about. What topics interest you?";
        this.conversationService = new ConversationService();
        this.sessions = new Map(); // Store chat history per session
    }

    /**
     * Handle incoming chat message with conversation logic
     * @param {string} message - User's message
     * @param {string} sessionId - Chat session ID
     * @returns {Object} Response object
     */
    async handleMessage(message, sessionId) {
        try {
            logger.info('💬 Processing chat message', { 
                messageLength: message.length,
                sessionId: sessionId 
            });
            
            // Get or create session
            if (!this.sessions.has(sessionId)) {
                this.sessions.set(sessionId, []);
            }
            
            const chatHistory = this.sessions.get(sessionId);
            
            // Add user message to history
            chatHistory.push({
                role: 'user',
                content: message,
                timestamp: new Date().toISOString()
            });
            
            // Generate AI response
            const conversationResult = await this.conversationService.generateResponse(message, chatHistory);
            
            // Add AI response to history
            chatHistory.push({
                role: 'assistant',
                content: conversationResult.response,
                timestamp: new Date().toISOString()
            });
            
            // Check if conversation is complete
            const isComplete = this.conversationService.isConversationComplete(chatHistory);
            let extractedTopics = null;
            
            if (isComplete) {
                extractedTopics = await this.conversationService.extractTopics(chatHistory);
                logger.info('🎯 Conversation complete, topics extracted', { 
                    topics: extractedTopics,
                    sessionId: sessionId 
                });
            }
            
            logApiCall('chat', 'handleMessage', { 
                messageLength: message.length,
                responseLength: conversationResult.response.length,
                sessionId: sessionId,
                conversationComplete: isComplete,
                topicsExtracted: extractedTopics?.length || 0
            });
            
            return {
                success: true,
                response: conversationResult.response,
                sessionId: sessionId,
                conversationComplete: isComplete,
                extractedTopics: extractedTopics,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('❌ Chat message processing failed:', error.message);
            // Fallback to static response on error
            return {
                success: true,
                response: "I'm having trouble processing that right now. Could you tell me more about what topics you're interested in?",
                sessionId: sessionId,
                conversationComplete: false,
                extractedTopics: null,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Start a new chat session
     * @returns {Object} Session initialization result
     */
    async startSession() {
        try {
            logger.info('🚀 Starting new chat session');
            
            const sessionId = this.generateSessionId();
            
            // Initialize empty session
            this.sessions.set(sessionId, []);
            
            logApiCall('chat', 'startSession', { sessionId: sessionId });
            
            return {
                success: true,
                sessionId: sessionId,
                welcomeMessage: this.welcomeMessage,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('❌ Chat session start failed:', error.message);
            throw error;
        }
    }

    /**
     * Generate a simple session ID
     * @returns {string} Session ID
     */
    generateSessionId() {
        return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = ChatService;
