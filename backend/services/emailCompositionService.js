const { logger } = require('../utils/logger');

/**
 * Email composition service for generating simple news digest emails
 */
class EmailCompositionService {
    constructor() {
        this.defaultArticles = this.generateDummyArticles();
    }

    /**
     * Generate email content for a user with curated articles
     * @param {Object} user - User object with email and interests
     * @param {Array} curatedArticles - Array of curated article objects
     * @returns {Object} Email content with subject and HTML body
     */
    generateEmailContent(user, curatedArticles = []) {
        try {
            // Use dummy data if no articles provided
            const articles = curatedArticles.length > 0 ? curatedArticles : this.defaultArticles;
            
            logger.info(`📧 Generating email for user: ${user.email} with ${articles.length} articles`);
            
            const subject = this.generateSubjectLine(user, articles.length);
            const htmlContent = this.generateHtmlContent(articles);
            
            return {
                subject: subject,
                html: htmlContent,
                articleCount: articles.length
            };
        } catch (error) {
            logger.error(`❌ Failed to generate email content: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate personalized subject line
     * @param {Object} user - User object
     * @param {number} articleCount - Number of articles
     * @returns {string} Subject line
     */
    generateSubjectLine(user, articleCount) {
        const today = new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
        });
        
        if (articleCount === 0) {
            return `📰 Your Daily News - ${today}`;
        } else if (articleCount === 1) {
            return `📰 Your Daily News - 1 article for ${today}`;
        } else {
            return `📰 Your Daily News - ${articleCount} articles for ${today}`;
        }
    }

    /**
     * Generate HTML email content
     * @param {Array} articles - Array of article objects
     * @returns {string} HTML email content
     */
    generateHtmlContent(articles) {
        const dateStr = new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const articlesHtml = articles.map(article => this.formatArticle(article)).join('');
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Daily News</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    max-width: 600px; 
                    margin: 0 auto; 
                    padding: 20px; 
                    background-color: #f8f9fa;
                }
                .header { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 30px 20px; 
                    text-align: center; 
                    border-radius: 12px 12px 0 0; 
                    margin-bottom: 0;
                }
                .header h1 { margin: 0 0 10px 0; font-size: 28px; }
                .header p { margin: 0; opacity: 0.9; }
                .content { 
                    background: white; 
                    padding: 30px; 
                    border-radius: 0 0 12px 12px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .intro { 
                    margin-bottom: 25px; 
                    font-size: 16px; 
                    color: #666; 
                }
                .article { 
                    margin-bottom: 25px; 
                    padding: 20px; 
                    border-left: 4px solid #667eea; 
                    background: #f8f9fa; 
                    border-radius: 0 8px 8px 0;
                    transition: all 0.2s ease;
                }
                .article:hover { 
                    background: #e9ecef; 
                    transform: translateX(2px);
                }
                .article-title { 
                    margin: 0 0 12px 0; 
                    color: #333; 
                    font-size: 18px; 
                    font-weight: 600;
                    line-height: 1.4;
                }
                .article-summary { 
                    margin: 0 0 15px 0; 
                    color: #666; 
                    line-height: 1.5; 
                    font-size: 14px;
                }
                .article-link { 
                    color: #667eea; 
                    text-decoration: none; 
                    font-weight: 500;
                    font-size: 14px;
                }
                .article-link:hover { 
                    text-decoration: underline; 
                }
                .footer { 
                    text-align: center; 
                    padding: 20px; 
                    color: #666; 
                    font-size: 12px; 
                    margin-top: 20px;
                }
                .article-meta {
                    font-size: 12px;
                    color: #999;
                    margin-bottom: 8px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📰 Your Daily News</h1>
                <p>${dateStr}</p>
            </div>
            <div class="content">
                <div class="intro">
                    Here are your personalized news articles for today:
                </div>
                ${articlesHtml}
            </div>
            <div class="footer">
                <p>Generated by AI News Agent • Personalized for you</p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Format a single article for HTML display
     * @param {Object} article - Article object
     * @returns {string} HTML for the article
     */
    formatArticle(article) {
        const publishedDate = article.publishedAt ? 
            new Date(article.publishedAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            }) : 'Today';
        
        const summary = this.truncateText(article.summary || article.summarySource || 'No summary available', 200);
        
        return `
        <div class="article">
            <div class="article-meta">${publishedDate} • ${article.section || 'News'}</div>
            <h3 class="article-title">${article.title || 'Untitled'}</h3>
            <p class="article-summary">${summary}</p>
            <a href="${article.url || article.shortUrl || '#'}" class="article-link">Read full article →</a>
        </div>
        `;
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength).trim() + '...';
    }

    /**
     * Generate dummy articles for testing
     * @returns {Array} Array of dummy article objects
     */
    generateDummyArticles() {
        return [
            {
                id: 'dummy_1',
                title: 'AI Breakthrough in Quantum Computing Research',
                summary: 'Scientists have made significant progress in quantum computing, potentially revolutionizing how we process information and solve complex problems.',
                section: 'Technology',
                publishedAt: new Date().toISOString(),
                url: 'https://example.com/ai-quantum-breakthrough',
                shortUrl: 'https://example.com/ai-quantum-breakthrough'
            },
            {
                id: 'dummy_2',
                title: 'New Climate Change Solutions Emerge',
                summary: 'Researchers have developed innovative approaches to combat climate change, including new carbon capture technologies and sustainable energy solutions.',
                section: 'Science',
                publishedAt: new Date().toISOString(),
                url: 'https://example.com/climate-solutions',
                shortUrl: 'https://example.com/climate-solutions'
            },
            {
                id: 'dummy_3',
                title: 'Space Exploration Reaches New Milestone',
                summary: 'Recent space missions have achieved unprecedented discoveries, expanding our understanding of the universe and our place within it.',
                section: 'Science',
                publishedAt: new Date().toISOString(),
                url: 'https://example.com/space-milestone',
                shortUrl: 'https://example.com/space-milestone'
            },
            {
                id: 'dummy_4',
                title: 'Economic Trends Shape Global Markets',
                summary: 'Current economic indicators show interesting patterns that could influence investment strategies and business decisions worldwide.',
                section: 'Business',
                publishedAt: new Date().toISOString(),
                url: 'https://example.com/economic-trends',
                shortUrl: 'https://example.com/economic-trends'
            },
            {
                id: 'dummy_5',
                title: 'Healthcare Innovation Improves Patient Outcomes',
                summary: 'New medical technologies and treatment approaches are showing promising results in improving patient care and recovery rates.',
                section: 'Health',
                publishedAt: new Date().toISOString(),
                url: 'https://example.com/healthcare-innovation',
                shortUrl: 'https://example.com/healthcare-innovation'
            }
        ];
    }
}

module.exports = EmailCompositionService;
