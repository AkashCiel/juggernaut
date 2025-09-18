const https = require('https');
const { logger, logApiCall } = require('../utils/logger');
const { retry, RETRY_CONFIGS } = require('../utils/retryUtils');

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

    fetchArticlesForTopic(topic, options = {}) {
        const {
            fromDate,
            toDate,
            pageSize = 10,
            orderBy = 'newest',
            section = 'technology',
            includeBodyText = true
        } = options;

        const fields = this.buildShowFields(includeBodyText);
        const params = new URLSearchParams();
        params.set('q', topic);
        if (section) params.set('section', section);
        params.set('type', 'article');
        if (fromDate) params.set('from-date', fromDate);
        if (toDate) params.set('to-date', toDate);
        params.set('order-by', orderBy);
        params.set('page-size', String(Math.max(1, Math.min(50, pageSize))));
        params.set('show-fields', fields.join(','));
        params.set('api-key', this.apiKey || '');

        const url = `${this.baseUrl}?${params.toString()}`;
        logApiCall('guardian', 'search', { topic, pageSize, fromDate, toDate, orderBy, section });

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
                        const rawResponse = json;
                        const results = Array.isArray(json?.response?.results) ? json.response.results : [];
                        const articles = this.mapResultsToNormalizedArticles(results, topic);
                        resolve({ rawResponse, articles });
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
                section: item.sectionName || '',
                publishedAt: item.webPublicationDate || '',
                summarySource: bodyText || trailText || '',
                thumbnail: fields.thumbnail || '',
                topic: topic
            };
        });
    }

    stripHtml(html) {
        return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
}

module.exports = GuardianService;


