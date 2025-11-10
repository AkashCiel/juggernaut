const Mailgun = require('mailgun.js');
const formData = require('form-data');
const { logger, logApiCall } = require('../utils/logger-vercel');
const { PRICING_FEEDBACK_BUTTON_TEXT, PRICING_FEEDBACK_PATH } = require('../config/constants');
const { handleMailgunError } = require('../utils/errorHandler');
const { sanitizeText, sanitizeHtml } = require('../utils/sanitizer');

// Email Service for sending reports via Mailgun
class EmailService {
    constructor() {
        this.mailgunClient = null;
        this.isInitialized = false;
        this.domain = null;
        this.pendingEmailAddress = null;
        
        // Auto-initialize from environment variables for backwards compatibility
        const apiKey = process.env.MAILGUN_API_KEY;
        const domain = process.env.MAILGUN_DOMAIN;
        if (apiKey && domain) {
            this.initialize(apiKey, domain);
        }
    }

    initialize(apiKey, domain) {
        if (!apiKey || !domain) {
            throw new Error('Mailgun API key and domain are required');
        }

        const mailgun = new Mailgun(formData);
        this.mailgunClient = mailgun.client({
            username: 'api',
            key: apiKey
        });

        this.domain = domain;
        this.isInitialized = true;
    }

    async sendEmail(reportData, topics, recipients, reportDate = new Date()) {
        if (!this.isInitialized) {
            throw new Error('Email service not initialized');
        }

        if (!recipients || recipients.length === 0) {
            throw new Error('No email recipients provided');
        }

        const emailContent = this.createEmailTemplate(reportData, topics, reportDate);
        const subject = `Your Daily News - ${reportDate.toISOString().split('T')[0]}`;
        logger.info('sending email from: juggernaut@akash-singh.org');
        try {
            const messageData = {
                from: `Juggernaut <juggernaut@akash-singh.org>`,
                to: recipients,
                subject: subject,
                html: emailContent
            };

            const response = await this.mailgunClient.messages.create(this.domain, messageData);
            logger.info('✅ Email sent successfully:', response.id);
            
            logApiCall('mailgun', 'sendEmail', { 
                recipientsCount: recipients.length,
                messageId: response.id 
            });
            
            return { success: true, messageId: response.id };
        } catch (error) {
            logger.error('❌ Mailgun error details:', {
                message: error.message,
                statusCode: error.statusCode,
                details: error.details || 'No details available'
            });
            handleMailgunError(error);
        }
    }

    /**
     * Send email with pre-composed content
     * @param {Object} emailContent - Pre-composed email content with subject and html
     * @param {Array} recipients - Array of recipient email addresses
     * @returns {Promise<Object>} Email sending result
     */
    async sendComposedEmail(emailContent, recipients) {
        if (!this.isInitialized) {
            const error = new Error('Email service not initialized');
            logger.error('❌ Email service not initialized');
            return {
                success: false,
                error: error.message
            };
        }

        if (!recipients || recipients.length === 0) {
            const error = new Error('No email recipients provided');
            logger.error('❌ No email recipients provided');
            return {
                success: false,
                error: error.message
            };
        }

        if (!emailContent || !emailContent.subject || !emailContent.html) {
            const error = new Error('Invalid email content provided');
            logger.error('❌ Invalid email content provided');
            return {
                success: false,
                error: error.message
            };
        }
        
        try {
            const messageData = {
                from: `Juggernaut <juggernaut@akash-singh.org>`,
                to: recipients,
                subject: emailContent.subject,
                html: emailContent.html
            };

            const response = await this.mailgunClient.messages.create(this.domain, messageData);
            logger.info('✅ Composed email sent successfully:', response.id);
            
            logApiCall('mailgun', 'sendComposedEmail', { 
                recipientsCount: recipients.length,
                messageId: response.id,
                subject: emailContent.subject
            });
            
            return { success: true, messageId: response.id };
        } catch (error) {
            logger.error('❌ Mailgun error details:', {
                message: error.message,
                statusCode: error.statusCode,
                details: error.details || 'No details available'
            });
            
            // Return error instead of throwing for /curate-feed compatibility
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Compose HTML email with curated articles
     * @param {Array} curatedArticles - Array of curated article objects
     * @param {string} selectedSections - Selected sections string (pipe-separated)
     * @returns {string} HTML email content
     */
    composeEmail(curatedArticles, selectedSections) {
        const sections = selectedSections.split('|').join(', ');
        const totalArticles = Array.isArray(curatedArticles) ? curatedArticles.length : 0;
        const insertIndex = totalArticles > 0 ? Math.min(9, totalArticles - 1) : null;

        const articleCards = curatedArticles.reduce((html, article, index) => {
            const title = this.escapeHtml(article.title || 'No title');
            const trailText = this.escapeHtml(article.trailText || 'No summary');
            const webUrl = article.webUrl || '#';
            const relevanceScore = article.relevanceScore || 0;

            const card = `
            <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid #007bff; background-color: #f8f9fa; border-radius: 4px;">
                <h3 style="margin-top: 0; margin-bottom: 10px;">
                    <a href="${webUrl}" style="color: #007bff; text-decoration: none;">${title}</a>
                </h3>
                <p style="margin: 0; color: #666; line-height: 1.5;">${trailText}</p>
                <p style="margin-top: 8px; font-size: 12px; color: #999;">Relevance: ${relevanceScore}/100</p>
            </div>
            `;
            if (insertIndex !== null && index === insertIndex) {
                return html + card + this.buildPricingFeedbackCta();
            }
            return html + card;
        }, totalArticles === 0 ? this.buildPricingFeedbackCta() : '');

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Personalized News Feed from Juggernaut</title>
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
            Generated by Juggernaut
        </p>
    </div>
</body>
</html>
        `;

        return htmlContent;
    }

    buildPricingFeedbackCta() {
        const baseUrl = process.env.FRONTEND_BASE_URL;
        if (!baseUrl) {
            logger.warn('⚠️ FRONTEND_BASE_URL not set. Skipping pricing/feedback CTA link.');
            return '';
        }

        const targetUrl = `${baseUrl.replace(/\/$/, '')}${PRICING_FEEDBACK_PATH}`;

        if (!this.pendingEmailAddress) {
            // Email address will be set before composing
            logger.warn('⚠️ Email address not set for CTA generation.');
            return '';
        }

        const link = `${targetUrl}?email=${encodeURIComponent(this.pendingEmailAddress)}`;

        return `
            <div style="margin: 32px 0; text-align: center;">
                <a href="${link}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">
                    ${PRICING_FEEDBACK_BUTTON_TEXT}
                </a>
            </div>
        `;
    }

    /**
     * Compose and send email in one step (for /curate-feed API)
     * @param {string} email - Recipient email address
     * @param {Array} curatedArticles - Curated articles array
     * @param {string} selectedSections - Selected sections string (pipe-separated)
     * @returns {Promise<Object>} Result object with success status
     */
    async composeAndSendEmail(email, curatedArticles, selectedSections) {
        if (!this.isInitialized) {
            logger.error('❌ Email service not initialized');
            return {
                success: false,
                error: 'Email service not initialized'
            };
        }

        if (!email || !curatedArticles || !selectedSections) {
            logger.error('❌ Missing required parameters for email');
            return {
                success: false,
                error: 'Missing required parameters'
            };
        }

        try {
            logger.info(`📧 Composing email for ${curatedArticles.length} articles to ${email}...`);
            
            this.pendingEmailAddress = email;
            const htmlContent = this.composeEmail(curatedArticles, selectedSections);
            const subject = 'Your Personalized News Feed';
            
            const emailContent = {
                subject: subject,
                html: htmlContent
            };

            const result = await this.sendComposedEmail(emailContent, [email]);
            
            return result;
        } catch (error) {
            logger.error(`❌ Failed to compose and send email: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.pendingEmailAddress = null;
        }
    }

    createEmailTemplate(reportData, topics, reportDate) {
        // Simple HTML template for curated news articles
        const dateStr = reportDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const articles = reportData.curatedArticles || [];
        const articlesHtml = articles.map(article => `
            <div style="margin-bottom: 20px; padding: 15px; border-left: 3px solid #667eea; background: #f8f9fa;">
                <h3 style="margin: 0 0 10px 0; color: #333;">${article.title}</h3>
                <p style="margin: 0 0 10px 0; color: #666; line-height: 1.5;">${article.summary}</p>
                <a href="${article.url}" style="color: #667eea; text-decoration: none;">Read full article →</a>
            </div>
        `).join('');
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Daily News</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px; }
                .content { background: white; padding: 20px; border-radius: 8px; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📰 Your Daily News</h1>
                <p>${dateStr}</p>
            </div>
            <div class="content">
                <p>Here are your personalized news articles for today:</p>
                ${articlesHtml}
            </div>
            <div class="footer">
                <p>Generated by Juggernaut</p>
            </div>
        </body>
        </html>
        `;
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
