const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Import services
const OrchestratorService = require('../services/orchestratorService');
const ArticleCuratorService = require('../services/articleCuratorService');
const EmailService = require('../services/emailService');
const GitHubService = require('../services/githubService');
const VercelStorageService = require('../services/vercelStorageService');

// Import middleware
const { apiLimiter } = require('../middleware/security');
const { asyncHandler } = require('../utils/errorHandler');
const { logger } = require('../utils/logger-vercel');
const { generateUserId } = require('../utils/userUtils');

// Initialize services
const orchestratorService = new OrchestratorService();
const vercelStorageService = new VercelStorageService();

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
        const { message, sessionId, email, chatHistory } = req.body;
        
        
        try {
            const result = await orchestratorService.handleMessage(message, sessionId, email, chatHistory);
            
            // Save chat history to database if email is provided
            if (email && result.chatHistory && Array.isArray(result.chatHistory)) {
                try {
                    const userId = generateUserId(email);
                    const now = new Date().toISOString();
                    await vercelStorageService.createOrUpdateUser({
                        userId: userId,
                        email: email,
                        chatHistory: result.chatHistory,
                        createdAt: now,
                        lastUpdated: now
                    });
                } catch (historyError) {
                    // Log error but don't fail the request if history save fails
                    logger.error(`⚠️ Failed to save chat history for ${email}: ${historyError.message}`);
                }
            }
            
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

// Validation rules for curate-feed request (workflow-dispatch mode)
const validateCurateFeed = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email must be a valid email address'),
    body('userInterests')
        .isString()
        .trim()
        .isLength({ min: 10, max: 5000 })
        .withMessage('User interests must be between 10-5000 characters')
];

// Curate feed endpoint
router.post('/curate-feed',
    apiLimiter,
    validateCurateFeed,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { email, userInterests } = req.body;

        logger.info(`🚀 Dispatching GitHub workflow to curate feed for: ${email}`);

        try {
            const runId = `curate_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

            // Dispatch GitHub Actions workflow (repository_dispatch preferred for payload flexibility)
            const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_ORG || process.env.VERCEL_GIT_REPO_OWNER;
            const repo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG || 'juggernaut';
            const token = process.env.GITHUB_TOKEN; // Token with repo:actions scope for this repo
            if (!owner || !repo || !token) {
                throw new Error('Missing GitHub dispatch configuration (GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN)');
            }

            const payload = JSON.stringify({
                event_type: 'curate-feed',
                client_payload: {
                    email,
                    userInterests,
                    runId,
                    debug: false
                }
            });

            await new Promise((resolve, reject) => {
                const https = require('https');
                const options = {
                    hostname: 'api.github.com',
                    path: `/repos/${owner}/${repo}/dispatches`,
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'User-Agent': 'juggernaut-backend',
                        'Accept': 'application/vnd.github+json',
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload)
                    }
                };
                const reqGit = https.request(options, (resp) => {
                    let data = '';
                    resp.on('data', chunk => { data += chunk; });
                    resp.on('end', () => {
                        if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300) {
                            resolve();
                        } else {
                            reject(new Error(`GitHub dispatch failed with status ${resp.statusCode}: ${data}`));
                        }
                    });
                });
                reqGit.on('error', reject);
                reqGit.write(payload);
                reqGit.end();
            });

            res.json({
                success: true,
                message: 'Curation job dispatched to GitHub Actions',
                data: {
                    email,
                    runId,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            logger.error(`❌ Failed to dispatch curation workflow for ${email}: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Failed to dispatch curation workflow',
                message: error.message
            });
        }
    })
);

module.exports = router;
