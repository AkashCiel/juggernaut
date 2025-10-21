const { logger, logApiCall } = require('../utils/logger');
const NewsDiscoveryService = require('./conversationService');
const { CHAT_WELCOME_MESSAGE } = require('../config/constants');

class ChatService {
    constructor() {
        this.welcomeMessage = CHAT_WELCOME_MESSAGE;
        this.newsDiscoveryService = new NewsDiscoveryService();
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
            
            // Get or create session
            if (!this.sessions.has(sessionId)) {
                this.sessions.set(sessionId, []);
            }
            
            const chatHistory = this.sessions.get(sessionId);
            
            // Generate AI response (without adding user message to history yet)
            const conversationResult = await this.newsDiscoveryService.generateResponse(message, chatHistory);
            
            // Add user message to history
            chatHistory.push({
                role: 'user',
                content: message,
                timestamp: new Date().toISOString()
            });
            
            // Add AI response to history
            chatHistory.push({
                role: 'assistant',
                content: conversationResult.response,
                timestamp: new Date().toISOString()
            });
            
            // Check if conversation is complete
            const isComplete = this.newsDiscoveryService.isConversationComplete(chatHistory);
            let userInterestsDescription = null;
            
            if (isComplete) {
                userInterestsDescription = await this.newsDiscoveryService.extractTopics(chatHistory);
            }
            
            logApiCall('chat', 'handleMessage', { 
                messageLength: message.length,
                responseLength: conversationResult.response.length,
                sessionId: sessionId,
                conversationComplete: isComplete,
                interestsDescriptionLength: userInterestsDescription?.length || 0
            });
            
            return {
                success: true,
                response: conversationResult.response,
                sessionId: sessionId,
                conversationComplete: isComplete,
                userInterestsDescription: userInterestsDescription,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            // Fallback to static response on error
            return {
                success: true,
                response: "I'm having trouble processing that right now. Could you tell me more about what topics you're interested in?",
                sessionId: sessionId,
                conversationComplete: false,
                userInterestsDescription: null,
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
