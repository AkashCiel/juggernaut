const winston = require('winston');

// Define log levels
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

// Define log colors
const logColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue'
};

// Add colors to winston
winston.addColors(logColors);

// Create logger instance
const logger = winston.createLogger({
    levels: logLevels,
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'ai-news-backend' },
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                    return `${timestamp} [${level}]: ${message} ${metaStr}`;
                })
            )
        }),
        // File transport for errors
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // File transport for all logs
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const path = require('path');
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Helper methods for common logging patterns
const logRequest = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Request', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress
        });
    });
    
    next();
};

const logError = (error, context = {}) => {
    logger.error('Application Error', {
        message: error.message,
        stack: error.stack,
        ...context
    });
};

const logApiCall = (service, action, data = {}) => {
    logger.info('API Call', {
        service,
        action,
        ...data
    });
};

const logReportGeneration = (topics, papersCount, hasSummary, demoMode) => {
    logger.info('Report Generation', {
        topics: topics.join(', '),
        papersCount,
        hasSummary,
        demoMode
    });
};

// Override console methods to use structured logging
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
};

// Replace console methods with structured logging
console.log = (...args) => logger.info(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));
console.warn = (...args) => logger.warn(args.join(' '));
console.info = (...args) => logger.info(args.join(' '));
console.debug = (...args) => logger.debug(args.join(' '));

module.exports = {
    logger,
    logRequest,
    logError,
    logApiCall,
    logReportGeneration,
    originalConsole
}; 