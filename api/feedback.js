const VercelStorageService = require('../backend/services/vercelStorageService');
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../backend/utils/errorHandler');

// Initialize service
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
    for (const validator of validateFeedback) {
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
});

