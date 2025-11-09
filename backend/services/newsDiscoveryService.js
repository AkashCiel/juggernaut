const { logger, logApiCall } = require('../utils/logger-vercel');
const { CHAT_SYSTEM_PROMPT } = require('../config/constants');
const OpenAIClient = require('../utils/openaiClient');
const PreLoadService = require('./preLoadService');

class NewsDiscoveryService {
    constructor() {
        this.systemPrompt = CHAT_SYSTEM_PROMPT;
        this.openaiClient = new OpenAIClient();
        this.preLoadService = new PreLoadService();
    }

    /**
     * Map user interests to Guardian sections using AI
     * @param {string} user_interests - User's interests description
     * @param {Array<string>} sections - Array of available Guardian sections (optional, will be derived from summaries if not provided)
     * @returns {Promise<string>} Pipe-separated string of relevant sections
     */
    async mapUserInterestsToSections(user_interests, sections = null) {
        const { SECTION_MAPPING_PROMPT } = require('../config/constants');

        let sectionSummaries = null;

        // Only fetch section summaries if sections are not provided (sections will be derived from summaries)
        if (!sections) {
        // Get section summaries from preLoadService
            sectionSummaries = this.preLoadService.getSectionSummaries();

        // If summaries not loaded yet, wait for them
        if (!sectionSummaries) {
            logger.info('⏳ Waiting for section summaries to load...');
                sectionSummaries = await this.preLoadService.fetchSectionSummaries();
        }

        // Derive sections from summaries if not provided
            if (sectionSummaries && sectionSummaries.sections) {
            sections = Object.keys(sectionSummaries.sections);
            }
        } else {
            // Sections are provided, but try to get summaries for context (don't wait/fetch if not available)
            sectionSummaries = this.preLoadService.getSectionSummaries();
        }

        // Build user message with section summaries if available
        let userMessage = `This is a short summary of the user's interests: ${user_interests}.`;
        
        if (sectionSummaries && sectionSummaries.sections) {
            // Format section summaries for the prompt
            const summariesText = Object.entries(sectionSummaries.sections)
                .map(([sectionName, sectionData]) => {
                    const summary = sectionData.summary || 'No summary available';
                    return `${sectionName}:\n${summary}`;
                })
                .join('\n\n');
            
            userMessage += `\n\nHere are detailed summaries of what each section covers:\n\n${summariesText}`;
        }

        // Format sections list for prompt
        const sectionsList = sections && sections.length > 0 ? sections.join('|') : 'news|world';

        const messages = [
            {
                role: 'system',
                content: SECTION_MAPPING_PROMPT.replace('{sections}', sectionsList)
            },
            {
                role: 'user',
                content: userMessage
            }
        ];

        try {
            const result = await this.openaiClient.callOpenAI(messages);
            return result.trim();
        } catch (error) {
            logger.error(`❌ Failed to map topics to sections: ${error.message}`);
            // Fallback to generic sections
            return 'news|world';
        }
    }

}

module.exports = NewsDiscoveryService;

