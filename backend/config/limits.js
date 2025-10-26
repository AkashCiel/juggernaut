/**
 * Application Limits and Constraints Configuration
 * 
 * These limits control various aspects of data processing, API calls, and user input
 * validation throughout the application.
 * 
 * @author AI News Agent Team
 * @version 1.0.0
 */

module.exports = {
    /**
     * Guardian API Maximum Page Size (articles per request)
     * 
     * Used in: GuardianService.fetchArticlesForTopic(), fetchArticlesForSection()
     * 
     * Guardian API has a hard limit of 200 articles per request. This constant enforces
     * that limit and is used in Math.min() calculations to prevent API errors. Guardian
     * API will return an error if you request more than 200 articles in a single call.
     */
    GUARDIAN_PAGE_SIZE_MAX: 200,

    /**
     * Guardian API Default Page Size (articles per request)
     * 
     * Used in: GuardianService.fetchArticlesForTopic(), fetchArticlesForSection()
     * 
     * Default number of articles to request from Guardian API when no specific page size
     * is provided. Set to maximum to get the most articles per API call and minimize
     * the number of requests needed.
     */
    GUARDIAN_PAGE_SIZE_DEFAULT: 200,

    /**
     * Maximum Articles Per LLM Call (articles per chunk)
     * 
     * Used in: CuratedNewsService.curateArticlesForUser()
     * 
     * When sending articles to OpenAI for curation, we split large article lists into chunks.
     * This limit prevents overwhelming the LLM with too many articles at once, which could
     * cause timeouts, token limit errors, or poor quality responses.
     */
    MAX_ARTICLES_PER_LLM_CALL: 100,

    /**
     * Fallback Article Count (articles)
     * 
     * Used in: CuratedNewsService.curateArticlesForUser(), NewsDiscoveryService.filterRelevantArticles()
     * 
     * When AI-powered article filtering or curation fails (API errors, parsing errors, etc.),
     * the application falls back to returning the first N articles instead of failing completely.
     * This ensures users always get some content even when AI services are unavailable.
     */
    FALLBACK_ARTICLE_COUNT: 10,

    /**
     * Article Summary Truncation Length (characters)
     * 
     * Used in: CuratedNewsService.curateArticlesForUser()
     * 
     * When formatting articles for LLM prompts, we truncate article summaries to this length
     * to fit within token limits while preserving the most important information. This is
     * used in the prompt: "article.summary.substring(0, 150)..."
     */
    SUMMARY_TRUNCATION_LENGTH: 150,

    /**
     * Email Summary Length (characters)
     * 
     * Used in: EmailCompositionService.formatArticleForEmail()
     * 
     * When composing email content, article summaries are truncated to this length to keep
     * emails concise and readable. This prevents emails from becoming too long while ensuring
     * key information is preserved for mobile-friendly viewing.
     */
    EMAIL_SUMMARY_LENGTH: 200,

    /**
     * Article Preview Length (characters)
     * 
     * Used in: NewsDiscoveryService.filterRelevantArticles()
     * 
     * When creating prompts for AI to filter articles by relevance, we include a preview
     * of each article's summary. This length provides enough context for the AI to make
     * relevance decisions without overwhelming the prompt.
     */
    ARTICLE_PREVIEW_LENGTH: 100,

    /**
     * Maximum Chat Message Length (characters)
     * 
     * Used in: routes/chatRoutes.js validation
     * 
     * Maximum length for user chat messages to prevent abuse, ensure reasonable processing
     * times, and maintain good UX. Longer messages could cause API timeouts or poor AI
     * responses.
     */
    MAX_MESSAGE_LENGTH: 1000,

    /**
     * Minimum Chat Message Length (characters)
     * 
     * Used in: routes/chatRoutes.js validation
     * 
     * Minimum length for user chat messages to ensure meaningful input and prevent empty
     * or single-character messages that don't provide useful context for the AI conversation.
     */
    MIN_MESSAGE_LENGTH: 1
};
