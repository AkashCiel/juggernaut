const { neon } = require('@neondatabase/serverless');
const { logger } = require('../utils/logger-vercel');

/**
 * Vercel Storage Service for user data management (using Neon Postgres)
 */
class VercelStorageService {
    constructor() {
        // Neon connection string is automatically available via Vercel environment variables
        // DATABASE_URL is set automatically when Neon is linked to Vercel
        this.sql = neon(process.env.DATABASE_URL);
    }
    /**
     * Create or update a user record
     * @param {Object} userData - User data object
     * @returns {Promise<Object>} Result object with success status
     */
    async createOrUpdateUser(userData) {
        try {
            logger.info(`💾 Saving user data to Vercel Postgres: ${userData.email}`);
            
            // Insert or update user (upsert)
            await this.sql`
                INSERT INTO users (
                    user_id,
                    email,
                    user_interests,
                    selected_sections,
                    curated_articles,
                    article_count,
                    paid,
                    chat_history,
                    created_at,
                    last_updated
                ) VALUES (
                    ${userData.userId},
                    ${userData.email},
                    ${userData.userInterests},
                    ${userData.selectedSections},
                    ${JSON.stringify(userData.curatedArticles)}::jsonb,
                    ${userData.articleCount},
                    ${userData.paid || false},
                    ${userData.chatHistory ? JSON.stringify(userData.chatHistory) : null}::jsonb,
                    ${userData.createdAt},
                    ${userData.lastUpdated}
                )
                ON CONFLICT (user_id) 
                DO UPDATE SET
                    email = EXCLUDED.email,
                    user_interests = EXCLUDED.user_interests,
                    selected_sections = EXCLUDED.selected_sections,
                    curated_articles = EXCLUDED.curated_articles,
                    article_count = EXCLUDED.article_count,
                    paid = COALESCE(EXCLUDED.paid, users.paid),
                    chat_history = COALESCE(EXCLUDED.chat_history, users.chat_history),
                    last_updated = EXCLUDED.last_updated
            `;
            
            logger.info(`✅ User data saved to Vercel Postgres for: ${userData.email}`);
            return { success: true };
        } catch (error) {
            logger.error(`❌ Failed to save user data to Vercel Postgres: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get user by userId
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User object or null if not found
     */
    async getUserById(userId) {
        try {
            const result = await this.sql`
                SELECT * FROM users WHERE user_id = ${userId}
            `;
            
            if (result.length === 0) {
                return null;
            }
            
            const user = result[0];
            // Parse curated_articles JSON if it's a string
            if (typeof user.curated_articles === 'string') {
                user.curated_articles = JSON.parse(user.curated_articles);
            }
            
            return user;
        } catch (error) {
            logger.error(`❌ Failed to get user by ID: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get user by email
     * @param {string} email - User email
     * @returns {Promise<Object|null>} User object or null if not found
     */
    async getUserByEmail(email) {
        try {
            const result = await this.sql`
                SELECT * FROM users WHERE email = ${email}
            `;
            
            if (result.length === 0) {
                return null;
            }
            
            const user = result[0];
            // Parse curated_articles JSON if it's a string
            if (typeof user.curated_articles === 'string') {
                user.curated_articles = JSON.parse(user.curated_articles);
            }
            
            return user;
        } catch (error) {
            logger.error(`❌ Failed to get user by email: ${error.message}`);
            throw error;
        }
    }

    /**
     * Save user feedback
     * @param {Object} feedbackData - Feedback data object
     * @param {string} feedbackData.email - User email
     * @param {number|null} feedbackData.paymentIntentInMonths - Payment intent in months (1 or 6), optional
     * @param {string|null} feedbackData.userFeedback - Optional user feedback text
     * @param {boolean|null} feedbackData.subscribedToFreeNewsFeed - Subscription to free news feed, optional
     * @returns {Promise<Object>} Result object with success status
     */
    async saveFeedback(feedbackData) {
        try {
            logger.info(`💾 Saving feedback to Vercel Postgres: ${feedbackData.email}`);
            
            const now = new Date().toISOString();
            
            // Insert or update feedback record (upsert)
            await this.sql`
                INSERT INTO user_feedback (
                    email,
                    payment_intent_in_months,
                    user_feedback,
                    subscribed_to_free_news_feed,
                    created_at
                ) VALUES (
                    ${feedbackData.email},
                    ${feedbackData.paymentIntentInMonths || null},
                    ${feedbackData.userFeedback || null},
                    ${feedbackData.subscribedToFreeNewsFeed !== undefined ? feedbackData.subscribedToFreeNewsFeed : null},
                    ${now}
                )
                ON CONFLICT (email) 
                DO UPDATE SET
                    payment_intent_in_months = COALESCE(EXCLUDED.payment_intent_in_months, user_feedback.payment_intent_in_months),
                    user_feedback = COALESCE(EXCLUDED.user_feedback, user_feedback.user_feedback),
                    subscribed_to_free_news_feed = COALESCE(EXCLUDED.subscribed_to_free_news_feed, user_feedback.subscribed_to_free_news_feed)
            `;
            
            logger.info(`✅ Feedback saved to Vercel Postgres for: ${feedbackData.email}`);
            return { success: true };
        } catch (error) {
            logger.error(`❌ Failed to save feedback to Vercel Postgres: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get subscription status for a user
     * @param {string} email - User email
     * @returns {Promise<boolean>} True if subscribed, false otherwise
     */
    async getSubscriptionStatus(email) {
        try {
            const result = await this.sql`
                SELECT subscribed_to_free_news_feed 
                FROM user_feedback 
                WHERE email = ${email}
            `;
            
            if (result.length === 0) {
                return false;
            }
            
            return result[0].subscribed_to_free_news_feed === true;
        } catch (error) {
            logger.error(`❌ Failed to get subscription status: ${error.message}`);
            return false;
        }
    }

    /**
     * Check email access - determines if user can access chat
     * @param {string} email - User email
     * @returns {Promise<Object>} Access check result with exists, paid, canAccess
     */
    async checkEmailAccess(email) {
        try {
            logger.info(`🔍 Checking email access for: ${email}`);
            
            const user = await this.getUserByEmail(email);
            
            // If user doesn't exist, allow access (new user)
            if (!user) {
                return {
                    exists: false,
                    paid: false,
                    canAccess: true
                };
            }
            
            // If user exists and has paid, allow access
            if (user.paid === true) {
                return {
                    exists: true,
                    paid: true,
                    canAccess: true
                };
            }
            
            // If user exists but hasn't paid, block access
            return {
                exists: true,
                paid: false,
                canAccess: false
            };
        } catch (error) {
            logger.error(`❌ Failed to check email access: ${error.message}`);
            throw error;
        }
    }

    /**
     * Save chat history for a user
     * @param {string} email - User email
     * @param {Array} chatHistory - Chat history array
     * @returns {Promise<Object>} Result object with success status
     */
    async saveChatHistory(email, chatHistory) {
        try {
            if (!email || !chatHistory || !Array.isArray(chatHistory)) {
                logger.warn(`⚠️ Invalid chat history data for: ${email}`);
                return { success: false, error: 'Invalid chat history data' };
            }
            
            logger.info(`💾 Saving chat history to Vercel Postgres: ${email} (${chatHistory.length} messages)`);
            
            // Update chat_history for user
            await this.sql`
                UPDATE users 
                SET chat_history = ${JSON.stringify(chatHistory)}::jsonb,
                    last_updated = ${new Date().toISOString()}
                WHERE email = ${email}
            `;
            
            logger.info(`✅ Chat history saved to Vercel Postgres for: ${email}`);
            return { success: true };
        } catch (error) {
            logger.error(`❌ Failed to save chat history: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get chat history for a user
     * @param {string} email - User email
     * @returns {Promise<Array|null>} Chat history array or null if not found
     */
    async getChatHistory(email) {
        try {
            const user = await this.getUserByEmail(email);
            
            if (!user || !user.chat_history) {
                return null;
            }
            
            // Parse chat_history if it's a string
            if (typeof user.chat_history === 'string') {
                return JSON.parse(user.chat_history);
            }
            
            return user.chat_history;
        } catch (error) {
            logger.error(`❌ Failed to get chat history: ${error.message}`);
            throw error;
        }
    }
}

module.exports = VercelStorageService;

