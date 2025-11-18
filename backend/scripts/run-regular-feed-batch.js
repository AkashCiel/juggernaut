#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { logger } = require('../utils/logger-vercel');
const VercelStorageService = require('../services/vercelStorageService');
const { runCurationWorkflow } = require('./run-curation-workflow');

async function runBatch() {
    const vercelStorageService = new VercelStorageService();
    const paidUsers = await vercelStorageService.getPaidUsers();

    logger.info(`👥 Found ${paidUsers.length} paid users to process`);

    for (const user of paidUsers) {
        const email = user.email;
        const interests = user.user_interests;
        
        if (!interests) {
            logger.warn(`⚠️ Skipping ${email}: missing user_interests`);
            continue;
        }

        logger.info(`🚀 Starting regular feed curation for ${email}`);
        try {
            const result = await runCurationWorkflow({
                email,
                userInterests: interests,
                isNewUser: false
            });

            if (result?.skipped) {
                logger.info(`⏭️ Skipped ${email}: ${result.reason}`);
            } else {
                logger.info(`✅ Completed curation for ${email}`);
            }
        } catch (error) {
            logger.error(`❌ Failed to curate feed for ${email}: ${error.message}`);
        }
    }

    logger.info('🏁 Regular feed batch completed');
}

if (require.main === module) {
    runBatch()
        .then(() => process.exit(0))
        .catch(error => {
            logger.error(`❌ Batch failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { runBatch };

