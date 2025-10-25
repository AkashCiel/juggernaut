const { logger } = require('../backend/utils/logger-vercel');
const { validateEnvironment } = require('../backend/utils/errorHandler');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'AI News Agent Backend',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environmentConfigured: validateEnvironment()
    };

    logger.info('Health check requested', { 
        status: healthStatus.status,
        environmentConfigured: healthStatus.environmentConfigured 
    });

    res.json(healthStatus);
};
