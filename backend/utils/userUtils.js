const crypto = require('crypto');
const https = require('https');
const { UTILITY_PROMPTS, SYSTEM_ROLES, OPENAI_CONFIG } = require('../config/prompts');

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

/**
 * Generate a topic directory name using OpenAI
 * @param {Array} topics - Array of topic strings
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<string>} Topic directory name
 */
async function generateTopicDirectoryName(topics, apiKey) {
    if (!topics || topics.length === 0) {
        return 'general';
    }
    
    const prompt = UTILITY_PROMPTS.topicDirectoryName(topics);
    
    return new Promise((resolve, reject) => {
                    const data = JSON.stringify({
                model: OPENAI_CONFIG.defaultModel,
                messages: [
                    {
                        role: 'system',
                        content: SYSTEM_ROLES.directoryNaming
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: OPENAI_CONFIG.maxTokens.directoryName,
                temperature: OPENAI_CONFIG.temperature.directoryName
            });

        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const timeout = setTimeout(() => {
            req.destroy();
            reject(new Error('OpenAI request timeout'));
        }, OPENAI_CONFIG.timeouts.directoryName);

        const req = https.request(options, (res) => {
            clearTimeout(timeout);
            
            if (res.statusCode !== 200) {
                reject(new Error(`OpenAI API returned status ${res.statusCode}`));
                return;
            }
            
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(responseData);
                    
                    if (response.error) {
                        reject(new Error(`OpenAI API Error: ${response.error.message}`));
                        return;
                    }
                    
                    if (response.choices && response.choices[0] && response.choices[0].message) {
                        const directoryName = response.choices[0].message.content.trim()
                            .replace(/['"]/g, '') // Remove quotes
                            .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
                            .replace(/\s+/g, '-') // Replace spaces with hyphens
                            .toLowerCase();
                        
                        resolve(directoryName || 'general');
                    } else {
                        reject(new Error('Unexpected response format from OpenAI API'));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse OpenAI response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            clearTimeout(timeout);
            reject(new Error(`Request failed: ${error.message}`));
        });

        req.write(data);
        req.end();
    });
}

/**
 * Get the file path for a user's reports
 * @param {string} userId - User ID
 * @param {Array} topics - Array of topics (optional, for topic-based directories)
 * @param {string} apiKey - OpenAI API key (optional, for topic-based directories)
 * @returns {Promise<string>} File path for user's reports
 */
async function getUserReportPath(userId, topics = null, apiKey = null) {
    if (!isValidUserId(userId)) {
        throw new Error('Invalid user ID');
    }
    
    if (userId === 'public') {
        return 'reports/public';
    }
    
    let basePath = `reports/user-${userId}`;
    
    // If topics and API key are provided, create topic-based subdirectory
    if (topics && topics.length > 0 && apiKey) {
        try {
            const topicDirName = await generateTopicDirectoryName(topics, apiKey);
            return `${basePath}/${topicDirName}`;
        } catch (error) {
            // Use a fallback directory name if OpenAI fails
            const fallbackName = topics.join('-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase() || 'general';
            return `${basePath}/${fallbackName}`;
        }
    }
    
    return basePath;
}

module.exports = {
    generateUserId,
    generateUserIdFromRecipients,
    isValidUserId,
    generateTopicDirectoryName,
    getUserReportPath
}; 