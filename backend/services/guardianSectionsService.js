const https = require('https');
const { logger, logApiCall } = require('../utils/logger');
const { retry, RETRY_CONFIGS } = require('../utils/retryUtils');
const GitHubService = require('./githubService');

/**
 * Service for managing Guardian API sections cache
 * Fetches sections from Guardian API and uploads to GitHub for persistence
 */
class GuardianSectionsService {
    constructor() {
        this.guardianApiKey = process.env.GUARDIAN_API_KEY;
        this.githubService = new GitHubService();
        this.sectionsApiUrl = 'https://content.guardianapis.com/sections';
    }

    /**
     * Get Guardian sections - fetches fresh from API and uploads to GitHub
     * @returns {Promise<Array>} Array of section names
     */
    async getSections() {
        logger.info('🔄 Fetching Guardian sections from API...');
        
        try {
            // Fetch fresh sections from Guardian API
            const sections = await this.fetchFromGuardianAPI();
            
            // Upload to GitHub for persistence
            await this.uploadSectionsToGitHub(sections);
            
            logger.info(`✅ Guardian sections updated: ${sections.length} sections`);
            return sections;
            
        } catch (error) {
            logger.error('❌ Failed to get Guardian sections:', error.message);
            throw error;
        }
    }

    /**
     * Fetch sections from Guardian API
     * @returns {Promise<Array>} Array of section names
     */
    async fetchFromGuardianAPI() {
        const url = `${this.sectionsApiUrl}?api-key=${this.guardianApiKey}`;
        
        logApiCall('guardian', 'fetchSections', { url: this.sectionsApiUrl });
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Guardian sections API timeout')), 30000);
            
            https.get(url, (res) => {
                clearTimeout(timeout);
                
                if (res.statusCode !== 200) {
                    reject(new Error(`Guardian sections API returned status ${res.statusCode}`));
                    return;
                }
                
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        const sections = json?.response?.results || [];
                        
                        // Extract section names
                        const sectionNames = sections.map(section => section.id);
                        
                        logger.info(`📊 Fetched ${sectionNames.length} sections from Guardian API`);
                        resolve(sectionNames);
                        
                    } catch (e) {
                        reject(new Error(`Failed to parse Guardian sections response: ${e.message}`));
                    }
                });
            }).on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    /**
     * Upload sections to GitHub using existing GitHubService
     * @param {Array} sections - Array of section names
     * @returns {Promise<Object>} Upload result
     */
    async uploadSectionsToGitHub(sections) {
        logger.info('📤 Uploading Guardian sections to GitHub...');
        
        const sectionsData = {
            sections: sections,
            lastUpdated: new Date().toISOString(),
            source: 'guardian-api',
            count: sections.length
        };

        try {
            // Use existing GitHubService.uploadUsersJsonFile method
            // We'll adapt it for sections data
            const result = await this.uploadSectionsJsonFile(
                sectionsData,
                process.env.GITHUB_TOKEN,
                'Update Guardian sections cache'
            );
            
            logger.info(`✅ Guardian sections uploaded to GitHub: ${result.fileUrl}`);
            return result;
            
        } catch (error) {
            logger.error('❌ Failed to upload Guardian sections to GitHub:', error.message);
            throw error;
        }
    }

    /**
     * Upload sections JSON file to GitHub (adapted from uploadUsersJsonFile)
     * @param {Object} sectionsData - The sections data to upload
     * @param {string} githubToken - GitHub personal access token
     * @param {string} commitMessage - Commit message
     * @returns {Promise<Object>} Upload result
     */
    async uploadSectionsJsonFile(sectionsData, githubToken, commitMessage = 'Update Guardian sections cache') {
        logger.info('🚀 Starting uploadSectionsJsonFile');
        const filePath = 'backend/data/guardian-sections.json';
        logger.info(`📁 Target file path: ${filePath}`);
        
        // Prepare content
        const content = JSON.stringify(sectionsData, null, 2);
        const fileContent = Buffer.from(content).toString('base64');
        logger.info(`📦 Prepared sections content with ${sectionsData.sections.length} sections`);
        
        // Get current SHA if file exists
        let sha = undefined;
        try {
            logger.info('📖 Checking if sections file exists on GitHub...');
            const response = await this.githubService.githubApiRequest(
                `/repos/${this.githubService.repoOwner}/${this.githubService.repoName}/contents/${filePath}?ref=${this.githubService.branch}`,
                'GET',
                githubToken
            );
            sha = response.sha;
            logger.info(`🔑 Found existing file with SHA: ${sha.substring(0, 8)}...`);
        } catch (err) {
            if (err.message.includes('404')) {
                logger.info('🆕 Sections file does not exist, will create new file');
            } else {
                logger.error('❌ Error checking sections file existence:', err.message);
                throw err;
            }
        }
        
        // Prepare payload
        const payload = {
            message: commitMessage,
            content: fileContent,
            branch: this.githubService.branch
        };
        if (sha) {
            payload.sha = sha;
            logger.info(`🔑 Using existing SHA: ${sha.substring(0, 8)}...`);
        }
        
        logger.info('📤 Making PUT request to GitHub API...');
        // Upload to GitHub
        const putResponse = await this.githubService.githubApiRequest(
            `/repos/${this.githubService.repoOwner}/${this.githubService.repoName}/contents/${filePath}`,
            'PUT',
            githubToken,
            payload
        );
        
        const fileUrl = `https://github.com/${this.githubService.repoOwner}/${this.githubService.repoName}/blob/${this.githubService.branch}/${filePath}`;
        logger.info(`✅ Successfully uploaded Guardian sections to GitHub: ${fileUrl}`);
        
        logApiCall('github', 'uploadSectionsJsonFile', {
            filePath,
            fileUrl,
            sectionsCount: sectionsData.sections.length
        });
        
        return {
            fileUrl,
            sha: putResponse.content.sha
        };
    }
}

module.exports = GuardianSectionsService;
