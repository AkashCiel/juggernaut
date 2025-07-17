const crypto = require('crypto');

/**
 * Generate a consistent user ID from an email address
 * Uses SHA-256 hash for better distribution and security
 * @param {string} email - User's email address
 * @returns {string} User ID (8-character hex string)
 */
function generateUserId(email) {
    if (!email || typeof email !== 'string') {
        throw new Error('Email is required and must be a string');
    }
    
    // Normalize email to lowercase and trim whitespace
    const normalizedEmail = email.toLowerCase().trim();
    
    // Create SHA-256 hash of the email
    const hash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');
    
    // Return first 8 characters for consistency with existing code
    return hash.substring(0, 8);
}

/**
 * Generate a user ID from email recipients array
 * @param {string[]} recipients - Array of email addresses
 * @returns {string} User ID or 'public' if no recipients
 */
function generateUserIdFromRecipients(recipients) {
    if (!recipients || recipients.length === 0) {
        return 'public';
    }
    
    // Use the first recipient's email to generate user ID
    const primaryEmail = recipients[0];
    return generateUserId(primaryEmail);
}

/**
 * Validate if a user ID is valid
 * @param {string} userId - User ID to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidUserId(userId) {
    if (!userId || typeof userId !== 'string') {
        return false;
    }
    
    // Check if it's the special 'public' user ID
    if (userId === 'public') {
        return true;
    }
    
    // Check if it's a valid 8-character hex string
    return /^[a-f0-9]{8}$/i.test(userId);
}

/**
 * Get the file path for a user's reports
 * @param {string} userId - User ID
 * @returns {string} File path for user's reports
 */
function getUserReportPath(userId) {
    if (!isValidUserId(userId)) {
        throw new Error('Invalid user ID');
    }
    
    if (userId === 'public') {
        return 'reports/public';
    }
    
    return `reports/user-${userId}`;
}

module.exports = {
    generateUserId,
    generateUserIdFromRecipients,
    isValidUserId,
    getUserReportPath
}; 