#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const VercelStorageService = require('../services/vercelStorageService');
const EmailService = require('../services/emailService');
const { logger } = require('../utils/logger-vercel');

// User ID to send email to
const USER_ID = 'akashsingh0762';

async function sendUserEmail() {
    logger.info(`📧 Starting email send for user: ${USER_ID}`);
    
    try {
        // 1. Initialize services
        logger.info('🔧 Initializing services...');
        const vercelStorageService = new VercelStorageService();
        const emailService = new EmailService();
        
        // Check if email service is initialized
        if (!emailService.isInitialized) {
            logger.error('❌ Email service not initialized. Please check MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables.');
            process.exit(1);
        }
        
        // 2. Fetch user from database
        logger.info(`📥 Fetching user data for user_id: ${USER_ID}...`);
        const user = await vercelStorageService.getUserById(USER_ID);
        
        if (!user) {
            logger.error(`❌ User not found: ${USER_ID}`);
            process.exit(1);
        }
        
        logger.info(`✅ User found: ${user.email}`);
        
        // 3. Validate user data
        if (!user.email) {
            logger.error('❌ User email is missing');
            process.exit(1);
        }
        
        if (!user.curated_articles || !Array.isArray(user.curated_articles) || user.curated_articles.length === 0) {
            logger.error('❌ User has no curated articles to send');
            logger.info(`   curated_articles: ${user.curated_articles ? 'exists but empty' : 'missing'}`);
            process.exit(1);
        }
        
        if (!user.selected_sections) {
            logger.error('❌ User has no selected sections');
            process.exit(1);
        }
        
        logger.info(`✅ User data validated:`);
        logger.info(`   Email: ${user.email}`);
        logger.info(`   Curated articles: ${user.curated_articles.length}`);
        logger.info(`   Selected sections: ${user.selected_sections}`);
        
        // 4. Send email
        logger.info(`📧 Composing and sending email to ${user.email}...`);
        const result = await emailService.composeAndSendEmail(
            user.email,
            user.curated_articles,
            user.selected_sections
        );
        
        // 5. Log results
        if (result.success) {
            logger.info(`✅ Email sent successfully!`);
            if (result.messageId) {
                logger.info(`   Message ID: ${result.messageId}`);
            }
        } else {
            logger.error(`❌ Email sending failed: ${result.error}`);
            process.exit(1);
        }
        
        logger.info(`✅ Script completed successfully!`);
        
    } catch (error) {
        logger.error(`❌ Script failed: ${error.message}`);
        logger.error(error.stack);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    sendUserEmail()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            logger.error(`❌ Script failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { sendUserEmail };

