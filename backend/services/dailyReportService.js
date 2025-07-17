const { logger, logApiCall } = require('../utils/logger');
const UserService = require('./userService');
const SummaryService = require('./summaryService');
const GitHubService = require('./githubService');
const EmailService = require('./emailService');

class DailyReportService {
    constructor() {
        this.userService = new UserService();
        this.summaryService = new SummaryService();
        this.githubService = new GitHubService();
        this.emailService = new EmailService();
    }

    /**
     * Generate daily reports for all active users
     * @returns {Promise<Object>} Summary of the operation
     */
    async generateDailyReports() {
        const startTime = new Date();
        logger.info('🚀 Starting daily report generation for all active users');
        
        try {
            // Get all active users
            const activeUsers = await this.userService.getAllActiveUsers();
            logger.info(`📊 Found ${activeUsers.length} active users for daily reports`);
            
            if (activeUsers.length === 0) {
                logger.info('ℹ️ No active users found, skipping daily reports');
                return {
                    success: true,
                    message: 'No active users found',
                    usersProcessed: 0,
                    usersSucceeded: 0,
                    usersFailed: 0,
                    duration: Date.now() - startTime.getTime()
                };
            }

            let succeeded = 0;
            let failed = 0;
            const errors = [];

            // Process each user sequentially
            for (let i = 0; i < activeUsers.length; i++) {
                const user = activeUsers[i];
                const userStartTime = new Date();
                
                logger.info(`👤 Processing user ${i + 1}/${activeUsers.length}: ${user.email} (${user.userId})`);
                logger.info(`🔍 Topics: ${user.topics.join(', ')}`);

                try {
                    // Generate report for this user
                    const reportResult = await this.generateReportForUser(user);
                    
                    if (reportResult.success) {
                        succeeded++;
                        logger.info(`✅ Successfully generated report for ${user.email}`);
                        
                        // Update user's last report date
                        await this.userService.updateLastReportDate(user.userId, new Date().toISOString());
                        logger.info(`📅 Updated last report date for ${user.email}`);
                    } else {
                        failed++;
                        errors.push({
                            user: user.email,
                            error: reportResult.error
                        });
                        logger.error(`❌ Failed to generate report for ${user.email}: ${reportResult.error}`);
                    }
                } catch (error) {
                    failed++;
                    errors.push({
                        user: user.email,
                        error: error.message
                    });
                    logger.error(`❌ Error processing user ${user.email}: ${error.message}`);
                }

                const userDuration = Date.now() - userStartTime.getTime();
                logger.info(`⏱️ User ${user.email} processed in ${userDuration}ms`);
                
                // Small delay between users to be respectful to APIs
                if (i < activeUsers.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            const totalDuration = Date.now() - startTime.getTime();
            logger.info(`🎉 Daily report generation completed`);
            logger.info(`📊 Summary: ${succeeded} succeeded, ${failed} failed, ${totalDuration}ms total`);

            return {
                success: true,
                message: `Daily reports generated for ${activeUsers.length} users`,
                usersProcessed: activeUsers.length,
                usersSucceeded: succeeded,
                usersFailed: failed,
                errors: errors,
                duration: totalDuration
            };

        } catch (error) {
            logger.error(`❌ Daily report generation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate a report for a single user
     * @param {Object} user - User object
     * @returns {Promise<Object>} Report generation result
     */
    async generateReportForUser(user) {
        try {
            // Generate the report using existing summary service
            const reportData = await this.summaryService.generateReport(
                user.topics,
                user.userId,
                [user.email]
            );

            if (!reportData || !reportData.success) {
                return {
                    success: false,
                    error: 'Failed to generate report data'
                };
            }

            // Upload report to GitHub
            const githubToken = process.env.GITHUB_TOKEN;
            if (!githubToken) {
                logger.warn('⚠️ GITHUB_TOKEN not set, skipping GitHub upload');
                return {
                    success: false,
                    error: 'GitHub token not configured'
                };
            }

            const uploadResult = await this.githubService.uploadReport(
                reportData.data,
                githubToken,
                [user.email]
            );

            if (!uploadResult) {
                return {
                    success: false,
                    error: 'Failed to upload report to GitHub'
                };
            }

            // Send email with report summary
            const emailResult = await this.emailService.sendReportEmail(
                user.email,
                reportData.data,
                uploadResult.pagesUrl || uploadResult.fileUrl
            );

            if (!emailResult.success) {
                logger.warn(`⚠️ Failed to send email to ${user.email}: ${emailResult.error}`);
                // Don't fail the entire process if email fails
            }

            return {
                success: true,
                reportData: reportData.data,
                uploadResult: uploadResult,
                emailResult: emailResult
            };

        } catch (error) {
            logger.error(`❌ Error generating report for user ${user.email}: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = DailyReportService; 