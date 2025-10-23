const express = require('express');
const router = express.Router();

// Import services
const ArxivService = require('../services/arxivService');
const SummaryService = require('../services/summaryService');
const EmailService = require('../services/emailService');
const GitHubService = require('../services/githubService');
const UserService = require('../services/userService');
const ReportGenerator = require('../services/reportGenerator');

// Import middleware
const { validateReportRequest, validateUserRegistration, validateArxivTest, validateSummaryTest, handleValidationErrors } = require('../middleware/validation');
const { body, validationResult } = require('express-validator');
const { reportGenerationLimiter, optionalAuth } = require('../middleware/security');
const { sanitizeTopics, sanitizeEmails, sanitizePapers } = require('../utils/sanitizer');
const { asyncHandler, handleArxivError, handleOpenAIError, handleMailgunError, handleGitHubError, validateEnvironment, validateApiKey } = require('../utils/errorHandler');
const { logger, logApiCall, logReportGeneration } = require('../utils/logger');
const { retry, RETRY_CONFIGS } = require('../utils/retryUtils');
const { buildWebReportHtml } = require('../services/reportTemplateService');

// Initialize services
const arxivService = new ArxivService();
const summaryService = new SummaryService();
const emailService = new EmailService();
const githubService = new GitHubService();
const userService = new UserService();
const reportGenerator = new ReportGenerator();

// removed local HTML generator in favor of shared template

// Main report generation endpoint
router.post('/generate-report', 
    reportGenerationLimiter,
    optionalAuth,
    validateReportRequest,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        logger.info('🚀 Starting report generation...');
        
        const { 
            topics = ['artificial intelligence', 'machine learning', 'deep learning'],
            recipients = []
        } = req.body;

        // Sanitize inputs
        const sanitizedTopics = sanitizeTopics(topics);
        const sanitizedRecipients = sanitizeEmails(recipients);

        // Check for demo mode (missing environment variables)
        const isDemoMode = !validateEnvironment();
        
        if (isDemoMode) {
            logger.warn('⚠️ Running in demo mode - some features will be limited');
        }

        // Use the unified ReportGenerator
        const userEmail = sanitizedRecipients.length > 0 ? sanitizedRecipients[0] : 'public@example.com';
        const result = await reportGenerator.generateReport(
            userEmail,
            sanitizedTopics,
            { isDemoMode }
        );

        if (!result.success) {
            throw new Error(result.error);
        }

        // Generate HTML report for the response using shared template
        const htmlReport = buildWebReportHtml(result.data);

        // Return success response with HTML report
        const response = {
            success: true,
            message: isDemoMode ? 'Report generated successfully (Demo Mode)' : 'Report generated successfully',
            data: {
                reportDate: result.data.date,
                topics: sanitizedTopics,
                papersCount: result.papersCount,
                hasAISummary: result.hasAISummary,
                reportUrl: result.reportUrl,
                prUrl: result.uploadResult?.prUrl || null,
                userId: result.uploadResult?.userId || 'public',
                emailSent: result.emailSent,
                demoMode: isDemoMode,
                htmlReport: htmlReport
            }
        };

        if (result.emailResult) {
            response.data.emailId = result.emailResult.messageId;
        }

        logReportGeneration(sanitizedTopics, result.papersCount, result.hasAISummary, isDemoMode);
        logger.info('✅ Report generation completed successfully');
        
        res.json(response);
    })
);

// Test endpoint for ArXiv service
router.post('/test/arxiv',
    validateArxivTest,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { topics = ['artificial intelligence'] } = req.body;
        const sanitizedTopics = sanitizeTopics(topics);
        
        try {
            const papers = await arxivService.fetchPapers(sanitizedTopics);
            const sanitizedPapers = sanitizePapers(papers);
            
            res.json({ 
                success: true, 
                papersCount: sanitizedPapers.length, 
                papers: sanitizedPapers 
            });
        } catch (error) {
            handleArxivError(error, sanitizedTopics.join(', '));
        }
    })
);

// Test endpoint for summary service
router.post('/test/summary',
    validateSummaryTest,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { papers, apiKey } = req.body;
        const sanitizedPapers = sanitizePapers(papers);
        
        try {
            validateApiKey(apiKey, 'OpenAI');
            const summary = await summaryService.generateSummary(sanitizedPapers, apiKey, 60000, ['artificial intelligence']);
            res.json({ success: true, summary });
        } catch (error) {
            handleOpenAIError(error);
        }
    })
);

// Daily reports trigger endpoint (for GitHub Actions)
router.post('/trigger-daily-reports',
    asyncHandler(async (req, res) => {
        const { triggered_by } = req.body;
        
        logger.info('🚀 Daily reports triggered', { 
            triggered_by: triggered_by || 'manual',
            timestamp: new Date().toISOString()
        });
        
        try {
            // Import and use the daily report service
            const DailyReportService = require('../services/dailyReportService');
            const dailyReportService = new DailyReportService();
            
            // Generate daily reports for all active users
            const result = await dailyReportService.generateDailyReports();
            
            logger.info('✅ Daily reports generation completed', {
                usersProcessed: result.usersProcessed,
                usersSucceeded: result.usersSucceeded,
                usersFailed: result.usersFailed,
                duration: result.duration
            });
            
            res.json({
                success: true,
                message: result.message,
                data: {
                    usersProcessed: result.usersProcessed,
                    usersSucceeded: result.usersSucceeded,
                    usersFailed: result.usersFailed,
                    errors: result.errors,
                    duration: result.duration,
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