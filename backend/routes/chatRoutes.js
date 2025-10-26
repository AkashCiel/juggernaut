const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Import services
const OrchestratorService = require('../services/orchestratorService');

// Import middleware
const { apiLimiter } = require('../middleware/security');
const { asyncHandler } = require('../utils/errorHandler');
const { logger } = require('../utils/logger-vercel');
const { MAX_MESSAGE_LENGTH, MIN_MESSAGE_LENGTH } = require('../config/limits');

// Initialize services
const orchestratorService = new OrchestratorService();

// Validation rules for chat messages
const validateChatMessage = [
    body('message')
        .isString()
        .trim()
        .isLength({ min: MIN_MESSAGE_LENGTH, max: MAX_MESSAGE_LENGTH })
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

module.exports = router;
