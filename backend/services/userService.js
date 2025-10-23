const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');
const { generateUserId: generateUserIdUtil } = require('../utils/userUtils');
const GitHubService = require('./githubService');
const OpenAIClient = require('../utils/openaiClient');
const { INTEREST_MERGE_PROMPT } = require('../config/constants');

class UserService {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.usersFile = path.join(this.dataDir, 'users.json');
        this.ensureDataDirectory();
        this.githubService = new GitHubService();
        this.openaiClient = new OpenAIClient();
    }

    ensureDataDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Load all users from storage
     * @returns {Array} Array of user objects
     */
    loadUsers() {
        try {
            if (!fs.existsSync(this.usersFile)) {
                return [];
            }
            const data = fs.readFileSync(this.usersFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            logger.error('❌ Error loading users:', error.message);
            return [];
        }
    }

    /**
     * Save users to storage
     * @param {Array} users - Array of user objects
     */
    saveUsers(users) {
        try {
            fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2));
            logger.info(`✅ Saved ${users.length} users to storage`);
            
            // Also push to GitHub main branch
            const githubToken = process.env.GITHUB_TOKEN;
            logger.info(`🔍 GITHUB_TOKEN status: ${githubToken ? 'Present' : 'Missing'}`);
            
            if (githubToken) {
                logger.info(`📤 Uploading complete users.json with ${users.length} users to GitHub`);
                
                this.githubService.uploadUsersJsonFile(users, githubToken, 'Update users.json via registration')
                    .then(result => {
                        logger.info('✅ Synced users.json to GitHub main branch');
                        logger.info(`🔗 GitHub file URL: ${result.fileUrl}`);
                    })
                    .catch(err => {
                        logger.error('❌ Failed to sync users.json to GitHub:', err.message);
                        logger.error('❌ Error stack:', err.stack);
                    });
            } else {
                logger.warn('⚠️ GITHUB_TOKEN not set, skipping GitHub sync for users.json');
            }
        } catch (error) {
            logger.error('❌ Error saving users:', error.message);
            throw error;
        }
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
        const users = this.loadUsers();
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
                sections: userData.sections,
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

        this.saveUsers(users);
        return userData;
    }

    /**
     * Get all active users
     * @returns {Array} Array of active user objects
     */
    async getAllActiveUsers() {
        const users = this.loadUsers();
        return users.filter(user => user.isActive);
    }

    /**
     * Get user by ID
     * @param {string} userId - User ID
     * @returns {Object|null} User object or null
     */
    async getUserById(userId) {
        const users = this.loadUsers();
        return users.find(user => user.userId === userId) || null;
    }

    /**
     * Update user preferences
     * @param {string} userId - User ID
     * @param {Array} topics - New topics array
     * @returns {Object|null} Updated user object or null
     */
    async updateUserPreferences(userId, topics) {
        const users = this.loadUsers();
        const userIndex = users.findIndex(user => user.userId === userId);
        
        if (userIndex === -1) {
            return null;
        }

        users[userIndex].topics = topics;
        this.saveUsers(users);
        
        logger.info(`🔄 Updated preferences for user: ${userId}`);
        return users[userIndex];
    }

    /**
     * Deactivate a user
     * @param {string} userId - User ID
     * @returns {boolean} Success status
     */
    async deactivateUser(userId) {
        const users = this.loadUsers();
        const userIndex = users.findIndex(user => user.userId === userId);
        
        if (userIndex === -1) {
            return false;
        }

        users[userIndex].isActive = false;
        this.saveUsers(users);
        
        logger.info(`⏸️ Deactivated user: ${userId}`);
        return true;
    }

    /**
     * Update user's last report date
     * @param {string} userId - User ID
     * @param {string} reportDate - Report date (YYYY-MM-DD)
     */
    async updateLastReportDate(userId, reportDate) {
        const users = this.loadUsers();
        const userIndex = users.findIndex(user => user.userId === userId);
        
        if (userIndex !== -1) {
            users[userIndex].lastReportDate = reportDate;
            this.saveUsers(users);
        }
    }

    /**
     * Get users who haven't received a report today
     * @param {string} today - Today's date (YYYY-MM-DD)
     * @returns {Array} Array of users eligible for today's report
     */
    async getUsersForDailyReport(today) {
        const activeUsers = await this.getAllActiveUsers();
        return activeUsers.filter(user => user.lastReportDate !== today);
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