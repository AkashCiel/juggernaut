const { logger } = require('./logger');

/**
 * Retry configuration options
 * @typedef {Object} RetryConfig
 * @property {number} maxAttempts - Maximum number of retry attempts (default: 3)
 * @property {number} baseDelay - Base delay in milliseconds (default: 1000)
 * @property {number} maxDelay - Maximum delay in milliseconds (default: 10000)
 * @property {number} backoffMultiplier - Exponential backoff multiplier (default: 2)
 * @property {Function} shouldRetry - Function to determine if error should be retried
 */

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    shouldRetry: (error) => {
        // Retry on network errors, timeouts, and 5xx server errors
        const retryableErrors = [
            'ECONNRESET',
            'ECONNREFUSED',
            'ENOTFOUND',
            'ETIMEDOUT',
            'timeout',
            'network',
            'temporary'
        ];
        
        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = error.code?.toLowerCase() || '';
        
        return retryableErrors.some(retryable => 
            errorMessage.includes(retryable) || errorCode.includes(retryable)
        );
    }
};

/**
 * Calculate delay for retry with exponential backoff
 * @param {number} attempt - Current attempt number (1-based)
 * @param {RetryConfig} config - Retry configuration
 * @returns {number} Delay in milliseconds
 */
function calculateDelay(attempt, config) {
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelay);
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {RetryConfig} config - Retry configuration
 * @returns {Promise<any>} Result of the function
 */
async function retry(fn, config = {}) {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError;
    
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            // Check if we should retry this error
            if (!retryConfig.shouldRetry(error)) {
                logger.warn(`❌ Non-retryable error on attempt ${attempt}:`, error.message);
                throw error;
            }
            
            // If this is the last attempt, throw the error
            if (attempt === retryConfig.maxAttempts) {
                logger.error(`❌ Failed after ${retryConfig.maxAttempts} attempts:`, error.message);
                throw error;
            }
            
            // Calculate delay for next attempt
            const delay = calculateDelay(attempt, retryConfig);
            
            logger.warn(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

/**
 * Retry configuration for different service types
 */
const RETRY_CONFIGS = {
    // ArXiv API calls
    arxiv: {
        maxAttempts: 3,
        baseDelay: 2000,
        maxDelay: 15000,
        shouldRetry: (error) => {
            const retryable = ['timeout', 'network', 'temporary', 'econnreset', 'enotfound'];
            const errorMessage = error.message?.toLowerCase() || '';
            return retryable.some(retryable => errorMessage.includes(retryable));
        }
    },
    
    // OpenAI API calls
    openai: {
        maxAttempts: 2,
        baseDelay: 3000,
        maxDelay: 10000,
        shouldRetry: (error) => {
            // Don't retry authentication or quota errors
            const nonRetryable = ['api key', 'quota', 'billing', 'authentication'];
            const errorMessage = error.message?.toLowerCase() || '';
            if (nonRetryable.some(nonRetryable => errorMessage.includes(nonRetryable))) {
                return false;
            }
            
            // Retry on rate limits and temporary errors
            const retryable = ['rate limit', 'timeout', 'temporary', 'server error'];
            return retryable.some(retryable => errorMessage.includes(retryable));
        }
    },
    
    // GitHub API calls
    github: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        shouldRetry: (error) => {
            // Don't retry authentication or permission errors
            const nonRetryable = ['token', 'permission', 'not found', 'authentication'];
            const errorMessage = error.message?.toLowerCase() || '';
            if (nonRetryable.some(nonRetryable => errorMessage.includes(nonRetryable))) {
                return false;
            }
            
            // Retry on rate limits and temporary errors
            const retryable = ['rate limit', 'timeout', 'temporary', 'server error'];
            return retryable.some(retryable => errorMessage.includes(retryable));
        }
    },
    
    // Email service calls
    email: {
        maxAttempts: 2,
        baseDelay: 2000,
        maxDelay: 6000,
        shouldRetry: (error) => {
            // Don't retry authentication or configuration errors
            const nonRetryable = ['api key', 'domain', 'authentication', 'configuration'];
            const errorMessage = error.message?.toLowerCase() || '';
            if (nonRetryable.some(nonRetryable => errorMessage.includes(nonRetryable))) {
                return false;
            }
            
            // Retry on temporary errors
            const retryable = ['timeout', 'temporary', 'server error', 'network'];
            return retryable.some(retryable => errorMessage.includes(retryable));
        }
    },
    
    // The Guardian Content API calls
    guardian: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        shouldRetry: (error) => {
            // Retry on rate limits (429), timeouts, and transient network/server errors
            const errorMessage = error.message?.toLowerCase() || '';
            const retryable = ['429', 'rate limit', 'timeout', 'temporary', 'server error', 'econnreset', 'enotfound', 'network'];
            return retryable.some(token => errorMessage.includes(token));
        }
    }
};

module.exports = {
    retry,
    RETRY_CONFIGS,
    DEFAULT_RETRY_CONFIG
}; 