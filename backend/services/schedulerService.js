const { logger, logApiCall } = require('../utils/logger-vercel');
const { validateEnvironment, validateApiKey } = require('../utils/errorHandler');

// Import services
const UserService = require('./userService');
const GuardianService = require('./guardianService');
const EmailService = require('./emailService');
const ArticleCacheService = require('./articleCacheService');
const CuratedNewsService = require('./curatedNewsService');
const EmailCompositionService = require('./emailCompositionService');

class SchedulerService {
    constructor() {
        this.userService = new UserService();
        this.guardianService = new GuardianService();
        this.emailService = new EmailService();
        this.articleCacheService = new ArticleCacheService();
        this.curatedNewsService = new CuratedNewsService();
        this.emailCompositionService = new EmailCompositionService();
    }

    /**
     * Initialize email service
     */
    initializeEmailService() {
        validateApiKey(process.env.MAILGUN_API_KEY, 'Mailgun');
        validateApiKey(process.env.MAILGUN_DOMAIN, 'Mailgun Domain');
        this.emailService.initialize(process.env.MAILGUN_API_KEY, process.env.MAILGUN_DOMAIN);
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

            // Step 1: Build union of all sections from users
            const allSections = this.articleCacheService.buildUnionOfSections(eligibleUsers);
            logger.info(`📊 Built union of ${allSections.length} sections from ${eligibleUsers.length} users`);

            // Step 2: Fetch all articles for these sections
            logger.info(`📊 Sections to fetch: ${allSections.join(', ')}`);
            const allArticles = await this.guardianService.fetchAllArticlesFromSections(allSections);
            logger.info(`📰 Fetched ${allArticles.length} articles across ${allSections.length} sections`);

            // Step 3: Store articles in centralized cache
            this.articleCacheService.storeArticlesInCache(allArticles);

            // Step 4: Generate curated news for each user
            const results = [];
            for (const user of eligibleUsers) {
                try {
                    // Get articles for user's sections
                    const userArticles = this.articleCacheService.getArticlesForSections(user.sections || []);
                    logger.info(`📖 Retrieved ${userArticles.length} articles for user: ${user.email}`);

                    // Curate articles using LLM
                    const curatedArticleIds = await this.curatedNewsService.curateArticlesForUser(user, userArticles);
                    logger.info(`🎯 Curated ${curatedArticleIds.length} articles for user: ${user.email}`);

                    // Get detailed curated articles
                    const curatedArticles = this.curatedNewsService.getDetailedCuratedArticles(curatedArticleIds, userArticles);

                    // Generate email content
                    const emailContent = this.emailCompositionService.generateEmailContent(user, curatedArticles);
                    logger.info(`📧 Generated email content for user: ${user.email} (${emailContent.articleCount} articles)`);

                    // Send email to user (skip in demo mode)
                    let emailResult = null;
                    if (!isDemoMode) {
                        try {
                            // Initialize email service if needed
                            if (!this.emailService.isInitialized) {
                                this.initializeEmailService();
                            }
                            
                            // Send the composed email
                            emailResult = await this.emailService.sendComposedEmail(emailContent, [user.email]);
                            logger.info(`📧 Email sent successfully to ${user.email}: ${emailResult.messageId}`);
                            
                            logApiCall('mailgun', 'sendComposedEmail', { 
                                recipientsCount: 1,
                                userId: user.userId,
                                messageId: emailResult.messageId
                            });
                        } catch (emailError) {
                            logger.error(`❌ Failed to send email to ${user.email}: ${emailError.message}`);
                            // Continue processing other users even if one email fails
                        }
                    } else {
                        logger.warn(`⚠️ Skipping email sending in demo mode for ${user.email}`);
                    }

                    // Update user's last report date
                    await this.userService.updateLastReportDate(user.userId, today);

                    results.push({
                        userId: user.userId,
                        email: user.email,
                        success: true,
                        curatedArticles: curatedArticles,
                        totalArticles: userArticles.length,
                        curatedCount: curatedArticles.length,
                        emailContent: emailContent,
                        emailSent: !!emailResult,
                        messageId: emailResult?.messageId || null
                    });

                    logger.info(`✅ Generated curated news for user: ${user.email} (${user.userId})`);
                } catch (error) {
                    logger.error(`❌ Failed to generate curated news for user ${user.email}:`, error.message);
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


}

module.exports = SchedulerService; 