const { logger, logApiCall } = require('../utils/logger');
const { retry, RETRY_CONFIGS } = require('../utils/retryUtils');
const { sanitizeTopics, sanitizePapers } = require('../utils/sanitizer');
const { validateApiKey, handleArxivError, handleOpenAIError, handleGitHubError, handleMailgunError } = require('../utils/errorHandler');
const ArxivService = require('./arxivService');
const SummaryService = require('./summaryService');
const GuardianService = require('./guardianService');
const NewsProcessingService = require('./newsProcessingService');
const GitHubService = require('./githubService');
const EmailService = require('./emailService');

class ReportGenerator {
    constructor() {
        this.arxivService = new ArxivService();
        this.summaryService = new SummaryService();
        this.guardianService = new GuardianService();
        this.newsProcessingService = new NewsProcessingService();
        this.githubService = new GitHubService();
        this.emailService = new EmailService();
    }

    /**
     * Generate a complete report for given user and topics
     * @param {string} userEmail - User's email address
     * @param {Array} topics - Research topics
     * @param {Object} options - Additional options
     * @param {number} options.maxPapers - Maximum papers to fetch (default: 50)
     * @param {boolean} options.isDemoMode - Demo mode flag (default: false)
     * @returns {Promise<Object>} Complete report result
     */
    async generateReport(userEmail, topics, options = {}) {
        const { maxPapers = 50, isDemoMode = false } = options;
        
        logger.info(`🚀 Generating report for ${userEmail} with topics: ${topics.join(', ')}`);
        
        try {
            // Sanitize inputs
            const sanitizedTopics = sanitizeTopics(topics);
            const sanitizedMaxPapers = Math.min(Math.max(parseInt(maxPapers) || 50, 1), 100);
            
            // Step 1: Fetch papers and generate summaries per topic
            logger.info('📚 Fetching papers and generating summaries per topic...');
            logApiCall('arxiv', 'fetchPapers', { topics: sanitizedTopics, maxPapers: sanitizedMaxPapers });
            
            let allPapers = [];
            let topicSummaries = [];
            
            for (const topic of sanitizedTopics) {
                try {
                    // Fetch papers for this specific topic
                    logger.info(`📚 Fetching papers for topic: ${topic}`);
                    const topicPapers = await retry(
                        () => this.arxivService.fetchPapers([topic], sanitizedMaxPapers),
                        RETRY_CONFIGS.arxiv
                    );
                    const sanitizedTopicPapers = sanitizePapers(topicPapers);
                    
                    if (sanitizedTopicPapers.length > 0) {
                        allPapers.push(...sanitizedTopicPapers);
                        
                        // Generate summary for this topic immediately
                        if (!isDemoMode) {
                            logger.info(`🤖 Generating summary for topic: ${topic}`);
                            try {
                                validateApiKey(process.env.OPENAI_API_KEY, 'OpenAI');
                                const topicSummary = await retry(
                                    () => this.summaryService.generateSummaryForTopic(sanitizedTopicPapers, topic, process.env.OPENAI_API_KEY, 60000),
                                    RETRY_CONFIGS.openai
                                );
                                
                                if (topicSummary) {
                                    topicSummaries.push(topicSummary);
                                    logApiCall('openai', 'generateTopicSummary', { 
                                        topic: topic,
                                        papersCount: sanitizedTopicPapers.length 
                                    });
                                }
                            } catch (error) {
                                logger.error(`❌ Error generating summary for topic "${topic}": ${error.message}`);
                                handleOpenAIError(error);
                            }
                        }
                    } else {
                        logger.warn(`⚠️ No papers found for topic: ${topic}`);
                    }
                } catch (error) {
                    logger.error(`❌ Error fetching papers for topic "${topic}": ${error.message}`);
                    handleArxivError(error, topic);
                }
            }
            
            if (allPapers.length === 0) {
                throw new Error('No papers found for any of the specified topics');
            }
            
            // Combine all topic summaries into one
            let aiSummary = null;
            if (topicSummaries.length > 0) {
                aiSummary = this.summaryService.combineTopicSummaries(topicSummaries);
            }

            // Step 2: Fetch Guardian news and generate per-article summaries
            let newsByTopic = [];
            try {
                if (process.env.GUARDIAN_API_KEY) {
                    logger.info('📰 Fetching Guardian news by topic...');
                    const now = new Date();
                    const from = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
                    const fromDate = from.toISOString().slice(0, 10);
                    const toDate = now.toISOString().slice(0, 10);
                    const { articlesByTopic } = await this.guardianService.fetchArticles(sanitizedTopics, {
                        fromDate,
                        toDate,
                        pageSize: 10,
                        orderBy: 'newest',
                        section: 'technology',
                        includeBodyText: true
                    });

                    for (const group of articlesByTopic) {
                        const summaries = await this.newsProcessingService.process('perArticleFiveSentences', group.articles, {
                            maxArticles: group.articles.length,
                            maxInputChars: 1600,
                            apiKey: process.env.OPENAI_API_KEY,
                            timeoutMs: 60000
                        });
                        newsByTopic.push({ topic: group.topic, articles: group.articles, perArticleSummaries: summaries });
                    }
                } else {
                    logger.warn('⚠️ GUARDIAN_API_KEY not set. Skipping news fetch.');
                }
            } catch (error) {
                logger.warn(`⚠️ Guardian news integration failed: ${error.message}`);
            }

            // Step 3: Prepare report data
            const reportDate = new Date().toISOString().split('T')[0];
            const reportData = {
                date: reportDate,
                topics: sanitizedTopics,
                papers: allPapers,
                aiSummary: aiSummary,
                news: newsByTopic
            };

            // Step 4: Upload report to GitHub (skip in demo mode)
            let uploadResult = null;
            if (!isDemoMode) {
                logger.info('📤 Uploading report to GitHub...');
                try {
                    validateApiKey(process.env.GITHUB_TOKEN, 'GitHub');
                    uploadResult = await retry(
                        () => this.githubService.uploadReport(reportData, process.env.GITHUB_TOKEN, [userEmail]),
                        RETRY_CONFIGS.github
                    );
                    logApiCall('github', 'uploadReport', { reportDate, userEmail });
                    
                    // ✅ Fix: Add pagesUrl to reportData for email service
                    if (uploadResult && uploadResult.pagesUrl) {
                        reportData.pagesUrl = uploadResult.pagesUrl;
                    }
                } catch (error) {
                    handleGitHubError(error);
                }
            } else {
                logger.warn('⚠️ Skipping GitHub upload in demo mode');
            }

            // Step 5: Send email (skip in demo mode)
            let emailResult = null;
            if (!isDemoMode) {
                logger.info('📧 Sending email...');
                try {
                    validateApiKey(process.env.MAILGUN_API_KEY, 'Mailgun');
                    validateApiKey(process.env.MAILGUN_DOMAIN, 'Mailgun Domain');
                    
                    this.emailService.initialize(process.env.MAILGUN_API_KEY, process.env.MAILGUN_DOMAIN);
                    emailResult = await retry(
                        () => this.emailService.sendEmail(reportData, sanitizedTopics, [userEmail], new Date()),
                        RETRY_CONFIGS.email
                    );
                    logApiCall('mailgun', 'sendEmail', { recipientsCount: 1 });
                } catch (error) {
                    logger.error('❌ Email service error:', {
                        message: error.message,
                        stack: error.stack
                    });
                    handleMailgunError(error);
                }
            } else {
                logger.warn('⚠️ Skipping email in demo mode');
            }

            logger.info(`✅ Report generation completed for ${userEmail}`);
            
            return {
                success: true,
                data: reportData,
                uploadResult,
                emailResult,
                papersCount: allPapers.length,
                hasAISummary: !!aiSummary,
                reportUrl: uploadResult?.pagesUrl || null,
                emailSent: !!emailResult
            };

        } catch (error) {
            logger.error(`❌ Report generation failed for ${userEmail}: ${error.message}`);
            return {
                success: false,
                error: error.message,
                userEmail,
                topics
            };
        }
    }
}

module.exports = ReportGenerator; 