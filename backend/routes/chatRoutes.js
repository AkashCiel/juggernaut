const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Import services
const OrchestratorService = require('../services/orchestratorService');
const ArticleCuratorService = require('../services/articleCuratorService');
const EmailService = require('../services/emailService');
const GitHubService = require('../services/githubService');

// Import middleware
const { apiLimiter } = require('../middleware/security');
const { asyncHandler } = require('../utils/errorHandler');
const { logger } = require('../utils/logger-vercel');
const { generateUserId } = require('../utils/userUtils');

// Initialize services
const orchestratorService = new OrchestratorService();

// Validation rules for chat messages
const validateChatMessage = [
    body('message')
        .isString()
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message must be between 1-1000 characters')
];

// Middleware to check validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
};

// Start chat session endpoint
router.post('/start',
    apiLimiter,
    asyncHandler(async (req, res) => {
        
        try {
            const result = await orchestratorService.startSession();
            
            
            res.json({
                success: true,
                message: 'Chat session started',
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to start chat session',
                message: error.message
            });
        }
    })
);

// Send message endpoint
router.post('/message',
    apiLimiter,
    validateChatMessage,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { message, sessionId, email } = req.body;
        
        
        try {
            const result = await orchestratorService.handleMessage(message, sessionId, email);
            
            
            res.json({
                success: true,
                message: 'Message processed',
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to process message',
                message: error.message
            });
        }
    })
);

// Validation rules for curate-feed request
const validateCurateFeed = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email must be a valid email address'),
    body('userInterests')
        .isString()
        .trim()
        .isLength({ min: 10, max: 5000 })
        .withMessage('User interests must be between 10-5000 characters'),
    body('selectedSections')
        .isString()
        .trim()
        .isLength({ min: 1 })
        .withMessage('Selected sections are required'),
    body('preparedArticleData')
        .isObject()
        .withMessage('Prepared article data is required')
];

// Curate feed endpoint
router.post('/curate-feed',
    apiLimiter,
    validateCurateFeed,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { email, userInterests, selectedSections, preparedArticleData } = req.body;

        logger.info(`🚀 Starting curation for user: ${email}`);
        logger.info(`📋 Selected sections: ${selectedSections}`);
        logger.info(`📰 Articles to process: ${preparedArticleData.articleCount}`);

        try {
            // Initialize services
            const articleCuratorService = new ArticleCuratorService();
            const emailService = new EmailService();
            const githubService = new GitHubService();

            // Step 1: Curate articles (score and filter)
            logger.info('🎯 Step 1: Curating articles by relevance...');
            const curatedArticles = await articleCuratorService.curateFeed(userInterests, preparedArticleData);
            
            logger.info(`✅ Curated ${curatedArticles.length} articles for user: ${email}`);

            // Step 2: Compose and send email
            logger.info('📧 Step 2: Composing and sending email...');
            const emailResult = await emailService.composeAndSendEmail(
                email,
                curatedArticles,
                userInterests,
                selectedSections
            );

            if (!emailResult.success) {
                logger.warn(`⚠️ Email sending failed: ${emailResult.error}`);
            } else {
                logger.info(`✅ Email sent successfully to: ${email}`);
            }

            // Step 3: Save user data to GitHub
            logger.info('💾 Step 3: Saving user data to GitHub...');
            const userId = generateUserId(email);
            
            const userData = {
                userId: userId,
                email: email,
                userInterests: userInterests,
                selectedSections: selectedSections,
                curatedArticles: curatedArticles.map(article => ({
                    id: article.id,
                    title: article.title,
                    webUrl: article.webUrl,
                    trailText: article.trailText,
                    relevanceScore: article.relevanceScore,
                    section: article.section || (article.id ? article.id.split('/')[0] : 'unknown'),
                    publishedDate: article.publishedDate
                })),
                articleCount: curatedArticles.length,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };

            const githubToken = process.env.GITHUB_TOKEN;
            if (!githubToken) {
                logger.warn('⚠️ GITHUB_TOKEN not set, skipping user data save');
            } else {
                try {
                    await githubService.uploadOrUpdateUserInJson(userData, githubToken, 'Add new user from chat completion');
                    logger.info(`✅ User data saved to GitHub for: ${email}`);
                } catch (error) {
                    logger.error(`❌ Failed to save user data to GitHub: ${error.message}`);
                }
            }

            // Return success response
            res.json({
                success: true,
                message: 'News feed curated and delivered',
                data: {
                    email: email,
                    articlesCurated: curatedArticles.length,
                    emailSent: emailResult.success,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            logger.error(`❌ Curation failed for user ${email}: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Failed to curate news feed',
                message: error.message
            });
        }
    })
);

module.exports = router;
