const GuardianService = require('../../services/guardianService');
const { logger } = require('../utils/logger');

/**
 * GuardianFetcher - Fetches articles from Guardian API
 * Reuses existing GuardianService
 */
class GuardianFetcher {
    constructor() {
        this.guardianService = new GuardianService();
    }

    /**
     * Fetch all articles from a section for the past N days
     * @param {string} section - Guardian section name
     * @param {number} daysBack - Number of days to look back
     * @returns {Promise<Array>} - Array of normalized article objects
     */
    async fetchSectionArticles(section, daysBack = 40) {
        logger.info(`Fetching ${section} articles from last ${daysBack} days`);
        
        try {
            // Calculate date range
            const toDate = new Date();
            const fromDate = new Date();
            fromDate.setDate(toDate.getDate() - daysBack);
            
            const fromDateStr = fromDate.toISOString().split('T')[0];
            const toDateStr = toDate.toISOString().split('T')[0];
            
            logger.debug('Date range', { from: fromDateStr, to: toDateStr });
            
            // Fetch articles using GuardianService
            const articles = await this.guardianService.fetchAllArticlesFromSections(
                [section],
                {
                    fromDate: fromDateStr,
                    toDate: toDateStr,
                    includeBodyText: true
                }
            );
            
            logger.info(`Fetched ${articles.length} articles from ${section}`);
            
            // Normalize article structure
            const normalized = articles.map(article => this.normalizeArticle(article));
            
            // Filter out articles without bodyText
            const withContent = normalized.filter(article => {
                const hasContent = article.bodyText && article.bodyText.length > 100;
                if (!hasContent) {
                    logger.debug(`Skipping article without sufficient content: ${article.id}`);
                }
                return hasContent;
            });
            
            logger.info(`${withContent.length} articles have sufficient content`);
            
            return withContent;
            
        } catch (error) {
            logger.error('Failed to fetch articles', { 
                section, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Normalize article object to standard structure
     * @param {Object} rawArticle - Raw article from GuardianService
     * @returns {Object} - Normalized article
     */
    normalizeArticle(rawArticle) {
        return {
            id: rawArticle.id,
            title: rawArticle.title,
            webUrl: rawArticle.url || rawArticle.shortUrl,
            apiUrl: `https://content.guardianapis.com/${rawArticle.id}`,
            section: rawArticle.section,
            publishedDate: rawArticle.publishedAt,
            bodyText: rawArticle.bodyText || '',
            trailText: rawArticle.trailText || ''
        };
    }
}

module.exports = GuardianFetcher;

