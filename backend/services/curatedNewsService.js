const { logger } = require('../utils/logger-vercel');
const OpenAIClient = require('../utils/openaiClient');
const { retry, RETRY_CONFIGS } = require('../utils/retryUtils');
const { chunkArray, processChunksSequentially } = require('../utils/chunkingUtils');
const { ARTICLE_CURATION_PROMPT, SYSTEM_PROMPTS } = require('../config/constants');
const { MAX_ARTICLES_PER_LLM_CALL, FALLBACK_ARTICLE_COUNT, SUMMARY_TRUNCATION_LENGTH } = require('../config/limits');

/**
 * LLM-based article curation service for personalized news feeds
 */
class CuratedNewsService {
    constructor() {
        this.openaiClient = new OpenAIClient();
    }

    /**
     * Curate articles for a specific user based on their interests
     * Makes multiple API calls with max articles per call limit
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
            const articleMetadata = this.buildArticleMetadata(articles);
            
            // Split articles into chunks
            const chunks = chunkArray(articleMetadata, MAX_ARTICLES_PER_LLM_CALL);
            logger.info(`📊 Processing ${chunks.length} chunks of articles (max ${MAX_ARTICLES_PER_LLM_CALL} per chunk)`);

            // Process chunks sequentially
            const chunkResults = await processChunksSequentially(chunks, 
                (chunk, chunkNumber) => this.processChunk(chunk, user, chunkNumber),
                {
                    onChunkStart: (chunk, chunkNumber, totalChunks) => {
                        logger.info(`🤖 Processing chunk ${chunkNumber}/${totalChunks} with ${chunk.length} articles`);
                    },
                    onChunkComplete: (result, chunkNumber, totalChunks) => {
                        logger.info(`✅ Chunk ${chunkNumber}: Curated ${result.length} articles`);
                    },
                    onChunkError: (error, chunk, chunkNumber, totalChunks) => {
                        logger.error(`❌ Failed to curate chunk ${chunkNumber} after retries: ${error.message}`);
                        // Fallback: return first 5 articles from this chunk
                        return chunk.slice(0, 5).map(article => article.id);
                    }
                }
            );
            
            // Flatten results from all chunks
            const allCuratedIds = chunkResults.flat();
            logger.info(`✅ Total curated ${allCuratedIds.length} articles for user: ${user.email}`);
            return allCuratedIds;

        } catch (error) {
            logger.error(`❌ Failed to curate articles for user ${user.email}: ${error.message}`);
            // Fallback: return first 10 articles
            return articles.slice(0, FALLBACK_ARTICLE_COUNT).map((article, index) => article.id || `article_${index}`);
        }
    }

    /**
     * Build article metadata for LLM processing
     * @param {Array} articles - Array of article objects
     * @returns {Array} Array of article metadata objects
     */
    buildArticleMetadata(articles) {
        return articles.map((article, index) => ({
            id: article.id || `article_${index}`,
            title: article.title || 'Untitled',
            summary: article.summarySource || article.summary || 'No summary available',
            section: article.section || 'general',
            publishedAt: article.publishedAt || 'Unknown date'
        }));
    }

    /**
     * Process a single chunk of articles
     * @param {Array} chunk - Chunk of article metadata
     * @param {Object} user - User object
     * @param {number} chunkNumber - Chunk number for logging
     * @returns {Promise<Array>} Array of curated article IDs
     */
    async processChunk(chunk, user, chunkNumber) {
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

        // Call OpenAI with centralized retry logic
        const response = await retry(
            () => this.openaiClient.callOpenAI(messages),
            RETRY_CONFIGS.openai
        );
        
        // Parse response to get article IDs
        return this.parseCuratedResponse(response, chunk);
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
