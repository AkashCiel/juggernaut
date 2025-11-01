const { logger, logApiCall } = require('../utils/logger-vercel');
const ConversationService = require('./conversationService');
const NewsDiscoveryService = require('./newsDiscoveryService');
const PreLoadService = require('./preLoadService');
const { CHAT_WELCOME_MESSAGE } = require('../config/constants');
const { CONVERSATION_COMPLETE_MESSAGE } = require('../config/constants');

class OrchestratorService {
    constructor() {
        this.welcomeMessage = CHAT_WELCOME_MESSAGE;
        this.conversationService = new ConversationService();
        this.newsDiscoveryService = new NewsDiscoveryService();
        this.preLoadService = new PreLoadService();
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
                
                // 3b. Map user interests to sections and prepare data for curation
                let selectedSections = null;
                let preparedArticleData = null;
                
                if (email && userInterestsDescription) {
                    logger.info('🗺️ Mapping user interests to sections...');
                    
                    // Get section summaries to derive section list
                    const sectionSummaries = this.preLoadService.getSectionSummaries();
                    const sections = sectionSummaries ? Object.keys(sectionSummaries.sections) : null;
                    
                    // Map interests to sections
                    selectedSections = await this.newsDiscoveryService.mapUserInterestsToSections(userInterestsDescription, sections);
                    logger.info(`✅ Selected sections: ${selectedSections}`);
                    
                    // Prepare article data for curation (filters to selected sections, applies 1000 limit)
                    logger.info('🔧 Preparing article data for curation...');
                    preparedArticleData = this.preLoadService.prepare_data_for_curation(selectedSections);
                    logger.info(`✅ Prepared ${preparedArticleData.articleCount} articles for curation`);
                    
                    // Log section breakdown
                    preparedArticleData.sectionsData.forEach(sectionData => {
                        logger.info(`📊 Section '${sectionData.section}': ${sectionData.selectedCount} articles selected (from ${sectionData.articleCount} available)`);
                    });
                }

                return {
                    success: true,
                    response: CONVERSATION_COMPLETE_MESSAGE,
                    sessionId: sessionId,
                    conversationComplete: isComplete,
                    userInterestsDescription: userInterestsDescription,
                    selectedSections: selectedSections,
                    preparedArticleData: preparedArticleData,
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
            
            // Pre-fetch section summaries and article libraries asynchronously (don't wait for it)
            this.preLoadService.fetchSectionSummaries()
                .catch(error => {
                    logger.warn(`⚠️ Failed to pre-fetch section summaries: ${error.message}`);
                });
            
            this.preLoadService.fetchAllArticleLibraries()
                .catch(error => {
                    logger.warn(`⚠️ Failed to pre-fetch article libraries: ${error.message}`);
                });
            
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
     * Extract topics from interests description
     * @param {string} description - User's interests description
     * @returns {Array<string>} Array of topic strings
     */
}

module.exports = OrchestratorService;
