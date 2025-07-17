const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs: windowMs,
        max: max,
        message: {
            error: 'Too many requests',
            message: message,
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Too many requests',
                message: message,
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
    });
};

// Different rate limits for different endpoints
const generalLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests per 15 minutes
    'Too many requests from this IP, please try again later'
);

const reportGenerationLimiter = createRateLimiter(
    60 * 60 * 1000, // 1 hour
    10, // 10 report generations per hour
    'Too many report generation requests, please try again later'
);

const apiLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    50, // 50 API requests per 15 minutes
    'Too many API requests from this IP, please try again later'
);

// Basic API key authentication middleware
const authenticateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    // For MVP, we'll use a simple API key check
    // In production, this should be replaced with proper JWT or OAuth
    const validApiKey = process.env.API_KEY || 'mvp-api-key-2024';
    
    if (!apiKey || apiKey !== validApiKey) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Valid API key required'
        });
    }
    
    next();
};

// Optional authentication - only apply to sensitive endpoints
const optionalAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (apiKey) {
        const validApiKey = process.env.API_KEY || 'mvp-api-key-2024';
        if (apiKey !== validApiKey) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid API key'
            });
        }
    }
    
    next();
};

// Security headers middleware
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

module.exports = {
    generalLimiter,
    reportGenerationLimiter,
    apiLimiter,
    authenticateApiKey,
    optionalAuth,
    securityHeaders
}; 