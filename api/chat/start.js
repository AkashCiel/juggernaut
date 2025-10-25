const OrchestratorService = require('../../backend/services/orchestratorService');
const { apiLimiter } = require('../../backend/middleware/security');
const { asyncHandler } = require('../../backend/utils/errorHandler');

// Initialize services
const orchestratorService = new OrchestratorService();

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

    // Apply rate limiting (simplified for serverless)
    // Note: In production, consider using Vercel's built-in rate limiting
    
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
});
