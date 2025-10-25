const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../backend/utils/errorHandler');
const { logger } = require('../backend/utils/logger-vercel');

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
});
