const { marked } = require('marked');
const { sanitizeHtml } = require('./sanitizer');

/**
 * Convert markdown content to safe HTML
 * @param {string} markdown - Raw markdown content
 * @returns {string} - Safe HTML content
 */
function convertMarkdownToHtml(markdown) {
    if (!markdown || typeof markdown !== 'string') {
        return '';
    }

    try {
        // Configure marked options for safe HTML generation
        marked.setOptions({
            gfm: true, // GitHub Flavored Markdown
            breaks: true, // Convert line breaks to <br>
            headerIds: false, // Don't add IDs to headers
            mangle: false, // Don't mangle email addresses
            sanitize: false, // We'll handle sanitization ourselves
            smartLists: true, // Use smarter list behavior
            smartypants: false, // Don't use smart typography
            xhtml: false // Don't use XHTML output
        });

        // Convert markdown to HTML
        const html = marked(markdown);
        
        // Sanitize the HTML to ensure it's safe
        const sanitizedHtml = sanitizeHtml(html, {
            ALLOWED_TAGS: [
                'p', 'br', 'strong', 'em', 'u', 'b', 'i',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'ul', 'ol', 'li', 'a', 'blockquote',
                'code', 'pre', 'hr', 'div', 'span'
            ],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
            ALLOW_DATA_ATTR: false,
            KEEP_CONTENT: true
        });

        return sanitizedHtml;
    } catch (error) {
        console.error('Error converting markdown to HTML:', error);
        // Fallback: return sanitized plain text
        return sanitizeHtml(`<p>${markdown.replace(/[<>\"'&]/g, '')}</p>`);
    }
}

/**
 * Convert markdown content to HTML for email templates
 * Optimized for email display with inline styles
 * @param {string} markdown - Raw markdown content
 * @returns {string} - Safe HTML content optimized for emails
 */
function convertMarkdownToEmailHtml(markdown) {
    if (!markdown || typeof markdown !== 'string') {
        return '';
    }

    try {
        // Configure marked for email-optimized output
        marked.setOptions({
            gfm: true,
            breaks: true,
            headerIds: false,
            mangle: false,
            sanitize: false,
            smartLists: true,
            smartypants: false,
            xhtml: false
        });

        // Convert markdown to HTML
        const html = marked(markdown);
        
        // Sanitize with email-appropriate tags
        const sanitizedHtml = sanitizeHtml(html, {
            ALLOWED_TAGS: [
                'p', 'br', 'strong', 'em', 'u', 'b', 'i',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'ul', 'ol', 'li', 'a', 'blockquote',
                'code', 'pre', 'hr'
            ],
            ALLOWED_ATTR: ['href', 'target', 'rel'],
            ALLOW_DATA_ATTR: false,
            KEEP_CONTENT: true
        });

        return sanitizedHtml;
    } catch (error) {
        console.error('Error converting markdown to email HTML:', error);
        // Fallback: return sanitized plain text
        return sanitizeHtml(`<p>${markdown.replace(/[<>\"'&]/g, '')}</p>`);
    }
}

module.exports = {
    convertMarkdownToHtml,
    convertMarkdownToEmailHtml
};
