const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Create a DOM environment for DOMPurify
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} html - HTML content to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} - Sanitized HTML
 */
const sanitizeHtml = (html, options = {}) => {
    if (!html || typeof html !== 'string') {
        return '';
    }

    const defaultOptions = {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        ALLOW_DATA_ATTR: false,
        KEEP_CONTENT: true,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_DOM_IMPORT: false,
        RETURN_TRUSTED_TYPE: false,
        FORCE_BODY: false,
        SANITIZE_DOM: true,
        WHOLE_DOCUMENT: false,
        RETURN_TRUSTED_TYPE: false
    };

    const sanitizeOptions = { ...defaultOptions, ...options };
    
    return DOMPurify.sanitize(html, sanitizeOptions);
};

/**
 * Sanitize plain text content
 * @param {string} text - Text content to sanitize
 * @returns {string} - Sanitized text
 */
const sanitizeText = (text) => {
    if (!text || typeof text !== 'string') {
        return '';
    }

    // Remove HTML tags
    let sanitized = text.replace(/<[^>]*>/g, '');
    
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>\"'&]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    return sanitized;
};


module.exports = {
    sanitizeHtml,
    sanitizeText
}; 