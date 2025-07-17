const { logger, logApiCall } = require('../utils/logger');
const { retry, RETRY_CONFIGS } = require('../utils/retryUtils');
const { sanitizeTopics, sanitizePapers } = require('../utils/sanitizer');
const { validateApiKey, handleArxivError, handleOpenAIError, handleGitHubError, handleMailgunError } = require('../utils/errorHandler');
const ArxivService = require('./arxivService');
const SummaryService = require('./summaryService');
const GitHubService = require('./githubService');
const EmailService = require('./emailService');

class ReportGenerator {
    constructor() {
        this.arxivService = new ArxivService();
        this.summaryService = new SummaryService();
        this.githubService = new GitHubService();
        this.emailService = new EmailService();
    }

    /**
     * Generate a complete report for given user and topics
     * @param {string} userEmail - User's email address
     * @param {Array} topics - Research topics
     * @param {Object} options - Additional options
     * @param {number} options.maxPapers - Maximum papers to fetch (default: 50)
     * @param {boolean} options.isDemoMode - Demo mode flag (default: false)
     * @returns {Promise<Object>} Complete report result
     */
    async generateReport(userEmail, topics, options = {}) {
        const { maxPapers = 50, isDemoMode = false } = options;
        
        logger.info(`🚀 Generating report for ${userEmail} with topics: ${topics.join(', ')}`);
        
        try {
            // Sanitize inputs
            const sanitizedTopics = sanitizeTopics(topics);
            const sanitizedMaxPapers = Math.min(Math.max(parseInt(maxPapers) || 50, 1), 100);
            
            // Step 1: Fetch papers from ArXiv (with retry)
            logger.info('📚 Fetching papers from ArXiv...');
            logApiCall('arxiv', 'fetchPapers', { topics: sanitizedTopics, maxPapers: sanitizedMaxPapers });
            
            let papers = [];
            try {
                papers = await retry(
                    () => this.arxivService.fetchPapers(sanitizedTopics, sanitizedMaxPapers),
                    RETRY_CONFIGS.arxiv
                );
                papers = sanitizePapers(papers);
            } catch (error) {
                handleArxivError(error, sanitizedTopics.join(', '));
            }
            
            if (!papers || papers.length === 0) {
                throw new Error('No papers found for the specified topics');
            }

            // Step 2: Generate AI summary (skip in demo mode)
            let aiSummary = null;
            if (!isDemoMode) {
                logger.info('🤖 Generating AI summary...');
                try {
                    validateApiKey(process.env.OPENAI_API_KEY, 'OpenAI');
                    aiSummary = await retry(
                        () => this.summaryService.generateSummary(papers, process.env.OPENAI_API_KEY),
                        RETRY_CONFIGS.openai
                    );
                    logApiCall('openai', 'generateSummary', { papersCount: papers.length });
                } catch (error) {
                    handleOpenAIError(error);
                }
            } else {
                logger.warn('⚠️ Skipping AI summary in demo mode');
            }

            // Step 3: Prepare report data
            const reportDate = new Date().toISOString().split('T')[0];
            const reportData = {
                date: reportDate,
                topics: sanitizedTopics,
                papers: papers,
                aiSummary: aiSummary
            };

            // Step 4: Upload report to GitHub (skip in demo mode)
            let uploadResult = null;
            if (!isDemoMode) {
                logger.info('📤 Uploading report to GitHub...');
                try {
                    validateApiKey(process.env.GITHUB_TOKEN, 'GitHub');
                    uploadResult = await retry(
                        () => this.githubService.uploadReport(reportData, process.env.GITHUB_TOKEN, [userEmail]),
                        RETRY_CONFIGS.github
                    );
                    logApiCall('github', 'uploadReport', { reportDate, userEmail });
                } catch (error) {
                    handleGitHubError(error);
                }
            } else {
                logger.warn('⚠️ Skipping GitHub upload in demo mode');
            }

            // Step 5: Send email (skip in demo mode)
            let emailResult = null;
            if (!isDemoMode) {
                logger.info('📧 Sending email...');
                try {
                    validateApiKey(process.env.MAILGUN_API_KEY, 'Mailgun');
                    validateApiKey(process.env.MAILGUN_DOMAIN, 'Mailgun Domain');
                    
                    this.emailService.initialize(process.env.MAILGUN_API_KEY, process.env.MAILGUN_DOMAIN);
                    emailResult = await retry(
                        () => this.emailService.sendEmail(reportData, sanitizedTopics, [userEmail], new Date()),
                        RETRY_CONFIGS.email
                    );
                    logApiCall('mailgun', 'sendEmail', { recipientsCount: 1 });
                } catch (error) {
                    logger.error('❌ Email service error:', {
                        message: error.message,
                        stack: error.stack
                    });
                    handleMailgunError(error);
                }
            } else {
                logger.warn('⚠️ Skipping email in demo mode');
            }

            logger.info(`✅ Report generation completed for ${userEmail}`);
            
            return {
                success: true,
                data: reportData,
                uploadResult,
                emailResult,
                papersCount: papers.length,
                hasAISummary: !!aiSummary,
                reportUrl: uploadResult?.pagesUrl || null,
                emailSent: !!emailResult
            };

        } catch (error) {
            logger.error(`❌ Report generation failed for ${userEmail}: ${error.message}`);
            return {
                success: false,
                error: error.message,
                userEmail,
                topics
            };
        }
    }
}

module.exports = ReportGenerator; 