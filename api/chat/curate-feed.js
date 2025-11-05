// This endpoint dispatches a GitHub Actions workflow to run the full curation flow
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../../backend/utils/errorHandler');
const { logger } = require('../../backend/utils/logger-vercel');

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
        .withMessage('User interests must be between 10-5000 characters')
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

    const { email, userInterests } = req.body;

    logger.info(`🚀 Dispatching GitHub workflow to curate feed for: ${email}`);

    try {
        const runId = `curate_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

        // Dispatch GitHub Actions workflow via repository_dispatch
        const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_ORG || process.env.VERCEL_GIT_REPO_OWNER;
        const repo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG || 'juggernaut';
        const token = process.env.GITHUB_TOKEN; // Token with repo dispatch permissions
        if (!owner || !repo || !token) {
            throw new Error('Missing GitHub dispatch configuration (GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN)');
        }

        const payload = JSON.stringify({
            event_type: 'curate-feed',
            client_payload: { email, userInterests, runId, debug: false }
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
            data: { email, runId, timestamp: new Date().toISOString() }
        });

    } catch (error) {
        logger.error(`❌ Failed to dispatch curation workflow for ${email}: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to dispatch curation workflow',
            message: error.message
        });
    }
});

