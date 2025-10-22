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
     * @param {string} email - User's email address
     * @returns {Object} Response object
     */
    async handleMessage(message, sessionId, email = null) {
        try {
            
            // Get or create session
            if (!this.sessions.has(sessionId)) {
                this.sessions.set(sessionId, []);
            }
            
            const chatHistory = this.sessions.get(sessionId);
            
            // 1. Generate AI response
            const conversationResult = await this.newsDiscoveryService.generateResponse(message, chatHistory);
            
            // 2. Check if conversation is complete from AI response
            const isComplete = this.newsDiscoveryService.isConversationComplete(conversationResult.response);
            
            let cleanedResponse = conversationResult.response;
            let userInterestsDescription = null;
            
            if (isComplete) {
                // 3a. Clean the response for display
                cleanedResponse = conversationResult.response.replace(/\[CONVERSATION_COMPLETE\]/g, '').trim();
                
                // 3b. Extract topics for registration
                userInterestsDescription = await this.newsDiscoveryService.extractTopics(chatHistory);
                
                // 3c. Register user if email is provided
                if (email && userInterestsDescription) {
                    await this.registerUser(email, userInterestsDescription);
                }
            } else {
                // 4. If not complete, add messages to history and continue
                chatHistory.push({
                    role: 'user',
                    content: message,
                    timestamp: new Date().toISOString()
                });
                
                chatHistory.push({
                    role: 'assistant',
                    content: cleanedResponse,
                    timestamp: new Date().toISOString()
                });
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
                response: cleanedResponse,
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

    /**
     * Register user with their interests description
     * @param {string} email - User's email address
     * @param {string} interestsDescription - User's interests description
     * @returns {Promise<Object>} Registration result
     */
    async registerUser(email, interestsDescription) {
        try {
            // Convert interests description to topics array for the existing API
            // For now, we'll use a simple approach - extract key topics from the description
            const topics = this.extractTopicsFromDescription(interestsDescription);
            
            // Call the existing registration endpoint
            // const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8000'}/api/reports/register-user`, {
            const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8000'}/api/register-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    topics: topics
                })
            });

            const result = await response.json();
            
            if (result.success) {
                logger.info(`✅ User registered via chat: ${email}`);
                return { success: true, user: result.data };
            } else {
                logger.error(`❌ User registration failed: ${result.error}`);
                return { success: false, error: result.error };
            }
        } catch (error) {
            logger.error(`❌ User registration error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Extract topics from interests description
     * @param {string} description - User's interests description
     * @returns {Array<string>} Array of topic strings
     */
    extractTopicsFromDescription(description) {
        // Simple keyword extraction - in a real implementation, this could use AI
        const commonTopics = [
            'artificial intelligence', 'machine learning', 'technology', 'science',
            'business', 'politics', 'health', 'environment', 'climate change',
            'space', 'medicine', 'economics', 'finance', 'cryptocurrency',
            'blockchain', 'quantum computing', 'robotics', 'automation'
        ];
        
        const lowerDescription = description.toLowerCase();
        const foundTopics = commonTopics.filter(topic => 
            lowerDescription.includes(topic.toLowerCase())
        );
        
        // If no topics found, use default topics
        return foundTopics.length > 0 ? foundTopics : ['artificial intelligence', 'technology'];
    }
}

module.exports = ChatService;
