const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../data/logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Generate timestamp for log filename
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const logFilePath = path.join(logsDir, `library-${timestamp}.log`);

// Create logger instance
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaStr}`;
        })
    ),
    transports: [
        // Detailed logs to file
        new winston.transports.File({
            filename: logFilePath,
            level: 'debug'
        }),
        // Summary to console
        new winston.transports.Console({
            level: 'info',
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message }) => {
                    return `${level}: ${message}`;
                })
            )
        })
    ]
});

// Helper to log section separator
logger.section = (title) => {
    const separator = '='.repeat(80);
    logger.info(separator);
    logger.info(title);
    logger.info(separator);
};

// Helper to log subsection
logger.subsection = (title) => {
    const separator = '-'.repeat(80);
    logger.info(separator);
    logger.info(title);
};

// Export logger and log file path
module.exports = {
    logger,
    logFilePath
};

