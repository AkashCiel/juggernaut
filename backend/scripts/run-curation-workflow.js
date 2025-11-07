#!/usr/bin/env node
const path = require('path');
const { logger } = require('../utils/logger-vercel');
const PreLoadService = require('../services/preLoadService');
const NewsDiscoveryService = require('../services/newsDiscoveryService');
const ArticleCuratorService = require('../services/articleCuratorService');
const EmailService = require('../services/emailService');
const VercelStorageService = require('../services/vercelStorageService');
const { generateUserId } = require('../utils/userUtils');

function parseArgs(argv) {
    const args = {};
    for (let i = 2; i < argv.length; i += 2) {
        const key = argv[i];
        const val = argv[i + 1];
        if (!key) continue;
        const norm = key.replace(/^--/, '');
        args[norm] = val;
    }
    return args;
}

(async () => {
    const { email, userInterests, debug } = parseArgs(process.argv);
    if (!email || !userInterests) {
        console.error('Missing required args: --email and --userInterests');
        process.exit(1);
    }

    try {
        if (debug === 'true') {
            logger.info(`🔧 Debug enabled`);
        }

        const preLoadService = new PreLoadService();
        const newsDiscoveryService = new NewsDiscoveryService();
        const articleCuratorService = new ArticleCuratorService();
        const emailService = new EmailService();
        const vercelStorageService = new VercelStorageService();

        logger.info('📥 Fetching section summaries...');
        const summaries = await preLoadService.fetchSectionSummaries();
        let sections;
        if (!summaries || !summaries.sections) {
            logger.warn(`⚠️ Section summaries unavailable, falling back to minimal sections: world`);
            sections = ['world'];
        } else {
            sections = Object.keys(summaries.sections);
        }

        logger.info('🗺️ Mapping user interests to sections...');
        const selectedSections = await newsDiscoveryService.mapUserInterestsToSections(userInterests, sections);
        logger.info(`✅ Selected sections: ${selectedSections}`);

        const selectedList = (selectedSections || '')
            .split('|')
            .map(s => s.trim())
            .filter(Boolean);
        if (selectedList.length > 0) {
            logger.info(`📚 Loading article libraries for ${selectedList.length} sections...`);
            await Promise.all(selectedList.map(section => preLoadService.fetchArticleLibrary(section)));
        }

        logger.info('🔧 Preparing article data for curation...');
        const preparedArticleData = preLoadService.prepare_data_for_curation(selectedSections);
        logger.info(`✅ Prepared ${preparedArticleData.articleCount} articles for curation`);

        logger.info('🎯 Curating articles...');
        const curatedArticles = await articleCuratorService.curateFeed(userInterests, preparedArticleData);
        logger.info(`✅ Curated ${curatedArticles.length} articles`);

        logger.info('📧 Sending email...');
        const emailResult = await emailService.composeAndSendEmail(email, curatedArticles, selectedSections);
        if (!emailResult.success) {
            logger.warn(`⚠️ Email sending failed: ${emailResult.error}`);
        } else {
            logger.info(`✅ Email sent successfully to: ${email}`);
        }

        logger.info('💾 Saving user data to Vercel Postgres...');
        const userId = generateUserId(email);
        const userData = {
            userId: userId,
            email: email,
            userInterests: userInterests,
            selectedSections: selectedSections,
            curatedArticles: curatedArticles.map(article => ({
                id: article.id,
                title: article.title,
                webUrl: article.webUrl,
                trailText: article.trailText,
                relevanceScore: article.relevanceScore,
                section: article.section || (article.id ? article.id.split('/')[0] : 'unknown'),
                publishedDate: article.publishedDate
            })),
            articleCount: curatedArticles.length,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        try {
            await vercelStorageService.createOrUpdateUser(userData);
            logger.info(`✅ User data saved to Vercel Postgres for: ${email}`);
        } catch (error) {
            logger.error(`❌ Failed to save user data to Vercel Postgres: ${error.message}`);
            // Don't fail the entire workflow if storage fails
        }

        // Emit summary for artifact
        const summary = {
            email,
            selectedSections,
            curatedCount: curatedArticles.length,
            preparedCount: preparedArticleData.articleCount,
            timestamp: new Date().toISOString()
        };
        const fs = require('fs');
        fs.writeFileSync(path.join(__dirname, '..', 'curation-summary.json'), JSON.stringify(summary, null, 2));
        logger.info('✅ Curation workflow completed');
    } catch (err) {
        logger.error(`❌ Curation workflow failed: ${err.message}`);
        process.exit(1);
    }
})();


