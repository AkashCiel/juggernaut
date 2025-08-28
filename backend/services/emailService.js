const Mailgun = require('mailgun.js');
const formData = require('form-data');
const { logger, logApiCall } = require('../utils/logger');
const { handleMailgunError } = require('../utils/errorHandler');
const { sanitizeText, sanitizeHtml } = require('../utils/sanitizer');
const { convertMarkdownToEmailHtml } = require('../utils/markdownConverter');

// Email Service for sending reports via Mailgun
class EmailService {
    constructor() {
        this.mailgunClient = null;
        this.isInitialized = false;
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
        logger.info('✅ Email service initialized');
    }

    async sendEmail(reportData, topics, recipients, reportDate = new Date()) {
        if (!this.isInitialized) {
            throw new Error('Email service not initialized');
        }

        if (!recipients || recipients.length === 0) {
            throw new Error('No email recipients provided');
        }

        logger.info('📧 Sending email...');

        const emailContent = this.createEmailTemplate(reportData, topics, reportDate);
        const subject = `AI Research Report - ${reportDate.toISOString().split('T')[0]}`;
        
        try {
            const messageData = {
                from: `AI News Agent <your-personal-news@${this.domain}>`,
                to: recipients,
                subject: subject,
                html: emailContent
            };

            logger.info('📧 Attempting to send email with Mailgun...');
            logger.info(`📧 From: ${messageData.from}`);
            logger.info(`📧 To: ${recipients.join(', ')}`);
            logger.info(`📧 Domain: ${this.domain}`);

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

    createEmailTemplate(reportData, topics, reportDate) {
        const dateStr = reportDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const topicsStr = sanitizeText(topics.join(', '));
        
        // Get AI summary from the reportData argument and convert markdown to HTML
        let aiSummary = convertMarkdownToEmailHtml(reportData.aiSummary || '');
        let reportUrl = sanitizeText(reportData.pagesUrl || '#');
        
        // Check if AI summary is available
        const hasAISummary = aiSummary && aiSummary.trim() !== '';
        
        // Create metadata for statistics
        const metadata = this.generateMetadata(reportData);
        
        // Create HTML email template
        const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Research News Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background: #f8f9fa; }
        .ai-summary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .ai-summary h3 { color: white; margin-bottom: 15px; }
        .ai-summary p { color: white; margin-bottom: 15px; }
        .ai-summary .generated-by { font-size: 12px; opacity: 0.9; color: white; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
        .stat { text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .stat-number { font-size: 1.5em; font-weight: bold; color: #667eea; }
        .stat-label { font-size: 12px; color: #666; }
        .full-report-link { text-align: center; margin: 20px 0; }
        .full-report-link a { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .topic-tag { background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-right: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 AI Research News Report</h1>
        <p>${dateStr}</p>
        <p>Topics: ${topicsStr}</p>
    </div>
    
    <div class="content">
        ${hasAISummary ? `
        <div class="ai-summary">
            <h3>🤖 AI Research Summary</h3>
            ${aiSummary}
            <div class="generated-by">Generated by OpenAI GPT-4o-mini</div>
        </div>
        ` : `
        <div style="text-align: center; padding: 20px; color: #666;">
            <p>📊 Report Summary</p>
            <p>No AI summary available. Please check the full report for details.</p>
        </div>
        `}
        
        <div class="stats">
            <div class="stat">
                <div class="stat-number">${metadata.totalItems}</div>
                <div class="stat-label">Total Items</div>
            </div>
            <div class="stat">
                <div class="stat-number">${metadata.newsArticles}</div>
                <div class="stat-label">News Articles</div>
            </div>
            <div class="stat">
                <div class="stat-number">${metadata.researchPapers}</div>
                <div class="stat-label">Research Papers</div>
            </div>
        </div>
        
        <div class="full-report-link">
            <a href="${reportUrl}" target="_blank">
                📄 View Full Report with All Papers
            </a>
        </div>
    </div>
    
    <div class="footer">
        <p>Generated by AI Research News Agent</p>
        <p>Stay updated with the latest developments in artificial intelligence research</p>
    </div>
</body>
</html>`;

        return sanitizeHtml(htmlTemplate);
    }

    generateMetadata(reportData) {
        const researchPapers = reportData.papers ? reportData.papers.length : 0;
        const newsArticles = 0; // Server-side only fetches research papers currently
        const totalItems = researchPapers + newsArticles;
        
        return {
            totalItems: totalItems,
            newsArticles: newsArticles,
            researchPapers: researchPapers
        };
    }
}

module.exports = EmailService; 