const crypto = require('crypto');
const https = require('https');

/**
 * Generate a consistent user ID from an email address
 * Removes domain part and strips special characters
 * @param {string} email - User's email address
 * @returns {string} User ID (cleaned username)
 */
function generateUserId(email) {
    if (!email || typeof email !== 'string') {
        throw new Error('Email is required and must be a string');
    }
    
    // Normalize email to lowercase and trim whitespace
    const normalizedEmail = email.toLowerCase().trim();
    
    // Remove the '@domain' part
    const username = normalizedEmail.split('@')[0];
    
    // Strip special characters, keeping only letters and numbers
    const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '');
    
    // Ensure we don't return an empty string
    if (!cleanUsername) {
        throw new Error('Email username contains no valid characters');
    }
    
    return cleanUsername;
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
    
    // Check if it's a valid alphanumeric string
    return /^[a-zA-Z0-9]+$/.test(userId);
}


module.exports = {
    generateUserId,
    generateUserIdFromRecipients,
    isValidUserId
}; 