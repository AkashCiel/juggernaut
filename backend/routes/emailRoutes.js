const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Import services
const VercelStorageService = require('../services/vercelStorageService');

// Import middleware
const { apiLimiter } = require('../middleware/security');
const { asyncHandler } = require('../utils/errorHandler');
const { logger } = require('../utils/logger-vercel');

// Initialize services
const vercelStorageService = new VercelStorageService();

// Validation rules for email access check
const validateEmailAccess = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email must be a valid email address')
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

// Validate email access endpoint
router.post('/validate-email-access',
    apiLimiter,
    validateEmailAccess,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
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
                    paid: accessCheck.paid,
                    isFirstConversationComplete: accessCheck.isFirstConversationComplete
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
                    isFirstConversationComplete: false,
                    error: 'Database check failed, allowing access'
                }
            });
        }
    })
);

// Validate email endpoint (simple email validation)
router.post('/validate-email',
    apiLimiter,
    validateEmailAccess,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { email } = req.body;
        
        try {
            logger.info(`✅ Email successfully verified: ${email}`);
            
            res.json({
                success: true,
                message: 'Email is valid',
                normalizedEmail: email
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

module.exports = router;

