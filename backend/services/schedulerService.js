const { logger, logApiCall } = require('../utils/logger');
const { handleArxivError, handleOpenAIError, handleGitHubError, handleMailgunError, validateEnvironment, validateApiKey } = require('../utils/errorHandler');
const { sanitizeTopics, sanitizePapers } = require('../utils/sanitizer');

// Import services
const UserService = require('./userService');
const ArxivService = require('./arxivService');
const SummaryService = require('./summaryService');
const EmailService = require('./emailService');
const GitHubService = require('./githubService');

class SchedulerService {
    constructor() {
        this.userService = new UserService();
        this.arxivService = new ArxivService();
        this.summaryService = new SummaryService();
        this.emailService = new EmailService();
        this.githubService = new GitHubService();
    }

    /**
     * Generate daily reports for all active users
     */
    async generateDailyReports() {
        const today = new Date().toISOString().split('T')[0];
        logger.info(`🚀 Starting daily report generation for ${today}`);

        try {
            // Check for demo mode
            const isDemoMode = !validateEnvironment();
            if (isDemoMode) {
                logger.warn('⚠️ Running in demo mode - some features will be limited');
            }

            // Get users who haven't received a report today
            const eligibleUsers = await this.userService.getUsersForDailyReport(today);
            logger.info(`📊 Found ${eligibleUsers.length} users eligible for daily report`);

            if (eligibleUsers.length === 0) {
                logger.info('✅ All users have already received today\'s report');
                return;
            }

            // Initialize email service if not in demo mode
            if (!isDemoMode) {
                validateApiKey(process.env.MAILGUN_API_KEY, 'Mailgun');
                validateApiKey(process.env.MAILGUN_DOMAIN, 'Mailgun Domain');
                this.emailService.initialize(process.env.MAILGUN_API_KEY, process.env.MAILGUN_DOMAIN);
            }

            // Generate reports for each user
            const results = [];
            for (const user of eligibleUsers) {
                try {
                    const result = await this.generateUserReport(user, isDemoMode);
                    results.push(result);
                    
                    // Update user's last report date
                    await this.userService.updateLastReportDate(user.userId, today);
                    
                    logger.info(`✅ Generated report for user: ${user.email} (${user.userId})`);
                } catch (error) {
                    logger.error(`❌ Failed to generate report for user ${user.email}:`, error.message);
                    results.push({
                        userId: user.userId,
                        email: user.email,
                        success: false,
                        error: error.message
                    });
                }
            }

            // Log summary
            const successfulReports = results.filter(r => r.success).length;
            const failedReports = results.filter(r => !r.success).length;
            
            logger.info(`📊 Daily report generation completed:`);
            logger.info(`   ✅ Successful: ${successfulReports}`);
            logger.info(`   ❌ Failed: ${failedReports}`);

            return results;

        } catch (error) {
            logger.error('❌ Daily report generation failed:', error.message);
            throw error;
        }
    }

    /**
     * Generate a report for a specific user
     * @param {Object} user - User object
     * @param {boolean} isDemoMode - Whether running in demo mode
     * @returns {Object} Report generation result
     */
    async generateUserReport(user, isDemoMode = false) {
        const startTime = Date.now();
        
        try {
            logger.info(`📝 Generating report for user: ${user.email} (${user.userId})`);
            logger.info(`🔍 Topics: ${user.topics.join(', ')}`);

            // Step 1: Fetch papers from ArXiv
            const sanitizedTopics = sanitizeTopics(user.topics);
            const maxPapers = 50; // Default for daily reports
            
            logger.info('📚 Fetching papers from ArXiv...');
            logApiCall('arxiv', 'fetchPapers', { 
                topics: sanitizedTopics, 
                maxPapers,
                userId: user.userId 
            });
            
            let papers = [];
            try {
                papers = await this.arxivService.fetchPapers(sanitizedTopics, maxPapers);
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
                    aiSummary = await this.summaryService.generateSummary(papers, process.env.OPENAI_API_KEY);
                    logApiCall('openai', 'generateSummary', { 
                        papersCount: papers.length,
                        userId: user.userId 
                    });
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
                    uploadResult = await this.githubService.uploadReport(
                        reportData, 
                        process.env.GITHUB_TOKEN, 
                        [user.email] // Pass user's email for user ID generation
                    );
                    logApiCall('github', 'uploadReport', { 
                        reportDate,
                        userId: user.userId 
                    });
                } catch (error) {
                    handleGitHubError(error);
                }
            } else {
                logger.warn('⚠️ Skipping GitHub upload in demo mode');
            }

            // Step 5: Send email to user (skip in demo mode)
            let emailResult = null;
            if (!isDemoMode) {
                logger.info('📧 Sending email to user...');
                try {
                    emailResult = await this.emailService.sendEmail(
                        reportData, 
                        sanitizedTopics, 
                        [user.email], 
                        new Date()
                    );
                    logApiCall('mailgun', 'sendEmail', { 
                        recipientsCount: 1,
                        userId: user.userId 
                    });
                } catch (error) {
                    logger.error('❌ Email service error:', {
                        message: error.message,
                        userId: user.userId
                    });
                    handleMailgunError(error);
                }
            } else {
                logger.warn('⚠️ Skipping email in demo mode');
            }

            const duration = Date.now() - startTime;
            
            return {
                userId: user.userId,
                email: user.email,
                success: true,
                duration,
                papersCount: papers.length,
                hasAISummary: !!aiSummary,
                reportUrl: uploadResult?.pagesUrl || null,
                prUrl: uploadResult?.prUrl || null,
                emailSent: !!emailResult,
                demoMode: isDemoMode
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error(`❌ Report generation failed for user ${user.email}:`, error.message);
            
            return {
                userId: user.userId,
                email: user.email,
                success: false,
                duration,
                error: error.message
            };
        }
    }

    /**
     * Get scheduler status and statistics
     * @returns {Object} Scheduler status information
     */
    async getStatus() {
        const activeUsers = await this.userService.getAllActiveUsers();
        const today = new Date().toISOString().split('T')[0];
        const eligibleUsers = await this.userService.getUsersForDailyReport(today);
        
        return {
            totalActiveUsers: activeUsers.length,
            eligibleForToday: eligibleUsers.length,
            lastRun: new Date().toISOString(),
            isDemoMode: !validateEnvironment()
        };
    }
}

module.exports = SchedulerService; 