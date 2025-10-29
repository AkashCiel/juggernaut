const https = require('https');
const {
    SECTION_SUMMARY_MODEL,
    SYSTEM_PROMPT,
    OPENAI_TEMPERATURE,
    ARTICLES_TO_ANALYZE,
    GITHUB_REPO_OWNER,
    GITHUB_REPO_NAME,
    GITHUB_BRANCH,
    LIBRARY_PATH_PREFIX,
    DELAY_BETWEEN_SECTIONS_MS
} = require('../config/constants');

/**
 * SectionSummaryGenerator - Generates section summaries using OpenAI
 */
class SectionSummaryGenerator {
    constructor() {
        this.githubToken = process.env.GITHUB_TOKEN;
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        
        if (!this.githubToken) {
            throw new Error('GITHUB_TOKEN environment variable not set');
        }
        if (!this.openaiApiKey) {
            throw new Error('OPENAI_API_KEY environment variable not set');
        }
    }
    
    /**
     * Fetch section library from GitHub (juggernaut-reports repo)
     * @param {string} section - Section name (e.g., 'technology')
     * @returns {Promise<Object>} - Library object
     */
    async fetchSectionLibrary(section) {
        const path = `${LIBRARY_PATH_PREFIX}${section}.json`;
        const url = `/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${path}?ref=${GITHUB_BRANCH}`;
        
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                path: url,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.githubToken}`,
                    'User-Agent': 'Node.js',
                    'Accept': 'application/vnd.github.v3+json'
                }
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`GitHub API returned ${res.statusCode} for ${section}: ${data}`));
                        return;
                    }
                    
                    try {
                        const json = JSON.parse(data);
                        // Decode base64 content
                        const content = Buffer.from(json.content, 'base64').toString('utf8');
                        const library = JSON.parse(content);
                        resolve(library);
                    } catch (e) {
                        reject(new Error(`Failed to parse library for ${section}: ${e.message}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.end();
        });
    }
    
    /**
     * Generate summary for a single section using OpenAI
     * @param {string} section - Section name
     * @returns {Promise<Object>} - Summary result with metadata
     */
    async generateSummary(section) {
        console.log(`\n📚 Processing section: ${section}`);
        
        try {
            // Step 1: Fetch library
            console.log(`   Fetching library from GitHub...`);
            const library = await this.fetchSectionLibrary(section);
            
            console.log(`   ✅ Loaded: ${library.articles.length} articles`);
            
            // Step 2: Take top N articles
            const articlesToAnalyze = library.articles.slice(0, ARTICLES_TO_ANALYZE);
            const actualCount = articlesToAnalyze.length;
            
            console.log(`   Analyzing top ${actualCount} articles`);
            
            // Step 3: Format prompt
            const articleTexts = articlesToAnalyze.map((article, index) => {
                return `${index + 1}. ${article.summary}`;
            }).join('\n\n');
            
            // Step 4: Call OpenAI
            console.log(`   Generating summary with ${SECTION_SUMMARY_MODEL}...`);
            const startTime = Date.now();
            
            const openaiResult = await this.callOpenAI(articleTexts);
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`   ✅ Generated (${duration}s, ${openaiResult.tokens.total_tokens} tokens)`);
            
            // Step 5: Build result
            return {
                section,
                summary: openaiResult.summary,
                article_count: actualCount,
                date_range: library.metadata.date_range,
                tokens_used: openaiResult.tokens.total_tokens,
                generated_at: new Date().toISOString()
            };
            
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Generate summaries for multiple sections with delays
     * @param {string[]} sections - Array of section names
     * @returns {Promise<Object>} - { successful: [...], failed: [...] }
     */
    async generateSummaries(sections) {
        const successful = [];
        const failed = [];
        
        console.log(`\n📊 Generating summaries for ${sections.length} sections\n`);
        
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            console.log(`[${i + 1}/${sections.length}] ${section}`);
            
            try {
                const result = await this.generateSummary(section);
                successful.push(result);
            } catch (error) {
                console.error(`   ❌ Error: ${error.message}`);
                failed.push({ section, error: error.message });
            }
            
            // Add delay between sections (except after the last one)
            if (i < sections.length - 1) {
                const delaySec = DELAY_BETWEEN_SECTIONS_MS / 1000;
                console.log(`\n⏳ Waiting ${delaySec}s before next section...\n`);
                await this.sleep(DELAY_BETWEEN_SECTIONS_MS);
            }
        }
        
        return { successful, failed };
    }
    
    /**
     * Call OpenAI API to generate section summary
     * @param {string} articleTexts - Formatted article summaries
     * @returns {Promise<Object>} - { summary, tokens }
     */
    async callOpenAI(articleTexts) {
        const requestData = {
            model: SECTION_SUMMARY_MODEL,
            messages: [
                {
                    role: 'system',
                    content: SYSTEM_PROMPT
                },
                {
                    role: 'user',
                    content: articleTexts
                }
            ],
            temperature: OPENAI_TEMPERATURE
        };
        
        const data = JSON.stringify(requestData);
        
        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.openaiApiKey}`,
                'Content-Length': Buffer.byteLength(data)
            }
        };
        
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const json = JSON.parse(responseData);
                        if (json.error) {
                            reject(new Error(`OpenAI API error: ${json.error.message}`));
                        } else {
                            const summary = json.choices[0].message.content.trim();
                            resolve({
                                summary,
                                tokens: json.usage
                            });
                        }
                    } catch (e) {
                        reject(new Error(`Failed to parse OpenAI response: ${e.message}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }
    
    /**
     * Sleep utility
     * @param {number} ms - Milliseconds to sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = SectionSummaryGenerator;

