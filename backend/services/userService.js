const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

class UserService {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.usersFile = path.join(this.dataDir, 'users.json');
        this.ensureDataDirectory();
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
        } catch (error) {
            logger.error('❌ Error saving users:', error.message);
            throw error;
        }
    }

    /**
     * Generate user ID from email (consistent with GitHub service)
     * @param {string} email - User's email address
     * @returns {string} User ID hash
     */
    generateUserId(email) {
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            const char = email.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16).substring(0, 8);
    }

    /**
     * Register a new user or update existing user
     * @param {string} email - User's email address
     * @param {Array} topics - Array of topic strings
     * @returns {Object} User object
     */
    async registerUser(email, topics) {
        const users = this.loadUsers();
        const userId = this.generateUserId(email);
        
        // Check if user already exists
        const existingUserIndex = users.findIndex(user => user.userId === userId);
        
        const userData = {
            userId,
            email,
            topics: topics || ['artificial intelligence', 'machine learning'],
            isActive: true,
            createdAt: new Date().toISOString(),
            lastReportDate: null
        };

        if (existingUserIndex >= 0) {
            // Update existing user
            users[existingUserIndex] = {
                ...users[existingUserIndex],
                topics: userData.topics,
                isActive: true
            };
            logger.info(`🔄 Updated existing user: ${email} (${userId})`);
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
}

module.exports = UserService; 