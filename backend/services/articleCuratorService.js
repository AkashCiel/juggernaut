const { logger } = require('../utils/logger-vercel');
const OpenAIClient = require('../utils/openaiClient');
const {
    RELEVANCE_SCORING_PROMPT,
    ARTICLE_CHUNK_SIZE,
    RELEVANCE_THRESHOLD,
    RETRY_DELAY_MS,
    MAX_RETRY_ATTEMPTS,
    OPENAI_TEMPERATURE
} = require('../config/constants');

class ArticleCuratorService {
    constructor() {
        this.openaiClient = new OpenAIClient();
    }

    /**
     * Score articles for relevance to user interests using OpenAI
     * @param {Array} articles - Array of article objects
     * @param {string} userInterests - User's interests description
     * @returns {Promise<Object>} Object with article IDs as keys and relevance scores as values
     */
    async scoreArticleRelevance(articles, userInterests) {
        // Format articles for prompt
        const articlesText = articles.map((article, index) => {
            const summary = article.summary || 'No summary available';
            const title = article.title || 'No title';
            const trailText = article.trailText || 'No trail text';
            return `${index + 1}. ID: ${article.id}\n   Title: ${title}\n   Trail: ${trailText}\n   Summary: ${summary}`;
        }).join('\n\n');

        const userMessage = `User's interests and motivations:\n${userInterests}\n\nArticles to score:\n\n${articlesText}`;

        const messages = [
            {
                role: 'system',
                content: RELEVANCE_SCORING_PROMPT
            },
            {
                role: 'user',
                content: userMessage
            }
        ];

        try {
            const response = await this.openaiClient.callOpenAI(messages, OPENAI_TEMPERATURE);
            
            // Parse JSON response
            let scores;
            try {
                // Try to extract JSON from response (in case there's extra text)
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    scores = JSON.parse(jsonMatch[0]);
                } else {
                    scores = JSON.parse(response);
                }
            } catch (parseError) {
                logger.error(`❌ Failed to parse relevance scores JSON: ${parseError.message}`);
                logger.error(`Response: ${response}`);
                // Return empty scores if parsing fails
                return {};
            }

            return scores;
        } catch (error) {
            logger.error(`❌ Failed to score article relevance: ${error.message}`);
            throw error;
        }
    }

    /**
     * Score articles in chunks with retry logic
     * @param {Array} articles - Array of article objects
     * @param {string} userInterests - User's interests description
     * @param {number} chunkIndex - Current chunk index (for logging)
     * @returns {Promise<Object>} Object with article IDs as keys and relevance scores as values
     */
    async scoreChunkWithRetry(articles, userInterests, chunkIndex) {
        for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
            try {
                logger.info(`📊 Processing chunk ${chunkIndex + 1}: ${articles.length} articles (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`);
                
                const scores = await this.scoreArticleRelevance(articles, userInterests);
                
                logger.info(`✅ Chunk ${chunkIndex + 1} processed successfully: scored ${Object.keys(scores).length} articles`);
                return scores;
            } catch (error) {
                // Check if it's a timeout error
                const isTimeoutError = error.message && (
                    error.message.toLowerCase().includes('timeout') ||
                    error.message.toLowerCase().includes('timed out')
                );
                
                if (isTimeoutError && attempt < MAX_RETRY_ATTEMPTS) {
                    logger.warn(`⚠️ Chunk ${chunkIndex + 1} failed with timeout error (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}): ${error.message}`);
                    logger.info(`⏳ Waiting ${RETRY_DELAY_MS / 1000} seconds before retry...`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                } else {
                    // Non-timeout error - skip chunk immediately
                    logger.error(`❌ Chunk ${chunkIndex + 1} failed with non-timeout error: ${error.message}`);
                    logger.warn(`⚠️ Skipping chunk ${chunkIndex + 1} and continuing to next chunk`);
                    return {};
                }
            }
        }
        
        return {};
    }

    /**
     * Curate news feed by scoring articles and filtering by relevance
     * @param {string} userInterests - User's interests description
     * @param {Object} preparedArticleData - Prepared article data from preLoadService
     * @returns {Promise<Array>} Curated list of articles sorted by relevance
     */
    async curateFeed(userInterests, preparedArticleData) {
        const { articles } = preparedArticleData;
        
        logger.info(`🎯 Starting curation for ${articles.length} articles`);
        logger.info(`📋 User interests: ${userInterests.substring(0, 100)}...`);

        // Split articles into chunks
        const chunks = [];
        for (let i = 0; i < articles.length; i += ARTICLE_CHUNK_SIZE) {
            chunks.push(articles.slice(i, i + ARTICLE_CHUNK_SIZE));
        }

        logger.info(`📦 Split into ${chunks.length} chunks of up to ${ARTICLE_CHUNK_SIZE} articles each`);

        // Score chunks sequentially
        const allScores = {};
        for (let index = 0; index < chunks.length; index++) {
            const chunk = chunks[index];
            try {
                const scores = await this.scoreChunkWithRetry(chunk, userInterests, index);
                Object.assign(allScores, scores);
            } catch (error) {
                // Non-timeout error occurred - log and continue to next chunk
                logger.error(`❌ Chunk ${index + 1} failed with error: ${error.message}`);
                logger.warn(`⚠️ Skipping chunk ${index + 1} and continuing to next chunk`);
                // Continue to next chunk (no scores added for this chunk)
            }
        }

        logger.info(`✅ Scored ${Object.keys(allScores).length} articles out of ${articles.length} total`);

        // Merge scores with articles
        const articlesWithScores = articles.map(article => {
            const score = allScores[article.id] || 0;
            return {
                ...article,
                relevanceScore: score
            };
        });

        // Filter by threshold and sort by relevance
        const curatedArticles = articlesWithScores
            .filter(article => article.relevanceScore >= RELEVANCE_THRESHOLD)
            .sort((a, b) => b.relevanceScore - a.relevanceScore);

        logger.info(`✅ Curated ${curatedArticles.length} articles above relevance threshold (${RELEVANCE_THRESHOLD})`);
        
        // Log score distribution
        const scoreRanges = {
            '86-100': 0,
            '71-85': 0,
            '51-70': 0,
            '31-50': 0,
            '0-30': 0
        };

        curatedArticles.forEach(article => {
            const score = article.relevanceScore;
            if (score >= 86) scoreRanges['86-100']++;
            else if (score >= 71) scoreRanges['71-85']++;
            else if (score >= 51) scoreRanges['51-70']++;
            else if (score >= 31) scoreRanges['31-50']++;
            else scoreRanges['0-30']++;
        });

        logger.info(`📊 Score distribution:`, scoreRanges);

        return curatedArticles;
    }
}

module.exports = ArticleCuratorService;

