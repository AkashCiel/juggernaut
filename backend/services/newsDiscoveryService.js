const { logger, logApiCall } = require('../utils/logger-vercel');
const { CHAT_SYSTEM_PROMPT, CHAT_WELCOME_MESSAGE, TOPIC_EXTRACTION_PROMPT, SYSTEM_PROMPTS } = require('../config/constants');
const OpenAIClient = require('../utils/openaiClient');
const { FALLBACK_ARTICLE_COUNT, ARTICLE_PREVIEW_LENGTH } = require('../config/limits');

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
    `${article.index}. ${article.title} (${article.section}) - ${article.summary.substring(0, ARTICLE_PREVIEW_LENGTH)}...`
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
            const result = await this.openaiClient.callOpenAI(messages);
            const relevantIndices = result.trim().split(',').map(idx => parseInt(idx.trim())).filter(idx => !isNaN(idx));
            
            const relevantArticles = relevantIndices
                .filter(idx => idx >= 0 && idx < articles.length)
                .map(idx => articles[idx]);

            logger.info(`✅ Filtered to ${relevantArticles.length} relevant articles out of ${articles.length} total`);
            return relevantArticles;

        } catch (error) {
            logger.error(`❌ Failed to filter articles for relevance: ${error.message}`);
            // Fallback: return first 10 articles if filtering fails
            return articles.slice(0, FALLBACK_ARTICLE_COUNT);
        }
    }
}

module.exports = NewsDiscoveryService;