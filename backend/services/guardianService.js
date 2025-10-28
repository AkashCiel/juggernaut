const https = require('https');
const { logger, logApiCall } = require('../utils/logger-vercel');
const { retry, RETRY_CONFIGS } = require('../utils/retryUtils');
const { GUARDIAN_PAGE_SIZE } = require('../config/constants');

class GuardianService {
    constructor() {
        this.apiKey = process.env.GUARDIAN_API_KEY;
        this.baseUrl = 'https://content.guardianapis.com/search';
        this.defaultFields = [
            'headline', 'trailText', 'byline', 'thumbnail', 'shortUrl', 'publication', 'bodyText'
        ];
    }

    buildShowFields(includeBodyText) {
        if (includeBodyText) return this.defaultFields;
        return this.defaultFields.filter(f => f !== 'bodyText');
    }

    mapResultsToNormalizedArticles(results, topic) {
        return results.map(item => {
            const fields = item.fields || {};
            const bodyText = typeof fields.bodyText === 'string' ? fields.bodyText : '';
            const trailText = typeof fields.trailText === 'string' ? this.stripHtml(fields.trailText) : '';
            return {
                id: item.id,
                title: item.webTitle || fields.headline || '',
                url: item.webUrl || '',
                shortUrl: fields.shortUrl || item.webUrl || '',
                byline: fields.byline || '',
                publication: fields.publication || 'The Guardian',
                section: topic || '',
                publishedAt: item.webPublicationDate || '',
                bodyText: bodyText || '',
                trailText: trailText || '',
                thumbnail: fields.thumbnail || '',
                api_section_name: item.sectionName || ''
            };
        });
    }

    stripHtml(html) {
        return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    /**
     * Fetch ALL articles from specified sections without topic filtering
     * Makes one API call per section
     * @param {Array|string} sections - Array of section names or pipe-separated string
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of all articles from sections
     */
    async fetchAllArticlesFromSections(sections, options = {}) {
        const {
            fromDate,
            toDate,
            pageSize = GUARDIAN_PAGE_SIZE,
            orderBy = 'newest',
            includeBodyText = false
        } = options;

        // Convert to array if needed
        const sectionsArray = Array.isArray(sections) ? sections : sections.split('|');
        
        logger.info(`📰 Making ${sectionsArray.length} API calls for sections: ${sectionsArray.join(', ')}`);
        
        const allArticles = [];
        
        // Make one API call per section
        for (const section of sectionsArray) {
            try {
                const articles = await this.fetchArticlesForSection(section, {
                    fromDate,
                    toDate,
                    pageSize,
                    orderBy,
                    includeBodyText
                });
                
                allArticles.push(...articles);
                logger.info(`📰 Section '${section}': ${articles.length} articles`);
                
            } catch (error) {
                logger.warn(`⚠️ Failed to fetch articles for section '${section}': ${error.message}`);
            }
        }
        
        logger.info(`📰 Total articles fetched: ${allArticles.length} across ${sectionsArray.length} sections`);
        return allArticles;
    }

    /**
     * Fetch articles for a single section with automatic pagination
     * @param {string} section - Section name
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of ALL articles from the section
     */
    async fetchArticlesForSection(section, options = {}) {
        const {
            fromDate,
            toDate,
            pageSize = GUARDIAN_PAGE_SIZE,
            orderBy = 'newest',
            includeBodyText = false
        } = options;
        
        logger.info(`📰 Fetching articles for section: ${section}`);
        
        // Fetch first page to get total pages
        const firstPageData = await this.fetchSinglePage(section, 1, {
            fromDate,
            toDate,
            pageSize,
            orderBy,
            includeBodyText
        });
        
        const totalPages = firstPageData.pages;
        const allArticles = [...firstPageData.articles];
        
        logger.info(`📰 Section '${section}': Page 1/${totalPages} (${firstPageData.articles.length} articles)`);
        
        // Fetch remaining pages if any
        if (totalPages > 1) {
            logger.info(`📰 Fetching ${totalPages - 1} additional pages for section '${section}'`);
            
            for (let page = 2; page <= totalPages; page++) {
                const pageData = await this.fetchSinglePage(section, page, {
                    fromDate,
                    toDate,
                    pageSize,
                    orderBy,
                    includeBodyText
                });
                
                allArticles.push(...pageData.articles);
                logger.info(`📰 Section '${section}': Page ${page}/${totalPages} (${pageData.articles.length} articles)`);
            }
        }
        
        logger.info(`📰 Section '${section}': Total ${allArticles.length} articles across ${totalPages} page(s)`);
        return allArticles;
    }

    /**
     * Fetch a single page of articles
     * @param {string} section - Section name
     * @param {number} page - Page number
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - {articles, pages, total}
     */
    async fetchSinglePage(section, page, options = {}) {
        const {
            fromDate,
            toDate,
            pageSize = GUARDIAN_PAGE_SIZE,
            orderBy = 'newest',
            includeBodyText = false
        } = options;
        
        const fields = this.buildShowFields(includeBodyText);
        const params = new URLSearchParams();
        
        params.set('section', section);
        params.set('type', 'article');
        params.set('page', String(page));
        if (fromDate) params.set('from-date', fromDate);
        if (toDate) params.set('to-date', toDate);
        params.set('order-by', orderBy);
        params.set('page-size', String(Math.max(1, Math.min(200, pageSize))));
        params.set('show-fields', fields.join(','));
        params.set('api-key', this.apiKey || '');

        const url = `${this.baseUrl}?${params.toString()}`;
        logApiCall('guardian', 'fetchPage', { section, page, pageSize, fromDate, toDate });

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Guardian API request timeout')), 30000);
            https.get(url, (res) => {
                clearTimeout(timeout);
                if (res.statusCode !== 200) {
                    reject(new Error(`Guardian API returned status ${res.statusCode}`));
                    return;
                }
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        const response = json?.response || {};
                        const results = Array.isArray(response.results) ? response.results : [];
                        const articles = this.mapResultsToNormalizedArticles(results, section);
                        
                        resolve({
                            articles: articles,
                            pages: response.pages || 1,
                            currentPage: response.currentPage || page,
                            total: response.total || articles.length
                        });
                    } catch (e) {
                        reject(new Error(`Failed to parse Guardian response: ${e.message}`));
                    }
                });
            }).on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }
}

module.exports = GuardianService;


