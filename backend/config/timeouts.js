/**
 * API Request Timeout Configuration
 * 
 * These timeouts control how long the application waits for external API responses
 * before timing out. All values are in milliseconds.
 * 
 * @author AI News Agent Team
 * @version 1.0.0
 */

module.exports = {
    /**
     * Guardian API Request Timeout (milliseconds)
     * 
     * Used in: GuardianService.fetchArticlesForTopic() and fetchArticlesForSection()
     * 
     * Prevents the application from hanging indefinitely on slow Guardian API responses.
     * Guardian API can be slow during peak times, especially when fetching large numbers
     * of articles with body text. This timeout ensures requests fail gracefully rather
     * than blocking the application.
     */
    GUARDIAN_API_TIMEOUT: 30000,

    /**
     * OpenAI API Request Timeout (milliseconds)
     * 
     * Used in: OpenAIClient.makeOpenAIRequest(), NewsDiscoveryService.makeOpenAIRequest()
     * 
     * Controls how long to wait for OpenAI API responses before timing out. OpenAI API
     * calls can be slow due to model processing time, especially for complex prompts or
     * during high API usage periods. This prevents the application from hanging on AI requests.
     */
    OPENAI_API_TIMEOUT: 30000,

    /**
     * GitHub API Request Timeout (milliseconds)
     * 
     * Used in: GitHubService.makeRequest()
     * 
     * Sets the maximum wait time for GitHub API operations like report uploads or cache fetches.
     * GitHub API is generally fast but can be slow when uploading large files or during
     * GitHub service issues. This timeout prevents hanging on GitHub operations.
     */
    GITHUB_API_TIMEOUT: 30000,

    /**
     * GitHub Cache Request Timeout (milliseconds)
     * 
     * Used in: GuardianSectionsCacheService.fetchFromGitHub()
     * 
     * Specifically for fetching cached Guardian sections data from GitHub. This is a lighter
     * operation than full GitHub API calls, so it uses a shorter timeout. Used when the
     * local cache is expired and needs to be refreshed from GitHub.
     */
    GITHUB_CACHE_TIMEOUT: 10000,

    /**
     * Retry Wait Time for Rate-Limited Requests (milliseconds)
     * 
     * Used in: CuratedNewsService.callOpenAIWithRetry()
     * 
     * When OpenAI API returns rate limit errors (429), the application waits this amount
     * of time before retrying. This prevents overwhelming the API and gives time for
     * rate limits to reset. Only used for rate limit errors, not other types of failures.
     */
    RETRY_WAIT_TIME: 15000,

    /**
     * General Request Timeout (milliseconds)
     * 
     * Used in: Various HTTP requests throughout the application
     * 
     * Fallback timeout for any HTTP requests that don't have specific timeout configurations.
     * This is a safety net to prevent the application from hanging on any external service calls
     * that might not have explicit timeout handling.
     */
    REQUEST_TIMEOUT: 30000
};
