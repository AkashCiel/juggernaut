#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const https = require('https');
const { URL } = require('url');
const { logger } = require('../utils/logger-vercel');
const PreLoadService = require('../services/preLoadService');
const NewsDiscoveryService = require('../services/newsDiscoveryService');
const ArticleCuratorService = require('../services/articleCuratorService');
const EmailService = require('../services/emailService');
const VercelStorageService = require('../services/vercelStorageService');
const DiscordService = require('../services/discordService');
const { generateUserId } = require('../utils/userUtils');
const {
    DEFAULT_GENERATED_AT_WINDOW_DAYS,
    PRIMARY_EMAIL
} = require('../config/constants');

const SUMMARY_PATH = path.join(__dirname, '..', 'curation-summary.json');

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

function buildDefaultCutoffs(sections, windowDays = DEFAULT_GENERATED_AT_WINDOW_DAYS) {
    const baseline = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
    return sections.reduce((map, section) => {
        map[section] = baseline;
        return map;
    }, {});
}

async function sendDiscordAlert(message, context = {}) {
    const webhook = process.env.DISCORD_WEBHOOK_URL_CURATION;
    if (!webhook) {
        return;
    }

    try {
        const discord = new DiscordService(webhook);
        await discord.sendWarning(message, context);
    } catch (error) {
        logger.warn(`⚠️ Failed to send Discord alert: ${error.message}`);
    }
}

function writeSummaryFile(summary) {
    try {
        fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));
    } catch (error) {
        logger.warn(`⚠️ Failed to write summary file: ${error.message}`);
    }
}

function postJson(urlString, payload) {
    if (!urlString) return Promise.resolve();
    const data = JSON.stringify(payload);
    const parsedUrl = new URL(urlString);

    const options = {
        method: 'POST',
        hostname: parsedUrl.hostname,
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    if (parsedUrl.port) {
        options.port = parsedUrl.port;
    }

    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            res.on('data', () => {});
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    reject(new Error(`Webhook responded with status ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function notifyPrimaryEmailWebhook() {
    const webhookUrl = process.env.PRIMARY_FEED_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        await postJson(webhookUrl, { message: 'latest feed curated' });
        logger.info('📣 Primary email webhook notified');
    } catch (error) {
        logger.warn(`⚠️ Failed to notify primary email webhook: ${error.message}`);
    }
}

async function runCurationWorkflow({ email, userInterests, isNewUser = true, debug = false }) {
    if (!email || !userInterests) {
        throw new Error('Missing required inputs: email and userInterests');
    }

    if (typeof isNewUser === 'string') {
        isNewUser = isNewUser === 'true';
    }

    if (debug) {
        logger.info('🔧 Debug enabled');
    }

    const preLoadService = new PreLoadService();
    const newsDiscoveryService = new NewsDiscoveryService();
    const articleCuratorService = new ArticleCuratorService();
    const emailService = new EmailService();
    const vercelStorageService = new VercelStorageService();

    const summaries = await preLoadService.fetchSectionSummaries();
    const availableSections = summaries?.sections ? Object.keys(summaries.sections) : ['world'];

    let selectedSections = '';
    let sectionsArray = [];
    let cutoffMap = {};
    let userId = generateUserId(email);
    let effectiveUserInterests = userInterests;
    let existingUser = null;
    let isFirstFeed = isNewUser;

    if (isNewUser) {
        logger.info('🗺️ Mapping user interests to sections...');
        selectedSections = await newsDiscoveryService.mapUserInterestsToSections(userInterests, availableSections);
        logger.info(`✅ Selected sections: ${selectedSections}`);
        sectionsArray = selectedSections.split('|').map(section => section.trim()).filter(Boolean);
        cutoffMap = buildDefaultCutoffs(sectionsArray);
    } else {
        existingUser = await vercelStorageService.getUserByEmail(email);
        if (!existingUser) {
            throw new Error(`Existing user not found for email ${email}`);
        }

        if (existingUser.paid !== true) {
            const skipSummary = {
                email,
                selectedSections: existingUser.selected_sections,
                curatedCount: 0,
                preparedCount: 0,
                status: 'skipped',
                reason: 'User not paid',
                timestamp: new Date().toISOString()
            };
            writeSummaryFile(skipSummary);
            logger.warn(`⏭️ Skipping ${email}: user not paid`);
            return { skipped: true, reason: 'User not paid' };
        }

        userId = existingUser.user_id;
        selectedSections = existingUser.selected_sections;
        if (!selectedSections) {
            throw new Error(`User ${email} has no selected sections saved`);
        }

        sectionsArray = selectedSections.split('|').map(section => section.trim()).filter(Boolean);
        cutoffMap = await vercelStorageService.getLatestSectionCutoffs(userId);
        if (!cutoffMap || Object.keys(cutoffMap).length === 0) {
            cutoffMap = buildDefaultCutoffs(sectionsArray);
        }

        effectiveUserInterests = existingUser.user_interests || userInterests;
        isFirstFeed = false;
    }

    if (sectionsArray.length === 0) {
        throw new Error('No sections available for curation');
    }

    logger.info(`📚 Loading article libraries for ${sectionsArray.length} sections...`);
    await Promise.all(sectionsArray.map(section => preLoadService.fetchArticleLibrary(section)));

    let preparedArticleData;
    try {
        preparedArticleData = preLoadService.prepare_data_for_curation(selectedSections, cutoffMap);
    } catch (error) {
        await sendDiscordAlert(`Curation preparation failed for ${email}`, {
            email,
            error: error.message
        });
        throw error;
    }

    logger.info(`✅ Prepared ${preparedArticleData.articleCount} articles for curation`);

    logger.info('🎯 Curating articles...');
    const curatedArticles = await articleCuratorService.curateFeed(effectiveUserInterests, preparedArticleData);
    logger.info(`✅ Curated ${curatedArticles.length} articles`);

    logger.info('📧 Sending email...');
    const emailResult = await emailService.composeAndSendEmail(email, curatedArticles, selectedSections);
    if (!emailResult.success) {
        logger.warn(`⚠️ Email sending failed: ${emailResult.error}`);
    } else {
        logger.info(`✅ Email sent successfully to: ${email}`);
    }

    const nowIso = new Date().toISOString();
    const sectionCutoffMapToPersist = {};
    preparedArticleData.sectionsData.forEach(sectionData => {
        sectionCutoffMapToPersist[sectionData.section] = sectionData.lastGeneratedAt;
    });

    await vercelStorageService.saveCuratedFeed({
        userId,
        email,
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
        sectionCutoffs: sectionCutoffMapToPersist,
        isFirstFeed,
        createdAt: nowIso
    });

    const userPayload = {
        userId,
        email,
        userInterests: isNewUser ? effectiveUserInterests : null,
        selectedSections: isNewUser ? selectedSections : null,
        paid: existingUser ? existingUser.paid : false,
        chatHistory: isNewUser ? [] : null,
        isFirstConversationComplete: isNewUser ? true : existingUser?.is_first_conversation_complete === true,
        createdAt: existingUser?.created_at || nowIso,
        lastUpdated: nowIso,
        lastReportGeneratedAt: nowIso
    };

    await vercelStorageService.createOrUpdateUser(userPayload);
    logger.info(`✅ User data saved to Vercel Postgres for: ${email}`);

    if (email === PRIMARY_EMAIL) {
        await notifyPrimaryEmailWebhook();
    }

    const summary = {
        email,
        selectedSections,
        curatedCount: curatedArticles.length,
        preparedCount: preparedArticleData.articleCount,
        timestamp: nowIso
    };
    writeSummaryFile(summary);
    logger.info('✅ Curation workflow completed');

    return { success: true };
}

if (require.main === module) {
    const args = parseArgs(process.argv);
    const { email, userInterests, isNewUser = 'true', debug } = args;
    if (!email || !userInterests) {
        console.error('Missing required args: --email and --userInterests');
        process.exit(1);
    }

    runCurationWorkflow({ email, userInterests, isNewUser, debug: debug === 'true' })
        .then(result => {
            if (result?.skipped) {
                logger.info(`⏭️ Workflow skipped: ${result.reason}`);
                process.exit(0);
            }
            process.exit(0);
        })
        .catch(err => {
            logger.error(`❌ Curation workflow failed: ${err.message}`);
            process.exit(1);
        });
}

module.exports = { runCurationWorkflow };
