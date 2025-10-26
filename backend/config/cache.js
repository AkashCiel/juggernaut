/**
 * Cache Configuration and Duration Settings
 * 
 * These settings control how long different types of cached data are stored
 * before being refreshed. All durations are in milliseconds.
 * 
 * @author AI News Agent Team
 * @version 1.0.0
 */

module.exports = {
    /**
     * Article Cache Duration (milliseconds)
     * 
     * Used in: ArticleCacheService.CACHE_DURATION
     * 
     * How long to cache Guardian articles before refreshing. Articles are cached per section
     * to avoid repeated API calls when multiple users request similar content. 6 hours balances
     * freshness with API efficiency while reducing Guardian API calls significantly.
     */
    ARTICLE_CACHE_DURATION: 6 * 60 * 60 * 1000,    // 6 hours

    /**
     * Guardian Sections Cache Duration (milliseconds)
     * 
     * Used in: GuardianSectionsCacheService.CACHE_DURATION
     * 
     * How long to cache the list of available Guardian sections (e.g., "technology", "business",
     * "science"). This data changes very rarely, so it can be cached for 24 hours without
     * affecting content freshness. Sections are used for AI mapping user interests.
     */
    SECTIONS_CACHE_DURATION: 24 * 60 * 60 * 1000,  // 24 hours

    /**
     * Default Cache TTL (milliseconds)
     * 
     * Used in: General caching scenarios throughout the application
     * 
     * Default cache duration for any caching that doesn't have specific requirements.
     * This provides a sensible default for new caching implementations and temporary
     * caching scenarios.
     */
    DEFAULT_CACHE_TTL: 6 * 60 * 60 * 1000,         // 6 hours

    /**
     * Long Cache TTL (milliseconds)
     * 
     * Used in: Caching scenarios where data changes infrequently
     * 
     * For data that changes rarely (like configuration, static content, or reference data),
     * this longer cache duration can be used to minimize API calls and improve performance
     * without affecting data freshness.
     */
    LONG_CACHE_TTL: 24 * 60 * 60 * 1000            // 24 hours
};
