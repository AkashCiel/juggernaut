const OrchestratorService = require('../../backend/services/orchestratorService');
const VercelStorageService = require('../../backend/services/vercelStorageService');
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../../backend/utils/errorHandler');
const { logger } = require('../../backend/utils/logger-vercel');
const { generateUserId } = require('../../backend/utils/userUtils');

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
    for (const validator of validateChatMessage) {
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
});
