const https = require('https');
const { logger } = require('../utils/logger');

/**
 * Service for fetching Guardian sections from GitHub cache
 * Provides fast access to current Guardian sections without API calls
 */
class GuardianSectionsCacheService {
    constructor() {
        this.cacheUrl = 'https://raw.githubusercontent.com/AkashCiel/juggernaut-reports/main/backend/data/guardian-sections.json';
        this.cache = null;
        this.cacheExpiry = null;
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    }

    /**
     * Get Guardian sections from GitHub cache
     * @returns {Promise<Array>} Array of section names
     */
    async getSections() {
        // Return cached data if still valid
        if (this.cache && this.cacheExpiry > Date.now()) {
            logger.info(`📋 Using cached Guardian sections (${this.cache.length} sections)`);
            return this.cache;
        }

        logger.info('🔄 Fetching Guardian sections from GitHub cache...');
        
        try {
            const sectionsData = await this.fetchFromGitHub();
            const sections = sectionsData.sections || [];
            
            // Update cache
            this.cache = sections;
            this.cacheExpiry = Date.now() + this.CACHE_DURATION;
            
            logger.info(`✅ Fetched ${sections.length} Guardian sections from cache`);
            return sections;
            
        } catch (error) {
            logger.error('❌ Failed to fetch Guardian sections from cache:', error.message);
            
            // Return fallback sections if cache fails
            const fallbackSections = [
                'technology', 'business', 'world', 'us-news', 'science', 'politics',
                'sport', 'culture', 'lifestyle', 'opinion', 'environment', 'society'
            ];
            
            logger.warn(`⚠️ Using fallback sections: ${fallbackSections.length} sections`);
            return fallbackSections;
        }
    }

    /**
     * Fetch sections data from GitHub raw URL
     * @returns {Promise<Object>} Sections data object
     */
    async fetchFromGitHub() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('GitHub cache request timeout')), 10000);
            
            https.get(this.cacheUrl, (res) => {
                clearTimeout(timeout);
                
                if (res.statusCode !== 200) {
                    reject(new Error(`GitHub cache returned status ${res.statusCode}`));
                    return;
                }
                
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const sectionsData = JSON.parse(data);
                        resolve(sectionsData);
                    } catch (e) {
                        reject(new Error(`Failed to parse sections cache: ${e.message}`));
                    }
                });
            }).on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    /**
     * Get cache status information
     * @returns {Object} Cache status
     */
    getCacheStatus() {
        return {
            hasCache: !!this.cache,
            cacheExpiry: this.cacheExpiry,
            isExpired: this.cacheExpiry ? this.cacheExpiry <= Date.now() : true,
            sectionsCount: this.cache ? this.cache.length : 0
        };
    }
}

module.exports = GuardianSectionsCacheService;
