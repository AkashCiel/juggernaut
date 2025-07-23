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

/**
 * Sanitize paper data
 * @param {Object} paper - Paper object to sanitize
 * @returns {Object} - Sanitized paper object
 */
const sanitizePaper = (paper) => {
    if (!paper || typeof paper !== 'object') {
        return null;
    }

    return {
        id: sanitizeText(paper.id || ''),
        title: sanitizeText(paper.title || ''),
        authors: Array.isArray(paper.authors) 
            ? paper.authors.map(author => sanitizeText(author)).filter(Boolean)
            : [sanitizeText(paper.authors || '')].filter(Boolean),
        summary: sanitizeText(paper.summary || paper.abstract || ''),
        published: sanitizeText(paper.published || ''),
        updated: sanitizeText(paper.updated || ''),
        link: sanitizeText(paper.link || ''),
        categories: Array.isArray(paper.categories)
            ? paper.categories.map(cat => sanitizeText(cat)).filter(Boolean)
            : []
    };
};

/**
 * Sanitize array of papers
 * @param {Array} papers - Array of paper objects
 * @returns {Array} - Array of sanitized paper objects
 */
const sanitizePapers = (papers) => {
    if (!Array.isArray(papers)) {
        return [];
    }

    return papers
        .map(paper => sanitizePaper(paper))
        .filter(paper => paper !== null);
};

/**
 * Sanitize topics array
 * @param {Array} topics - Array of topic strings
 * @returns {Array} - Array of sanitized topic strings
 */
const sanitizeTopics = (topics) => {
    if (!Array.isArray(topics)) {
        return [];
    }

    return topics
        .map(topic => sanitizeText(topic))
        .filter(topic => topic.length > 0)
        .slice(0, 20); // Limit to 20 topics
};

/**
 * Sanitize email addresses
 * @param {Array} emails - Array of email addresses
 * @returns {Array} - Array of sanitized email addresses
 */
const sanitizeEmails = (emails) => {
    if (!Array.isArray(emails)) {
        return [];
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    return emails
        .map(email => {
            const sanitized = sanitizeText(email).toLowerCase();
            return emailRegex.test(sanitized) ? sanitized : null;
        })
        .filter(email => email !== null)
        .slice(0, 50); // Limit to 50 emails
};

module.exports = {
    sanitizeHtml,
    sanitizeText,
    sanitizePaper,
    sanitizePapers,
    sanitizeTopics,
    sanitizeEmails
}; 