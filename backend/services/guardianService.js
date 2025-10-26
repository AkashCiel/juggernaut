const https = require('https');
const { logger, logApiCall } = require('../utils/logger-vercel');
const { retry, RETRY_CONFIGS } = require('../utils/retryUtils');
const { GUARDIAN_PAGE_SIZE } = require('../config/constants');
const { GUARDIAN_API_TIMEOUT } = require('../config/timeouts');
const { GUARDIAN_PAGE_SIZE_MAX, GUARDIAN_PAGE_SIZE_DEFAULT } = require('../config/limits');

class GuardianService {
    constructor() {
        this.apiKey = process.env.GUARDIAN_API_KEY;
        this.baseUrl = 'https://content.guardianapis.com/search';
        this.defaultFields = [
            'headline', 'trailText', 'byline', 'thumbnail', 'shortUrl', 'publication', 'bodyText'
        ];
    }

    async fetchArticles(topics, options = {}) {
        const resultsByTopic = [];
        const rawByTopic = [];

        for (const topic of topics) {
            try {
                const { rawResponse, articles } = await retry(
                    () => this.fetchArticlesForTopic(topic, options),
                    RETRY_CONFIGS.guardian
                );
                resultsByTopic.push({ topic, articles });
                rawByTopic.push({ topic, raw: rawResponse });
            } catch (error) {
                logger.warn(`⚠️ Guardian fetch failed for topic "${topic}": ${error.message}`);
            }
        }

        return { rawResponsesByTopic: rawByTopic, articlesByTopic: resultsByTopic };
    }

    /**
     * Unified method to fetch articles from Guardian API
     * @param {Object} options - Query options
     * @param {string} options.topic - Optional topic to search for
     * @param {string} options.section - Section name (required if no topic)
     * @param {string} options.fromDate - Start date for articles
     * @param {string} options.toDate - End date for articles
     * @param {number} options.pageSize - Number of articles per page
     * @param {string} options.orderBy - Sort order ('newest', 'oldest', 'relevance')
     * @param {boolean} options.includeBodyText - Whether to include article body text
     * @param {boolean} options.returnRawResponse - Whether to return raw API response
     * @returns {Promise<Object|Array>} Articles array or {rawResponse, articles} object
     */
    async fetchArticles(options = {}) {
        const {
            topic,
            section,
            fromDate,
            toDate,
            pageSize = GUARDIAN_PAGE_SIZE_DEFAULT,
            orderBy = 'newest',
            includeBodyText = true,
            returnRawResponse = false
        } = options;

        // Validate required parameters
        if (!topic && !section) {
            throw new Error('Either topic or section parameter is required for Guardian API calls');
        }

        const fields = this.buildShowFields(includeBodyText);
        const params = new URLSearchParams();
        
        // Add topic if provided (for search queries)
        if (topic) {
            params.set('q', topic);
        }
        
        // Add section if provided
        if (section) {
            params.set('section', section);
        }
        
        params.set('type', 'article');
        if (fromDate) params.set('from-date', fromDate);
        if (toDate) params.set('to-date', toDate);
        params.set('order-by', orderBy);
        params.set('page-size', String(Math.max(1, Math.min(GUARDIAN_PAGE_SIZE_MAX, pageSize))));
        params.set('show-fields', fields.join(','));
        params.set('api-key', this.apiKey || '');

        const logAction = topic ? 'search' : 'fetchSection';
        const logData = topic 
            ? { topic, pageSize, fromDate, toDate, orderBy, section }
            : { section, pageSize, fromDate, toDate, orderBy };
        const topicOrSection = topic || section;

        return this._makeGuardianRequest(
            params,
            logAction,
            logData,
            topicOrSection,
            returnRawResponse
        );
    }

    /**
     * Fetch articles for a specific topic (backward compatibility)
     * @param {string} topic - Topic to search for
     * @param {Object} options - Query options
     * @returns {Promise<Object>} {rawResponse, articles} object
     */
    fetchArticlesForTopic(topic, options = {}) {
        return this.fetchArticles({
            ...options,
            topic,
            returnRawResponse: true
        });
    }

    buildShowFields(includeBodyText) {
        if (includeBodyText) return this.defaultFields;
        return this.defaultFields.filter(f => f !== 'bodyText');
    }

    /**
     * Private method to make Guardian API HTTP requests
     * Consolidates common HTTP request logic used by both fetchArticlesForTopic and fetchArticlesForSection
     * @param {URLSearchParams} params - Query parameters
     * @param {string} logAction - Action name for logging
     * @param {Object} logData - Additional data for logging
     * @param {string} topicOrSection - Topic or section name for result mapping
     * @param {boolean} returnRawResponse - Whether to return raw response along with articles
     * @returns {Promise<Object|Array>} Articles array or {rawResponse, articles} object
     */
    async _makeGuardianRequest(params, logAction, logData, topicOrSection, returnRawResponse = false) {
        const url = `${this.baseUrl}?${params.toString()}`;
        logApiCall('guardian', logAction, logData);

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Guardian API request timeout')), GUARDIAN_API_TIMEOUT);
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
                        const results = Array.isArray(json?.response?.results) ? json.response.results : [];
                        const articles = this.mapResultsToNormalizedArticles(results, topicOrSection);
                        
                        if (returnRawResponse) {
                            resolve({ rawResponse: json, articles });
                        } else {
                            resolve(articles);
                        }
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
                summarySource: bodyText || trailText || '',
                thumbnail: fields.thumbnail || '',
                topic: item.sectionName || ''
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
            pageSize = GUARDIAN_PAGE_SIZE_DEFAULT,
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
     * Fetch articles for a single section (backward compatibility)
     * @param {string} section - Section name
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of articles from the section
     */
    async fetchArticlesForSection(section, options = {}) {
        logger.info(`📰 Fetching articles for section: ${section}`);
        return this.fetchArticles({
            ...options,
            section,
            includeBodyText: false,
            returnRawResponse: false
        });
    }
}

module.exports = GuardianService;


