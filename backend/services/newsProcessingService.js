const { logger, logApiCall } = require('../utils/logger');
const SummaryService = require('./summaryService');

class NewsProcessingService {
    constructor() {
        this.summaryService = new SummaryService();
    }

    async process(type, articles, options = {}) {
        switch (type) {
            case 'perArticleFiveSentences':
                return await this.perArticleFiveSentences(articles, options);
            default:
                throw new Error(`Unknown processing type: ${type}`);
        }
    }

    async perArticleFiveSentences(articles, options = {}) {
        const {
            maxArticles = articles.length,
            maxInputChars = 1600,
            apiKey = process.env.OPENAI_API_KEY,
            timeoutMs = 60000
        } = options;

        const selected = articles.slice(0, maxArticles);
        const outputs = [];

        for (const article of selected) {
            try {
                const prompt = this.buildFiveSentencePrompt(article, maxInputChars);
                const text = await this.summaryService.callOpenAI(prompt, apiKey, timeoutMs);
                outputs.push({
                    articleId: article.id,
                    text: text?.trim() || '',
                    link: article.shortUrl || article.url
                });
                logApiCall('openai', 'newsPerArticleFiveSentences', { articleId: article.id });
            } catch (error) {
                logger.warn(`⚠️ Failed to summarize article ${article.id}: ${error.message}`);
                outputs.push({ articleId: article.id, text: '', link: article.shortUrl || article.url });
            }
        }

        return outputs;
    }

    buildFiveSentencePrompt(article, maxInputChars) {
        const title = article.title || '';
        const byline = article.byline ? `By ${article.byline}.` : '';
        const content = (article.summarySource || '').slice(0, Math.max(0, maxInputChars));
        return [
            'You are a concise news summarizer. Write exactly five sentences as one paragraph. Avoid markdown bullets. Avoid speculation.',
            `Title: ${title}`,
            byline ? `Byline: ${article.byline}` : '',
            `Content: ${content}`,
            'Task: Summarize the article into exactly 5 sentences suitable for an AI/tech audience.'
        ].filter(Boolean).join('\n\n');
    }
}

module.exports = NewsProcessingService;


