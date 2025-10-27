const { logger, logApiCall } = require('../utils/logger-vercel');
const { CHAT_SYSTEM_PROMPT, CHAT_WELCOME_MESSAGE, TOPIC_EXTRACTION_PROMPT, SYSTEM_PROMPTS } = require('../config/constants');
const OpenAIClient = require('../utils/openaiClient');

class NewsDiscoveryService {
    constructor() {
        this.systemPrompt = CHAT_SYSTEM_PROMPT;
        this.openaiClient = new OpenAIClient();
    }








    /**
     * Map user interests to Guardian sections using AI
     * @param {string} user_interests - User's interests description
     * @param {Array<string>} sections - Array of available Guardian sections
     * @returns {Promise<string>} Pipe-separated string of relevant sections
     */
    async mapUserInterestsToSections(user_interests, sections) {
        const { SECTION_MAPPING_PROMPT } = require('../config/constants');

        const messages = [
            {
                role: 'system',
                content: SECTION_MAPPING_PROMPT
            },
            {
                role: 'user',
                content: `This is a short summary of the user's interests: ${user_interests}. The available sections are: ${sections}.`
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

