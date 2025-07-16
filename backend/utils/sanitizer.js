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
 * @param {number} maxLength - Maximum length allowed
 * @returns {string} - Sanitized text
 */
const sanitizeText = (text, maxLength = 1000) => {
    if (!text || typeof text !== 'string') {
        return '';
    }

    // Remove HTML tags
    let sanitized = text.replace(/<[^>]*>/g, '');
    
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>\"'&]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength) + '...';
    }
    
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
        id: sanitizeText(paper.id || '', 100),
        title: sanitizeText(paper.title || '', 500),
        authors: Array.isArray(paper.authors) 
            ? paper.authors.map(author => sanitizeText(author, 100)).filter(Boolean)
            : [sanitizeText(paper.authors || '', 100)].filter(Boolean),
        summary: sanitizeText(paper.summary || paper.abstract || '', 5000),
        published: sanitizeText(paper.published || '', 50),
        updated: sanitizeText(paper.updated || '', 50),
        link: sanitizeText(paper.link || '', 500),
        categories: Array.isArray(paper.categories)
            ? paper.categories.map(cat => sanitizeText(cat, 50)).filter(Boolean)
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
        .map(topic => sanitizeText(topic, 100))
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
            const sanitized = sanitizeText(email, 254).toLowerCase();
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