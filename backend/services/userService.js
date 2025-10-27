const { logger } = require('../utils/logger-vercel');
const { generateUserId: generateUserIdUtil } = require('../utils/userUtils');
const GitHubService = require('./githubService');
const OpenAIClient = require('../utils/openaiClient');
const { INTEREST_MERGE_PROMPT } = require('../config/constants');

class UserService {
    constructor() {
        this.githubService = new GitHubService();
        this.openaiClient = new OpenAIClient();
    }

    /**
     * Load all users from GitHub
     * @returns {Promise<Array>} Array of user objects
     */
    async loadUsers() {
        const githubToken = process.env.GITHUB_TOKEN;
        if (!githubToken) {
            logger.warn('⚠️ GITHUB_TOKEN not set, returning empty users array');
            return [];
        }
        return await this.githubService.getUsersFromGitHub(githubToken);
    }

    /**
     * Generate user ID from email (delegates to centralized utility)
     * @param {string} email - User's email address
     * @returns {string} User ID hash
     */
    generateUserId(email) {
        return generateUserIdUtil(email);
    }

    /**
     * Register a new user or update existing user
     * @param {string} email - User's email address
     * @param {string} description - User's interests description
     * @param {Array} sections - Array of Guardian section strings
     * @returns {Object} User object
     */
    async registerUser(email, description, sections) {
        const users = await this.loadUsers();
        const userId = this.generateUserId(email);
        
        // Check if user already exists
        const existingUserIndex = users.findIndex(user => user.userId === userId);
        
        const userData = {
            userId,
            email,
            description: description || 'No description provided',
            sections: sections || ['technology', 'science'],
            isActive: true,
            createdAt: new Date().toISOString(),
            lastReportDate: null
        };

        if (existingUserIndex >= 0) {
            // Update existing user - merge descriptions using LLM
            const existingUser = users[existingUserIndex];
            const mergedDescription = await this.mergeInterestDescriptions(
                existingUser.description, 
                description
            );
            
            users[existingUserIndex] = {
                ...existingUser,
                description: mergedDescription,
                sections: existingUser.sections.concat(userData.sections),
                isActive: true,
                updatedAt: new Date().toISOString()
            };
            logger.info(`🔄 Updated existing user: ${email} (${userId})`);
            logger.info(`📝 Previous sections: ${existingUser.sections ? existingUser.sections.join(', ') : 'None'}`);
            logger.info(`📝 New sections: ${userData.sections.join(', ')}`);
            logger.info(`📝 Merged description: ${mergedDescription}`);
        } else {
            // Add new user
            users.push(userData);
            logger.info(`✅ Registered new user: ${email} (${userId})`);
        }

        // Upload updated users to GitHub
        const githubToken = process.env.GITHUB_TOKEN;
        if (githubToken) {
            try {
                await this.githubService.uploadUsersJsonFile(users, githubToken, 'Update users.json via registration');
                logger.info('✅ Synced users.json to GitHub main branch');
            } catch (error) {
                logger.error('❌ Failed to sync users.json to GitHub:', error.message);
                throw error;
            }
        } else {
            logger.warn('⚠️ GITHUB_TOKEN not set, skipping GitHub sync for users.json');
        }
        
        return userData;
    }

    /**
     * Get all active users
     * @returns {Promise<Array>} Array of active user objects
     */
    async getAllActiveUsers() {
        const githubToken = process.env.GITHUB_TOKEN;
        if (!githubToken) {
            logger.warn('⚠️ GITHUB_TOKEN not set, returning empty users array');
            return [];
        }
        return await this.githubService.getActiveUsersFromGitHub(githubToken);
    }

    /**
     * Get user by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User object or null
     */
    async getUserById(userId) {
        const githubToken = process.env.GITHUB_TOKEN;
        if (!githubToken) {
            logger.warn('⚠️ GITHUB_TOKEN not set, returning null');
            return null;
        }
        return await this.githubService.getUserByIdFromGitHub(userId, githubToken);
    }


    /**
     * Update user's last report date
     * @param {string} userId - User ID
     * @param {string} reportDate - Report date (YYYY-MM-DD)
     */
    async updateLastReportDate(userId, reportDate) {
        const githubToken = process.env.GITHUB_TOKEN;
        if (!githubToken) {
            logger.warn('⚠️ GITHUB_TOKEN not set, cannot update last report date');
            return;
        }

        try {
            const users = await this.loadUsers();
            const userIndex = users.findIndex(user => user.userId === userId);
            
            if (userIndex !== -1) {
                users[userIndex].lastReportDate = reportDate;
                await this.githubService.uploadUsersJsonFile(users, githubToken, 'Update last report date');
            }
        } catch (error) {
            logger.error(`❌ Failed to update last report date: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get users who haven't received a report today
     * @param {string} today - Today's date (YYYY-MM-DD)
     * @returns {Array} Array of users eligible for today's report
     */
    async getUsersForDailyReport(today) {
        const activeUsers = await this.getAllActiveUsers();
        // return activeUsers.filter(user => user.lastReportDate !== today);
        return activeUsers; // TODO: Remove this after testing
    }

    /**
     * Merge existing and new user interest descriptions using LLM
     * @param {string} existingDescription - Current user's interest description
     * @param {string} newDescription - New interest description from current conversation
     * @returns {Promise<string>} Merged interest description
     */
    async mergeInterestDescriptions(existingDescription, newDescription) {
        const messages = [
            {
                role: 'system',
                content: INTEREST_MERGE_PROMPT
            },
            {
                role: 'user',
                content: `Existing description: ${existingDescription}\n\nNew description: ${newDescription}`
            }
        ];

        try {
            const result = await this.openaiClient.callOpenAI(messages);
            logger.info(`🔄 Merged interest descriptions for user`);
            return result.trim();
        } catch (error) {
            logger.error(`❌ Failed to merge interest descriptions: ${error.message}`);
            // Fallback: concatenate with separator
            return `${existingDescription} Additionally, ${newDescription}`;
        }
    }
}

module.exports = UserService; 