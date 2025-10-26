const { logger } = require('../backend/utils/logger-vercel');
const { validateEnvironment } = require('../backend/utils/errorHandler');
const { setupCors } = require('../backend/utils/corsMiddleware');

module.exports = async (req, res) => {
    // Handle CORS and preflight requests
    if (!setupCors(req, res)) {
        return; // Preflight handled, exit early
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
