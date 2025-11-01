const https = require('https');
const { logger, logApiCall } = require('../utils/logger-vercel');
const { CHAT_SYSTEM_PROMPT} = require('../config/constants');
const OpenAIClient = require('../utils/openaiClient');

class NewsDiscoveryService {
    constructor() {
        this.systemPrompt = CHAT_SYSTEM_PROMPT;
        this.openaiClient = new OpenAIClient();
        this.sectionSummaries = null;
        this.fetchPromise = null; // Track in-progress fetch
        this.summariesUrl = 'https://raw.githubusercontent.com/AkashCiel/juggernaut-reports/main/backend/data/functional_section_summaries.json';
    }








    /**
     * Fetch section summaries from GitHub
     * @returns {Promise<Object|null>} Section summaries object or null if fetch fails
     */
    async fetchSectionSummaries() {
        // If fetch is already in progress, return the existing promise
        if (this.fetchPromise) {
            return this.fetchPromise;
        }

        // If summaries are already loaded, return them immediately
        if (this.sectionSummaries) {
            return this.sectionSummaries;
        }

        // Start new fetch
        this.fetchPromise = new Promise((resolve) => {
            const timeout = setTimeout(() => {
                logger.warn(`⚠️ GitHub request timeout for section summaries`);
                this.fetchPromise = null; // Clear promise so we can retry later
                resolve(null);
            }, 10000);
            
            https.get(this.summariesUrl, (res) => {
                clearTimeout(timeout);
                
                if (res.statusCode !== 200) {
                    logger.warn(`⚠️ GitHub returned status ${res.statusCode} for section summaries`);
                    this.fetchPromise = null; // Clear promise so we can retry later
                    resolve(null);
                    return;
                }
                
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const summaries = JSON.parse(data);
                        this.sectionSummaries = summaries;
                        this.fetchPromise = null; // Clear promise after successful fetch
                        logger.info(`✅ Loaded section summaries from GitHub`);
                        resolve(summaries);
                    } catch (e) {
                        logger.error(`❌ Failed to parse section summaries: ${e.message}`);
                        this.fetchPromise = null; // Clear promise so we can retry later
                        resolve(null);
                    }
                });
            }).on('error', (err) => {
                clearTimeout(timeout);
                logger.error(`❌ Failed to fetch section summaries: ${err.message}`);
                this.fetchPromise = null; // Clear promise so we can retry later
                resolve(null);
            });
        });

        return this.fetchPromise;
    }

    /**
     * Map user interests to Guardian sections using AI
     * @param {string} user_interests - User's interests description
     * @param {Array<string>} sections - Array of available Guardian sections
     * @returns {Promise<string>} Pipe-separated string of relevant sections
     */
    async mapUserInterestsToSections(user_interests, sections) {
        const { SECTION_MAPPING_PROMPT } = require('../config/constants');

        // Wait for fetch to complete if it's in progress
        if (this.fetchPromise && !this.sectionSummaries) {
            logger.info('⏳ Waiting for section summaries to load...');
            await this.fetchPromise;
        }

        // Build user message with section summaries if available
        let userMessage = `This is a short summary of the user's interests: ${user_interests}.`;
        
        if (this.sectionSummaries && this.sectionSummaries.sections) {
            // Format section summaries for the prompt
            const summariesText = Object.entries(this.sectionSummaries.sections)
                .map(([sectionName, sectionData]) => {
                    const summary = sectionData.summary || 'No summary available';
                    return `${sectionName}:\n${summary}`;
                })
                .join('\n\n');
            
            userMessage += `\n\nHere are detailed summaries of what each section covers:\n\n${summariesText}`;
        }

        const messages = [
            {
                role: 'system',
                content: SECTION_MAPPING_PROMPT
            },
            {
                role: 'user',
                content: userMessage
            }
        ];

        try {
            const result = await this.openaiClient.callOpenAI(messages);
            return result.trim();
        } catch (error) {
            logger.error(`❌ Failed to map topics to sections: ${error.message}`);
            // Fallback to generic sections
            return 'news|world';
        }
    }

}

module.exports = NewsDiscoveryService;

