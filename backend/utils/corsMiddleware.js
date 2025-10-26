/**
 * Shared CORS Middleware Utility
 * 
 * Provides reusable CORS header functions for API endpoints to eliminate
 * code duplication across serverless functions and Express routes.
 * 
 * @author AI News Agent Team
 * @version 1.0.0
 */

/**
 * Set standard CORS headers for API responses
 * @param {Object} res - Express response object
 */
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
}

/**
 * Handle preflight OPTIONS requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {boolean} True if preflight was handled, false otherwise
 */
function handlePreflightRequest(req, res) {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(200).end();
        return true;
    }
    return false;
}

/**
 * Middleware function for Express routes
 * Sets CORS headers and handles preflight requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function corsMiddleware(req, res, next) {
    setCorsHeaders(res);
    
    if (handlePreflightRequest(req, res)) {
        return; // Preflight handled, don't continue
    }
    
    next();
}

/**
 * Utility function for serverless functions
 * Sets CORS headers and handles preflight requests
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {boolean} True if request should continue, false if preflight was handled
 */
function setupCors(req, res) {
    setCorsHeaders(res);
    return !handlePreflightRequest(req, res);
}

module.exports = {
    setCorsHeaders,
    handlePreflightRequest,
    corsMiddleware,
    setupCors
};
