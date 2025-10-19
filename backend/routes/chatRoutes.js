const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Import services
const ChatService = require('../services/chatService');

// Import middleware
const { apiLimiter } = require('../middleware/security');
const { asyncHandler } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');

// Initialize services
const chatService = new ChatService();

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
        logger.info('🚀 Chat session start requested');
        
        try {
            const result = await chatService.startSession();
            
            logger.info('✅ Chat session started successfully');
            
            res.json({
                success: true,
                message: 'Chat session started',
                data: result
            });
        } catch (error) {
            logger.error('❌ Chat session start failed:', error.message);
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
        const { message } = req.body;
        
        logger.info('💬 Chat message received', { messageLength: message.length });
        
        try {
            const result = await chatService.handleMessage(message);
            
            logger.info('✅ Chat message processed successfully');
            
            res.json({
                success: true,
                message: 'Message processed',
                data: result
            });
        } catch (error) {
            logger.error('❌ Chat message processing failed:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to process message',
                message: error.message
            });
        }
    })
);

module.exports = router;
