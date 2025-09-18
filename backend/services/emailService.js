const Mailgun = require('mailgun.js');
const formData = require('form-data');
const { logger, logApiCall } = require('../utils/logger');
const { handleMailgunError } = require('../utils/errorHandler');
const { sanitizeText, sanitizeHtml } = require('../utils/sanitizer');
const { buildEmailReportHtml } = require('./reportTemplateService');

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

        const includeNews = process.env.INCLUDE_NEWS_IN_EMAIL !== 'false';
        const emailContent = this.createEmailTemplate(reportData, topics, reportDate, includeNews);
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

    createEmailTemplate(reportData, topics, reportDate, includeNewsInEmail = true) {
        return buildEmailReportHtml(reportData, topics, reportDate, includeNewsInEmail);
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