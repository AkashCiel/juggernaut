const { logger, logApiCall } = require('../utils/logger');
const ConversationService = require('./conversationService');
const NewsDiscoveryService = require('./newsDiscoveryService');
const UserService = require('./userService');
const GuardianSectionsCacheService = require('./guardianSectionsCacheService');
const { CHAT_WELCOME_MESSAGE } = require('../config/constants');
const { CONVERSATION_COMPLETE_MESSAGE } = require('../config/constants');

class OrchestratorService {
    constructor() {
        this.welcomeMessage = CHAT_WELCOME_MESSAGE;
        this.conversationService = new ConversationService();
        this.newsDiscoveryService = new NewsDiscoveryService();
        this.userService = new UserService();
        this.sectionsCacheService = new GuardianSectionsCacheService();
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
            
            // 1. Generate AI response using ConversationService
            const conversationResult = await this.conversationService.generateResponse(message, chatHistory);
            
            // 2. Check if conversation is complete from AI response
            const isComplete = this.conversationService.isConversationComplete(conversationResult.response);
            
            let cleanedResponse = conversationResult.response;
            let userInterestsDescription = null;
            
            if (isComplete) {
                // 3a. Clean the response for display
                userInterestsDescription = conversationResult.response.replace(/\[CONVERSATION_COMPLETE\]/g, '').trim();
                
                logger.info(`🔄 conversation complete, printing deets...`);
                logger.info(`🔄 User interests description: ${userInterestsDescription}`);
                // 3c. Register user if email is provided
                if (email && userInterestsDescription) {
                    await this.registerUser(email, userInterestsDescription);
                }

                return {
                    success: true,
                    response: CONVERSATION_COMPLETE_MESSAGE,
                    sessionId: sessionId,
                    conversationComplete: isComplete,
                    userInterestsDescription: userInterestsDescription,
                    timestamp: new Date().toISOString()
                };
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
            // Get Guardian sections
            const allSections = await this.sectionsCacheService.getSections();
            
            // Map interests to sections using NewsDiscoveryService
            const sections = await this.newsDiscoveryService.mapUserInterestsToSections(interestsDescription, allSections);
            const sectionArray = sections.split('|').filter(s => s.trim());
            
            // Register user with description and sections
            const user = await this.userService.registerUser(email, interestsDescription, sectionArray);
            
            logger.info(`✅ User registered via chat: ${email} (${user.userId})`);
            return { success: true, user: user };
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
}

module.exports = OrchestratorService;
