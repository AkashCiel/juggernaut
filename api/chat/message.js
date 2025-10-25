const OrchestratorService = require('../../backend/services/orchestratorService');
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../../backend/utils/errorHandler');

// Initialize services
const orchestratorService = new OrchestratorService();

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
});
