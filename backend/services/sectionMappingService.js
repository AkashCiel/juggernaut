const { logger } = require('../utils/logger');
const { SECTION_MAPPING_PROMPT } = require('../config/constants');
const ConversationService = require('./conversationService');
const GuardianSectionsCacheService = require('./guardianSectionsCacheService');

/**
 * Service for AI-powered mapping of topics to Guardian sections
 * Uses cached Guardian sections and AI to intelligently map topics
 */
class SectionMappingService {
    constructor() {
        this.conversationService = new ConversationService();
        this.sectionsCacheService = new GuardianSectionsCacheService();
    }

    /**
     * Map topics to relevant Guardian sections using AI
     * @param {Array} topics - Array of topic strings
     * @returns {Promise<string>} Pipe-separated section names
     */
    async mapTopicsToSections(topics) {
        if (!topics || topics.length === 0) {
            logger.warn('⚠️ No topics provided for section mapping');
            return 'technology|business|world'; // Default fallback
        }

        logger.info(`🔍 Mapping topics to Guardian sections: ${topics.join(', ')}`);
        
        try {
            // Get current Guardian sections from cache
            const sections = await this.sectionsCacheService.getSections();
            logger.info(`📋 Using ${sections.length} Guardian sections for mapping`);
            
            // Build AI prompt
            const prompt = this.buildMappingPrompt(topics, sections);
            
            // Use AI to map topics to sections
            const result = await this.conversationService.generateResponse(prompt, []);
            const mappedSections = result.response.trim();
            
            // Validate the response
            const validatedSections = this.validateMappedSections(mappedSections, sections);
            
            logger.info(`✅ Mapped topics to sections: ${validatedSections}`);
            return validatedSections;
            
        } catch (error) {
            logger.error('❌ Section mapping failed:', error.message);
            
            // Return fallback sections based on common topic patterns
            return this.getFallbackSections(topics);
        }
    }

    /**
     * Build the AI prompt for section mapping
     * @param {Array} topics - Topics to map
     * @param {Array} sections - Available Guardian sections
     * @returns {string} Formatted prompt
     */
    buildMappingPrompt(topics, sections) {
        return SECTION_MAPPING_PROMPT
            .replace('{topics}', topics.join(', '))
            .replace('{sections}', sections.join(', '));
    }

    /**
     * Validate and filter mapped sections against available sections
     * @param {string} mappedSections - AI response
     * @param {Array} availableSections - Valid Guardian sections
     * @returns {string} Validated pipe-separated sections
     */
    validateMappedSections(mappedSections, availableSections) {
        const sectionsSet = new Set(availableSections);
        const mappedArray = mappedSections.split('|').map(s => s.trim());
        
        // Filter to only include valid sections
        const validSections = mappedArray.filter(section => sectionsSet.has(section));
        
        if (validSections.length === 0) {
            logger.warn('⚠️ No valid sections found in AI response, using fallback');
            return 'technology|business|world';
        }
        
        return validSections.join('|');
    }

    /**
     * Get fallback sections based on topic patterns
     * @param {Array} topics - Topics to analyze
     * @returns {string} Fallback sections
     */
    getFallbackSections(topics) {
        const topicString = topics.join(' ').toLowerCase();
        
        // Simple pattern matching for fallback
        if (topicString.includes('ai') || topicString.includes('tech') || topicString.includes('software')) {
            return 'technology|business|science';
        }
        
        if (topicString.includes('climate') || topicString.includes('environment') || topicString.includes('energy')) {
            return 'environment|science|world|business';
        }
        
        if (topicString.includes('health') || topicString.includes('medical') || topicString.includes('medicine')) {
            return 'society|science|world';
        }
        
        if (topicString.includes('business') || topicString.includes('economy') || topicString.includes('finance')) {
            return 'business|money|world';
        }
        
        if (topicString.includes('politics') || topicString.includes('government') || topicString.includes('policy')) {
            return 'politics|world|us-news|uk-news';
        }
        
        // Default fallback
        return 'technology|business|world|science';
    }

    /**
     * Get service status and cache information
     * @returns {Object} Service status
     */
    async getStatus() {
        const cacheStatus = this.sectionsCacheService.getCacheStatus();
        
        return {
            service: 'SectionMappingService',
            cacheStatus,
            lastChecked: new Date().toISOString()
        };
    }
}

module.exports = SectionMappingService;
