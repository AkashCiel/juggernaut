const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');
const { validateEnvironment } = require('../utils/errorHandler');

// Health check endpoint
router.get('/health', (req, res) => {
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
});

// Simple test endpoint
router.get('/test', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Backend is running',
        timestamp: new Date().toISOString()
    });
});

// Environment status endpoint (for debugging)
router.get('/status', (req, res) => {
    const status = {
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 8000,
        openaiConfigured: !!(process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('placeholder')),
        mailgunConfigured: !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN && 
                             !process.env.MAILGUN_API_KEY.includes('placeholder') && 
                             !process.env.MAILGUN_DOMAIN.includes('placeholder')),
        githubConfigured: !!(process.env.GITHUB_TOKEN && !process.env.GITHUB_TOKEN.includes('placeholder')),
        demoMode: !validateEnvironment()
    };

    res.json(status);
});

module.exports = router; 