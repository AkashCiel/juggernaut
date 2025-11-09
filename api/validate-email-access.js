const VercelStorageService = require('../backend/services/vercelStorageService');
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../backend/utils/errorHandler');
const { logger } = require('../backend/utils/logger-vercel');

// Initialize service
const vercelStorageService = new VercelStorageService();

// Validation rules for email access check
const validateEmailAccess = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email must be a valid email address')
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
    for (const validator of validateEmailAccess) {
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

    const { email } = req.body;
    
    try {
        logger.info(`🔍 Checking email access for: ${email}`);
        
        const accessCheck = await vercelStorageService.checkEmailAccess(email);
        
        logger.info(`✅ Email access check result:`, {
            email,
            exists: accessCheck.exists,
            paid: accessCheck.paid,
            canAccess: accessCheck.canAccess
        });
        
        res.json({
            success: true,
            data: {
                canAccess: accessCheck.canAccess,
                exists: accessCheck.exists,
                paid: accessCheck.paid
            }
        });
    } catch (error) {
        logger.error(`❌ Failed to check email access: ${error.message}`);
        // Fail open - allow access if database check fails
        res.json({
            success: true,
            data: {
                canAccess: true,
                exists: false,
                paid: false,
                error: 'Database check failed, allowing access'
            }
        });
    }
});

