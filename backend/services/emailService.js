const { logger } = require('../utils/logger-vercel');
const { retry, RETRY_CONFIGS } = require('../utils/retryUtils');

class EmailService {
    constructor() {
        this.mailgunApiKey = process.env.MAILGUN_API_KEY;
        this.mailgunDomain = process.env.MAILGUN_DOMAIN;
        this.fromEmail = `news@${this.mailgunDomain}`;
    }

    /**
     * Compose HTML email with curated articles
     * @param {Array} curatedArticles - Array of curated article objects
     * @param {string} userInterests - User's interests description
     * @param {string} selectedSections - Selected sections string
     * @returns {string} HTML email content
     */
    composeEmail(curatedArticles, selectedSections) {
        const sections = selectedSections.split('|').join(', ');

        // Compose article cards
        const articleCards = curatedArticles.map((article, index) => {
            const title = this.escapeHtml(article.title || 'No title');
            const trailText = this.escapeHtml(article.trailText || 'No summary');
            const webUrl = article.webUrl || '#';
            const relevanceScore = article.relevanceScore || 0;

            return `
            <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid #007bff; background-color: #f8f9fa; border-radius: 4px;">
                <h3 style="margin-top: 0; margin-bottom: 10px;">
                    <a href="${webUrl}" style="color: #007bff; text-decoration: none;">${title}</a>
                </h3>
                <p style="margin: 0; color: #666; line-height: 1.5;">${trailText}</p>
                <p style="margin-top: 8px; font-size: 12px; color: #999;">Relevance: ${relevanceScore}/100</p>
            </div>
            `;
        }).join('');

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Personalized News Feed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Your Personalized News Feed</h1>
    </div>
    
    <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="margin-top: 0; color: #666;">
            Based on your interests in <strong>${sections}</strong>, we've curated ${curatedArticles.length} articles for you.
        </p>
        
        ${articleCards}
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; margin: 0;">
            This news feed was personalized for you based on your interests.<br>
        </p>
    </div>
</body>
</html>
        `;

        return htmlContent;
    }

    /**
     * Send email via Mailgun
     * @param {string} to - Recipient email address
     * @param {string} htmlContent - HTML email content
     * @param {string} subject - Email subject line
     * @returns {Promise<Object>} Result object with success status
     */
    async sendEmail(to, htmlContent, subject = 'Your Personalized News Feed') {
        if (!this.mailgunApiKey || !this.mailgunDomain) {
            logger.error('❌ Mailgun API key or domain not configured');
            return {
                success: false,
                error: 'Email service not configured'
            };
        }

        try {
            const result = await retry(
                () => this.makeMailgunRequest(to, htmlContent, subject),
                RETRY_CONFIGS.email
            );

            logger.info(`✅ Email sent successfully to: ${to}`);
            return {
                success: true,
                messageId: result.messageId
            };
        } catch (error) {
            logger.error(`❌ Failed to send email: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Make Mailgun API request
     * @param {string} to - Recipient email
     * @param {string} htmlContent - HTML content
     * @param {string} subject - Email subject
     * @returns {Promise<Object>} Mailgun response
     */
    async makeMailgunRequest(to, htmlContent, subject) {
        const https = require('https');
        const FormData = require('form-data');

        const form = new FormData();
        form.append('from', this.fromEmail);
        form.append('to', to);
        form.append('subject', subject);
        form.append('html', htmlContent);

        const auth = Buffer.from(`api:${this.mailgunApiKey}`).toString('base64');

        const options = {
            hostname: 'api.mailgun.net',
            path: `/v3/${this.mailgunDomain}/messages`,
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                ...form.getHeaders()
            }
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Mailgun API request timeout'));
            }, 30000);

            const req = https.request(options, (res) => {
                clearTimeout(timeout);
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`Mailgun API error: ${res.statusCode} - ${data}`));
                        return;
                    }

                    try {
                        const json = JSON.parse(data);
                        resolve({
                            messageId: json.id,
                            message: json.message
                        });
                    } catch (e) {
                        reject(new Error(`Failed to parse Mailgun response: ${e.message}`));
                    }
                });
            });

            req.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });

            form.pipe(req);
        });
    }

    /**
     * Compose and send email in one step
     * @param {string} email - Recipient email
     * @param {Array} curatedArticles - Curated articles
     * @param {string} userInterests - User interests
     * @param {string} selectedSections - Selected sections
     * @returns {Promise<Object>} Result object
     */
    async composeAndSendEmail(email, curatedArticles, selectedSections) {
        logger.info(`📧 Composing email for ${curatedArticles.length} articles to ${email}...`);
        
        const htmlContent = this.composeEmail(curatedArticles, selectedSections);
        const result = await this.sendEmail(email, htmlContent);

        return result;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

module.exports = EmailService;

