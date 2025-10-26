const { logger } = require('../utils/logger-vercel');
const OpenAIClient = require('../utils/openaiClient');
const { ARTICLE_CURATION_PROMPT, SYSTEM_PROMPTS } = require('../config/constants');
const { MAX_ARTICLES_PER_LLM_CALL, FALLBACK_ARTICLE_COUNT, SUMMARY_TRUNCATION_LENGTH, RETRY_WAIT_TIME } = require('../config/limits');

/**
 * LLM-based article curation service for personalized news feeds
 */
class CuratedNewsService {
    constructor() {
        this.openaiClient = new OpenAIClient();
    }

    /**
     * Curate articles for a specific user based on their interests
     * Makes multiple API calls with max 200 articles per call
     * @param {Object} user - User object with interests and sections
     * @param {Array} articles - Array of article objects
     * @returns {Promise<Array>} Array of curated article IDs in order of relevance
     */
    async curateArticlesForUser(user, articles) {
        try {
            if (!articles || articles.length === 0) {
                logger.warn(`⚠️ No articles available for user ${user.email}`);
                return [];
            }

            logger.info(`🔍 Curating ${articles.length} articles for user: ${user.email}`);

            // Build article metadata for LLM
            const articleMetadata = articles.map((article, index) => {
                return {
                    id: article.id || `article_${index}`,
                    title: article.title || 'Untitled',
                    summary: article.summarySource || article.summary || 'No summary available',
                    section: article.section || 'general',
                    publishedAt: article.publishedAt || 'Unknown date'
                };
            });

            // Split articles into chunks of max 100
            const MAX_ARTICLES_PER_CALL = MAX_ARTICLES_PER_LLM_CALL;
            const chunks = [];
            for (let i = 0; i < articleMetadata.length; i += MAX_ARTICLES_PER_CALL) {
                chunks.push(articleMetadata.slice(i, i + MAX_ARTICLES_PER_CALL));
            }

            logger.info(`📊 Processing ${chunks.length} chunks of articles (max ${MAX_ARTICLES_PER_CALL} per chunk)`);

            const allCuratedIds = [];

            // Process each chunk
            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                const chunk = chunks[chunkIndex];
                logger.info(`🤖 Processing chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} articles`);

                // Format articles for LLM prompt
                const formattedArticles = chunk.map(article => 
                    `[ID: ${article.id}] ${article.title} (${article.section}) - ${article.summary.substring(0, SUMMARY_TRUNCATION_LENGTH)}...`
                ).join('\n');

                // Build LLM prompt
                const prompt = ARTICLE_CURATION_PROMPT
                    .replace('{userInterests}', user.description || 'No specific interests')
                    .replace('{articles}', formattedArticles);

                const messages = [
                    {
                        role: 'system',
                        content: SYSTEM_PROMPTS.ARTICLE_CURATION
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ];

                try {
                    // Call OpenAI for this chunk with retry logic
                    const response = await this.callOpenAIWithRetry(messages, chunkIndex + 1);
                    
                    // Parse response to get article IDs
                    const chunkCuratedIds = this.parseCuratedResponse(response, chunk);
                    allCuratedIds.push(...chunkCuratedIds);
                    
                    logger.info(`✅ Chunk ${chunkIndex + 1}: Curated ${chunkCuratedIds.length} articles`);
                } catch (error) {
                    logger.error(`❌ Failed to curate chunk ${chunkIndex + 1} after retries: ${error.message}`);
                    // Fallback: add first 5 articles from this chunk
                    const fallbackIds = chunk.slice(0, 5).map(article => article.id);
                    allCuratedIds.push(...fallbackIds);
                }
            }
            
            logger.info(`✅ Total curated ${allCuratedIds.length} articles for user: ${user.email}`);
            return allCuratedIds;

        } catch (error) {
            logger.error(`❌ Failed to curate articles for user ${user.email}: ${error.message}`);
            // Fallback: return first 10 articles
            return articles.slice(0, FALLBACK_ARTICLE_COUNT).map((article, index) => article.id || `article_${index}`);
        }
    }

    /**
     * Call OpenAI with retry logic for rate limit handling
     * @param {Array} messages - Messages for OpenAI API
     * @param {number} chunkNumber - Chunk number for logging
     * @returns {Promise<string>} OpenAI response
     */
    async callOpenAIWithRetry(messages, chunkNumber) {
        const maxRetries = 5;
        const waitTime = RETRY_WAIT_TIME; // 15 seconds
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info(`🤖 Attempt ${attempt}/${maxRetries} for chunk ${chunkNumber}`);
                const response = await this.openaiClient.callOpenAI(messages);
                return response;
            } catch (error) {
                lastError = error;
                
                // Check if it's a rate limit error
                if (error.message && error.message.toLowerCase().includes('rate limit')) {
                    logger.warn(`⏳ Rate limit hit for chunk ${chunkNumber}. Waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
                    await this.sleep(waitTime);
                    continue;
                }
                
                // For non-rate-limit errors, don't retry
                if (attempt === 1) {
                    logger.error(`❌ Non-rate-limit error for chunk ${chunkNumber}: ${error.message}`);
                    throw error;
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Parse LLM response to extract article IDs
     * @param {string} response - LLM response
     * @param {Array} articleMetadata - Array of article metadata
     * @returns {Array} Array of article IDs in order of relevance
     */
    parseCuratedResponse(response, articleMetadata) {
        try {
            // Extract comma-separated article IDs
            const articleIds = response.trim().split(',').map(id => id.trim());
            
            // Validate that all IDs exist in the metadata
            const validIds = articleIds.filter(id => 
                articleMetadata.some(article => article.id === id)
            );
            
            logger.info(`📋 Parsed ${validIds.length} valid article IDs from LLM response`);
            return validIds;
            
        } catch (error) {
            logger.error(`❌ Failed to parse curated response: ${error.message}`);
            // Fallback: return first 5 articles
            return articleMetadata.slice(0, 5).map(article => article.id);
        }
    }

    /**
     * Get detailed article information for curated articles
     * @param {Array} curatedIds - Array of curated article IDs
     * @param {Array} allArticles - Array of all available articles
     * @returns {Array} Array of detailed article objects
     */
    getDetailedCuratedArticles(curatedIds, allArticles) {
        const detailedArticles = [];
        
        curatedIds.forEach(id => {
            const article = allArticles.find(a => a.id === id);
            if (article) {
                detailedArticles.push({
                    id: article.id,
                    title: article.title,
                    summary: article.summarySource || article.summary,
                    section: article.section,
                    publishedAt: article.publishedAt,
                    url: article.shortUrl || article.url,
                    author: article.byline
                });
            }
        });
        
        return detailedArticles;
    }
}

module.exports = CuratedNewsService;
