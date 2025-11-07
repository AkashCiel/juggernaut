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
                    created_at,
                    last_updated
                ) VALUES (
                    ${userData.userId},
                    ${userData.email},
                    ${userData.userInterests},
                    ${userData.selectedSections},
                    ${JSON.stringify(userData.curatedArticles)}::jsonb,
                    ${userData.articleCount},
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
     * @param {number} feedbackData.paymentIntentInMonths - Payment intent in months (1 or 6)
     * @param {string|null} feedbackData.userFeedback - Optional user feedback text
     * @returns {Promise<Object>} Result object with success status
     */
    async saveFeedback(feedbackData) {
        try {
            logger.info(`💾 Saving feedback to Vercel Postgres: ${feedbackData.email}`);
            
            const now = new Date().toISOString();
            
            // Insert feedback record
            await this.sql`
                INSERT INTO user_feedback (
                    email,
                    payment_intent_in_months,
                    user_feedback,
                    created_at
                ) VALUES (
                    ${feedbackData.email},
                    ${feedbackData.paymentIntentInMonths},
                    ${feedbackData.userFeedback || null},
                    ${now}
                )
            `;
            
            logger.info(`✅ Feedback saved to Vercel Postgres for: ${feedbackData.email}`);
            return { success: true };
        } catch (error) {
            logger.error(`❌ Failed to save feedback to Vercel Postgres: ${error.message}`);
            throw error;
        }
    }
}

module.exports = VercelStorageService;

