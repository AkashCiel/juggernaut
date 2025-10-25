const { logger, logError } = require('./logger-vercel');

// Error types for categorization
class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.statusCode = 400;
    }
}

class AuthenticationError extends Error {
    constructor(message = 'Authentication required') {
        super(message);
        this.name = 'AuthenticationError';
        this.statusCode = 401;
    }
}

class AuthorizationError extends Error {
    constructor(message = 'Access denied') {
        super(message);
        this.name = 'AuthorizationError';
        this.statusCode = 403;
    }
}

class NotFoundError extends Error {
    constructor(message = 'Resource not found') {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;
    }
}

class RateLimitError extends Error {
    constructor(message = 'Rate limit exceeded') {
        super(message);
        this.name = 'RateLimitError';
        this.statusCode = 429;
    }
}

class ExternalServiceError extends Error {
    constructor(message, service, originalError = null) {
        super(message);
        this.name = 'ExternalServiceError';
        this.service = service;
        this.originalError = originalError;
        this.statusCode = 502;
    }
}

class ConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConfigurationError';
        this.statusCode = 500;
    }
}

// Error handler middleware
const errorHandler = (error, req, res, next) => {
    // Log the error
    logError(error, {
        url: req.url,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
    });

    // Determine status code
    const statusCode = error.statusCode || 500;
    
    // Create error response
    const errorResponse = {
        error: error.name || 'InternalServerError',
        message: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        path: req.url
    };

    // Add additional details for development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
        errorResponse.details = {
            field: error.field,
            service: error.service,
            originalError: error.originalError?.message
        };
    }

    // Send error response
    res.status(statusCode).json(errorResponse);
};

// Async error wrapper for route handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Service error handlers
const handleArxivError = (error, topic) => {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new ExternalServiceError(
            `ArXiv service unavailable for topic: ${topic}`,
            'arxiv',
            error
        );
    }
    
    if (error.message.includes('timeout')) {
        throw new ExternalServiceError(
            `ArXiv request timeout for topic: ${topic}`,
            'arxiv',
            error
        );
    }
    
    throw new ExternalServiceError(
        `ArXiv API error for topic: ${topic}`,
        'arxiv',
        error
    );
};

const handleOpenAIError = (error) => {
    if (error.message.includes('API key')) {
        throw new AuthenticationError('Invalid OpenAI API key');
    }
    
    if (error.message.includes('quota') || error.message.includes('billing')) {
        throw new ExternalServiceError(
            'OpenAI quota exceeded or billing issue',
            'openai',
            error
        );
    }
    
    if (error.message.includes('timeout')) {
        throw new ExternalServiceError(
            'OpenAI request timeout',
            'openai',
            error
        );
    }
    
    throw new ExternalServiceError(
        'OpenAI API error',
        'openai',
        error
    );
};

const handleMailgunError = (error) => {
    if (error.message.includes('API key')) {
        throw new AuthenticationError('Invalid Mailgun API key');
    }
    
    if (error.message.includes('domain')) {
        throw new ConfigurationError('Invalid Mailgun domain configuration');
    }
    
    throw new ExternalServiceError(
        'Mailgun email service error',
        'mailgun',
        error
    );
};

const handleGitHubError = (error) => {
    if (error.message.includes('token')) {
        throw new AuthenticationError('Invalid GitHub token');
    }
    
    if (error.message.includes('not found')) {
        throw new NotFoundError('GitHub repository not found');
    }
    
    if (error.message.includes('permission')) {
        throw new AuthorizationError('Insufficient GitHub permissions');
    }
    
    throw new ExternalServiceError(
        'GitHub API error',
        'github',
        error
    );
};

// Validation helpers
const validateEnvironment = () => {
    const requiredVars = ['OPENAI_API_KEY', 'MAILGUN_API_KEY', 'MAILGUN_DOMAIN', 'GITHUB_TOKEN'];
    const missing = requiredVars.filter(varName => !process.env[varName] || process.env[varName].includes('placeholder'));
    
    if (missing.length > 0) {
        logger.warn('Missing environment variables', { missing });
        return false;
    }
    
    return true;
};

const validateApiKey = (apiKey, service) => {
    if (!apiKey || apiKey.includes('placeholder')) {
        throw new ConfigurationError(`${service} API key not configured`);
    }
    return true;
};

module.exports = {
    // Error classes
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ExternalServiceError,
    ConfigurationError,
    
    // Middleware
    errorHandler,
    asyncHandler,
    
    // Service error handlers
    handleArxivError,
    handleOpenAIError,
    handleMailgunError,
    handleGitHubError,
    
    // Validation helpers
    validateEnvironment,
    validateApiKey
}; 