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

            const chatHistoryJson = userData.chatHistory ? JSON.stringify(userData.chatHistory) : null;

            await this.sql`
                INSERT INTO users (
                    user_id,
                    email,
                    user_interests,
                    selected_sections,
                    paid,
                    chat_history,
                    is_first_conversation_complete,
                    created_at,
                    last_updated,
                    last_report_generated_at
                ) VALUES (
                    ${userData.userId},
                    ${userData.email},
                    ${userData.userInterests || null},
                    ${userData.selectedSections || null},
                    ${userData.paid ?? false},
                    ${chatHistoryJson}::jsonb,
                    ${userData.isFirstConversationComplete === true},
                    ${userData.createdAt},
                    ${userData.lastUpdated},
                    ${userData.lastReportGeneratedAt || null}
                )
                ON CONFLICT (user_id)
                DO UPDATE SET
                    email = EXCLUDED.email,
                    user_interests = COALESCE(EXCLUDED.user_interests, users.user_interests),
                    selected_sections = COALESCE(EXCLUDED.selected_sections, users.selected_sections),
                    paid = COALESCE(EXCLUDED.paid, users.paid),
                    chat_history = COALESCE(EXCLUDED.chat_history, users.chat_history),
                    is_first_conversation_complete = CASE
                        WHEN EXCLUDED.is_first_conversation_complete = true THEN true
                        ELSE users.is_first_conversation_complete
                    END,
                    last_report_generated_at = COALESCE(EXCLUDED.last_report_generated_at, users.last_report_generated_at),
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
            if (typeof user.chat_history === 'string') {
                user.chat_history = JSON.parse(user.chat_history);
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
            if (typeof user.chat_history === 'string') {
                user.chat_history = JSON.parse(user.chat_history);
            }

            return user;
        } catch (error) {
            logger.error(`❌ Failed to get user by email: ${error.message}`);
            throw error;
        }
    }

    /**
     * Save curated feed row
     * @param {Object} feedData
     */
    async saveCuratedFeed(feedData) {
        const {
            userId,
            email,
            curatedArticles,
            articleCount,
            sectionCutoffs,
            isFirstFeed,
            createdAt
        } = feedData;

        try {
            await this.sql`
                INSERT INTO curated_feeds (
                    user_id,
                    email,
                    curated_articles,
                    article_count,
                    section_cutoffs,
                    is_first_feed,
                    created_at
                ) VALUES (
                    ${userId},
                    ${email},
                    ${JSON.stringify(curatedArticles)}::jsonb,
                    ${articleCount},
                    ${JSON.stringify(sectionCutoffs || {})}::jsonb,
                    ${isFirstFeed === true},
                    ${createdAt || new Date().toISOString()}
                )
            `;
        } catch (error) {
            logger.error(`❌ Failed to save curated feed for ${email}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get latest section cutoff map for a user
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    async getLatestSectionCutoffs(userId) {
        try {
            const result = await this.sql`
                SELECT section_cutoffs
                FROM curated_feeds
                WHERE user_id = ${userId}
                ORDER BY created_at DESC
                LIMIT 1
            `;

            if (result.length === 0) {
                return {};
            }

            const row = result[0];
            if (!row.section_cutoffs) {
                return {};
            }

            if (typeof row.section_cutoffs === 'string') {
                return JSON.parse(row.section_cutoffs);
            }

            return row.section_cutoffs;
        } catch (error) {
            logger.error(`❌ Failed to fetch section cutoffs: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get the latest curated feed for a user
     * @param {string} userId
     * @returns {Promise<Object|null>}
     */
    async getLatestCuratedFeed(userId) {
        try {
            const result = await this.sql`
                SELECT *
                FROM curated_feeds
                WHERE user_id = ${userId}
                ORDER BY created_at DESC
                LIMIT 1
            `;

            if (result.length === 0) {
                return null;
            }

            const row = result[0];
            if (typeof row.curated_articles === 'string') {
                row.curated_articles = JSON.parse(row.curated_articles);
            }
            if (typeof row.section_cutoffs === 'string') {
                row.section_cutoffs = JSON.parse(row.section_cutoffs);
            }
            return row;
        } catch (error) {
            logger.error(`❌ Failed to fetch latest curated feed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all paid users
     * @returns {Promise<Array>}
     */
    async getPaidUsers() {
        try {
            const result = await this.sql`
                SELECT user_id, email, user_interests, selected_sections
                FROM users
                WHERE paid = true
                ORDER BY last_report_generated_at NULLS FIRST, created_at ASC
            `;

            return result;
        } catch (error) {
            logger.error(`❌ Failed to fetch paid users: ${error.message}`);
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
     * @returns {Promise<Object>} Access check result with exists, paid, canAccess, isFirstConversationComplete
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
                    canAccess: true,
                    isFirstConversationComplete: false
                };
            }

            // Existing users cannot re-enter chat for now
            return {
                exists: true,
                paid: user.paid === true,
                canAccess: false,
                isFirstConversationComplete: user.is_first_conversation_complete === true
            };
        } catch (error) {
            logger.error(`❌ Failed to check email access: ${error.message}`);
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

