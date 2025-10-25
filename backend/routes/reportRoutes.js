const express = require('express');
const router = express.Router();

// Import middleware
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');

// Daily reports trigger endpoint (for GitHub Actions)
router.post('/trigger-daily-reports',
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

// Email validation endpoint
router.post('/validate-email',
    asyncHandler(async (req, res) => {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        try {
            // Use the same validation as user registration
            const validateUserRegistration = [
                body('email')
                    .isEmail()
                    .normalizeEmail()
                    .withMessage('Email must be a valid email address')
                    .isLength({ max: 254 })
                    .withMessage('Email must be less than 254 characters')
            ];

            // Create a mock request object for validation
            const mockReq = { body: { email } };
            
            // Run validation
            for (const validator of validateUserRegistration) {
                await validator.run(mockReq);
            }

            const errors = validationResult(mockReq);
            
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email address',
                    details: errors.array()
                });
            }

            // Log successful email verification
            logger.info(`✅ Email successfully verified: ${email} -> ${mockReq.body.email}`);
            
            res.json({
                success: true,
                message: 'Email is valid',
                normalizedEmail: mockReq.body.email
            });
        } catch (error) {
            logger.error('❌ Email validation error:', error.message);
            res.status(500).json({
                success: false,
                error: 'Email validation failed'
            });
        }
    })
);

// Get scheduler status (GitHub Actions based)
router.get('/scheduler/status',
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

module.exports = router;