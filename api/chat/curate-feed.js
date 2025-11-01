const ArticleCuratorService = require('../../backend/services/articleCuratorService');
const EmailService = require('../../backend/services/emailService');
const GitHubService = require('../../backend/services/githubService');
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../../backend/utils/errorHandler');
const { logger } = require('../../backend/utils/logger-vercel');
const { generateUserId } = require('../../backend/utils/userUtils');

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

module.exports = asyncHandler(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Apply validation
    for (const validator of validateCurateFeed) {
        await validator.run(req);
    }

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
});

