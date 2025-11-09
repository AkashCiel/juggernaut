const express = require('express');
const router = express.Router();

// Import middleware
const { apiLimiter } = require('../middleware/security');
const { asyncHandler } = require('../utils/errorHandler');
const { logger } = require('../utils/logger-vercel');

// Scheduler status endpoint
router.get('/scheduler/status',
    apiLimiter,
    asyncHandler(async (req, res) => {
        res.json({
            success: true,
            data: {
                type: 'github-actions',
                schedule: 'Daily at 4 PM Amsterdam time',
                nextRun: 'Automatically managed by GitHub Actions',
                status: 'active'
            }
        });
    })
);

// Trigger daily reports endpoint
router.post('/trigger-daily-reports',
    apiLimiter,
    asyncHandler(async (req, res) => {
        const { triggered_by } = req.body;
        
        logger.info('🚀 Daily reports triggered', { 
            triggered_by: triggered_by || 'manual',
            timestamp: new Date().toISOString()
        });
        
        try {
            // Import and use the scheduler service with the new flow
            const SchedulerService = require('../services/schedulerService');
            const schedulerService = new SchedulerService();
            
            // Generate daily reports for all active users using the new curated news flow
            const results = await schedulerService.generateDailyReports();
            
            // Process results from the new flow
            const successfulReports = results.filter(r => r.success);
            const failedReports = results.filter(r => !r.success);
            const emailsSent = results.filter(r => r.emailSent).length;
            
            logger.info('✅ Daily reports generation completed', {
                usersProcessed: results.length,
                usersSucceeded: successfulReports.length,
                usersFailed: failedReports.length,
                emailsSent: emailsSent
            });
            
            res.json({
                success: true,
                message: `Processed ${results.length} users, sent ${emailsSent} emails`,
                data: {
                    usersProcessed: results.length,
                    usersSucceeded: successfulReports.length,
                    usersFailed: failedReports.length,
                    emailsSent: emailsSent,
                    results: results,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            logger.error('❌ Daily reports generation failed:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to generate daily reports',
                message: error.message
            });
        }
    })
);

module.exports = router;

