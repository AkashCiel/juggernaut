const { logger } = require('../utils/logger-vercel');
const GuardianService = require('./guardianService');

/**
 * Centralized article cache service for scheduled reports
 */
class ArticleCacheService {
    constructor() {
        this.guardianService = new GuardianService();
        this.cache = new Map(); // section -> articles
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
    }

    /**
     * Build union of all sections from users
     * @param {Array} users - Array of user objects
     * @returns {Array} Array of unique section names
     */
    buildUnionOfSections(users) {
        const allSections = new Set();
        
        users.forEach(user => {
            if (user.sections && Array.isArray(user.sections)) {
                user.sections.forEach(section => allSections.add(section));
            }
        });
        
        const sectionsArray = Array.from(allSections);
        logger.info(`📊 Built union of ${sectionsArray.length} sections from ${users.length} users`);
        return sectionsArray;
    }

    /**
     * Store articles in cache with metadata
     * @param {Array} articles - Array of article objects
     */
    storeArticlesInCache(articles) {
        try {
            // Group articles by section
            const articlesBySection = new Map();
            
            articles.forEach(article => {
                const section = article.section || 'general';
                if (!articlesBySection.has(section)) {
                    articlesBySection.set(section, []);
                }
                articlesBySection.get(section).push(article);
            });
            
            // Store in cache
            this.cache = articlesBySection;
            this.cacheTimestamp = Date.now();
            
            // Debug: Print cache preview
            logger.info(`✅ Cached ${articles.length} articles across ${articlesBySection.size} sections`);
            logger.info('📊 Cache preview:');
            for (const [section, sectionArticles] of this.cache) {
                logger.info(`   ${section}: ${sectionArticles.length} articles`);
                if (sectionArticles.length > 0) {
                    const firstArticle = sectionArticles[0];
                    logger.info(`     Sample: "${firstArticle.title}" (section: "${firstArticle.section}")`);
                }
            }
        } catch (error) {
            logger.error(`❌ Failed to store articles in cache: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get articles for specific sections
     * @param {Array} sections - Array of section names
     * @returns {Array} Array of articles for those sections
     */
    getArticlesForSections(sections) {
        const articles = [];
        
        // Debug: Print cache state and requested sections
        logger.info(`🔍 Cache has ${this.cache.size} sections: ${Array.from(this.cache.keys()).join(', ')}`);
        logger.info(`🔍 Requesting articles for sections: ${sections.join(', ')}`);
        
        sections.forEach(section => {
            if (this.cache.has(section)) {
                const sectionArticles = this.cache.get(section);
                articles.push(...sectionArticles);
                logger.info(`✅ Found ${sectionArticles.length} articles in section: ${section}`);
            } else {
                logger.warn(`⚠️ Section not found in cache: ${section}`);
            }
        });
        
        logger.info(`📖 Retrieved ${articles.length} articles for ${sections.length} sections`);
        return articles;
    }

    /**
     * Check if cache is valid (not expired)
     * @returns {boolean} True if cache is valid
     */
    isCacheValid() {
        if (!this.cacheTimestamp) {
            return false;
        }
        
        const isExpired = Date.now() - this.cacheTimestamp > this.CACHE_DURATION;
        if (isExpired) {
            logger.info('🕒 Article cache has expired');
        }
        
        return !isExpired;
    }

    /**
     * Clear expired cache
     */
    clearExpiredCache() {
        if (!this.isCacheValid()) {
            this.cache.clear();
            this.cacheTimestamp = null;
            logger.info('🗑️ Cleared expired article cache');
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        const totalArticles = Array.from(this.cache.values()).reduce((sum, articles) => sum + articles.length, 0);
        const sections = Array.from(this.cache.keys());
        
        return {
            totalArticles,
            sections: sections.length,
            sectionsList: sections,
            cacheTimestamp: this.cacheTimestamp,
            isValid: this.isCacheValid()
        };
    }
}

module.exports = ArticleCacheService;
