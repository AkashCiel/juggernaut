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

// Validation rules for feedback submission
const validateFeedback = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('paymentIntentInMonths')
        .optional()
        .custom((value) => {
            // Allow null, undefined, or empty string
            if (value === null || value === undefined || value === '') {
                return true;
            }
            // If provided, must be an integer between 1 and 6
            const num = parseInt(value, 10);
            if (isNaN(num) || num < 1 || num > 6) {
                throw new Error('Payment intent must be 1 or 6 months if provided');
            }
            return true;
        }),
    body('userFeedback')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Feedback must be less than 2000 characters')
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

// Save feedback endpoint
router.post('/feedback',
    apiLimiter,
    validateFeedback,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { email, paymentIntentInMonths, userFeedback } = req.body;
        
        try {
            const result = await vercelStorageService.saveFeedback({
                email,
                paymentIntentInMonths,
                userFeedback: userFeedback || null
            });
            
            res.json({
                success: true,
                message: 'Feedback submitted successfully',
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to submit feedback',
                message: error.message
            });
        }
    })
);

module.exports = router;

