const https = require('https');
const { logger, logApiCall } = require('../utils/logger');
const { handleGitHubError } = require('../utils/errorHandler');
const { sanitizeText, sanitizeHtml } = require('../utils/sanitizer');
const { generateUserIdFromRecipients } = require('../utils/userUtils');

// Path to user data JSON in the GitHub repository (relative to repo root)
const USER_JSON_GITHUB_PATH = 'backend/data/users.json';

// GitHub Service for uploading reports to GitHub Pages
class GitHubService {
    constructor() {
        this.repository = 'AkashCiel/juggernaut-reports';
        // Get branch from environment variable, default to 'main'
        this.branch = process.env.GITHUB_BRANCH || 'main';
        this.repoOwner = 'AkashCiel';
        this.repoName = 'juggernaut-reports';
    }


    /**
     * Uploads or updates the data/users.json file in the repository
     * @param {Object} usersData - The full users array/object to upload
     * @param {string} githubToken - GitHub personal access token
     * @param {string} [commitMessage] - Optional commit message
     * @returns {Promise<Object>} Upload result
     */
    async uploadUserData(usersData, githubToken, commitMessage = 'Update user data') {
        const filePath = USER_JSON_GITHUB_PATH;
        const content = JSON.stringify(usersData, null, 2);
        const useDirectUpload = process.env.GITHUB_DIRECT_UPLOAD === 'true';
        const branch = this.branch;
        const repoOwner = this.repoOwner;
        const repoName = this.repoName;

        if (useDirectUpload) {
            // Use direct upload logic
            const uploadResult = await uploadReportDirect(
                { html: content, date: 'users', filePathOverride: filePath, commitMessage },
                githubToken,
                branch,
                repoOwner,
                repoName,
                null, // userId not needed
                null, // topics not needed for user data
                null  // apiKey not needed for user data
            );
            logApiCall('github', 'uploadUserDataDirect', {
                filePath,
                fileUrl: uploadResult.fileUrl
            });
            return uploadResult;
        } else {
            // Use PR-based upload logic
            const uploadResult = await uploadReportViaPR(
                { html: content, date: 'users', filePathOverride: filePath, commitMessage },
                githubToken,
                branch,
                repoOwner,
                repoName,
                null, // userId not needed
                null, // topics not needed for user data
                null  // apiKey not needed for user data
            );
            logApiCall('github', 'uploadUserDataViaPR', {
                filePath,
                prUrl: uploadResult.prUrl,
                branchName: uploadResult.branchName
            });
            return uploadResult;
        }
    }

    /**
     * Uploads the complete users.json file to GitHub (overwrites entire file)
     * @param {Array} users - The complete array of users to upload
     * @param {string} githubToken - GitHub personal access token
     * @param {string} [commitMessage] - Optional commit message
     * @returns {Promise<Object>} Upload result
     */
    async uploadUsersJsonFile(users, githubToken, commitMessage = 'Update users.json') {
        logger.info(`🚀 Starting uploadUsersJsonFile with ${users.length} users`);
        const filePath = USER_JSON_GITHUB_PATH;
        logger.info(`📁 Target file path: ${filePath}`);
        
        // Prepare content
        const content = JSON.stringify(users, null, 2);
        const fileContent = Buffer.from(content).toString('base64');
        logger.info(`📦 Prepared content with ${users.length} users`);
        
        // Get current SHA if file exists
        let sha = undefined;
        try {
            logger.info('📖 Checking if file exists on GitHub...');
            const response = await this.githubApiRequest(
                `/repos/${this.repoOwner}/${this.repoName}/contents/${filePath}?ref=${this.branch}`,
                'GET',
                githubToken
            );
            sha = response.sha;
            logger.info(`🔑 Found existing file with SHA: ${sha.substring(0, 8)}...`);
        } catch (err) {
            if (err.message.includes('404')) {
                logger.info('🆕 File does not exist, will create new file');
            } else {
                logger.error('❌ Error checking file existence:', err.message);
                throw err;
            }
        }
        
        // Prepare payload
        const payload = {
            message: commitMessage,
            content: fileContent,
            branch: this.branch
        };
        if (sha) {
            payload.sha = sha;
            logger.info(`🔑 Using existing SHA: ${sha.substring(0, 8)}...`);
        }
        
        logger.info('📤 Making PUT request to GitHub API...');
        // Upload to GitHub
        const putResponse = await this.githubApiRequest(
            `/repos/${this.repoOwner}/${this.repoName}/contents/${filePath}`,
            'PUT',
            githubToken,
            payload
        );
        
        const fileUrl = `https://github.com/${this.repoOwner}/${this.repoName}/blob/${this.branch}/${filePath}`;
        logger.info(`✅ Successfully uploaded to GitHub: ${fileUrl}`);
        
        logApiCall('github', 'uploadUsersJsonFile', {
            filePath,
            fileUrl,
            usersCount: users.length
        });
        return {
            fileUrl,
            sha: putResponse.content.sha
        };
    }

    /**
     * Uploads or updates a single user in data/users.json in the repository
     * @param {Object} userData - The user object to add or update
     * @param {string} githubToken - GitHub personal access token
     * @param {string} [commitMessage] - Optional commit message
     * @returns {Promise<Object>} Upload result
     */
    async uploadOrUpdateUserInJson(userData, githubToken, commitMessage = 'Update user data') {
        logger.info(`🚀 Starting uploadOrUpdateUserInJson for user: ${userData.email}`);
        const filePath = USER_JSON_GITHUB_PATH;
        logger.info(`📁 Target file path: ${filePath}`);
        
        let users = [];
        let sha = undefined;
        try {
            logger.info('📖 Attempting to read existing users.json from GitHub...');
            // Try to read the existing users.json from GitHub
            const response = await this.githubApiRequest(
                `/repos/${this.repoOwner}/${this.repoName}/contents/${filePath}?ref=${this.branch}`,
                'GET',
                githubToken
            );
            const existingContent = Buffer.from(response.content, 'base64').toString('utf8');
            users = JSON.parse(existingContent);
            sha = response.sha;
            logger.info(`📖 Successfully read ${users.length} existing users from GitHub`);
        } catch (err) {
            if (err.message.includes('404')) {
                // File does not exist yet, start with empty array
                users = [];
                logger.info('📝 No existing users.json found, starting with empty array');
            } else {
                logger.error('❌ Failed to read existing users from GitHub:', err.message);
                throw err;
            }
        }
        
        // Merge: update if exists, else append
        const idx = users.findIndex(u => u.userId === userData.userId);
        if (idx >= 0) {
            users[idx] = { ...users[idx], ...userData };
            logger.info(`🔄 Updated existing user at index ${idx}`);
        } else {
            users.push(userData);
            logger.info(`➕ Added new user to array`);
        }
        
        // Prepare content
        const content = JSON.stringify(users, null, 2);
        const fileContent = Buffer.from(content).toString('base64');
        logger.info(`📦 Prepared content with ${users.length} users`);
        
        // Prepare payload
        const payload = {
            message: commitMessage,
            content: fileContent,
            branch: this.branch
        };
        if (sha) {
            payload.sha = sha;
            logger.info(`🔑 Using existing SHA: ${sha.substring(0, 8)}...`);
        } else {
            logger.info('🆕 No existing SHA, creating new file');
        }
        
        logger.info('📤 Making PUT request to GitHub API...');
        // Upload to GitHub
        const putResponse = await this.githubApiRequest(
            `/repos/${this.repoOwner}/${this.repoName}/contents/${filePath}`,
            'PUT',
            githubToken,
            payload
        );
        
        const fileUrl = `https://github.com/${this.repoOwner}/${this.repoName}/blob/${this.branch}/${filePath}`;
        logger.info(`✅ Successfully uploaded to GitHub: ${fileUrl}`);
        
        logApiCall('github', 'uploadOrUpdateUserInJson', {
            filePath,
            fileUrl,
            usersCount: users.length
        });
        return {
            fileUrl,
            sha: putResponse.content.sha
        };
    }






    /**
     * Fetch users.json from GitHub repository
     * @param {string} githubToken - GitHub personal access token
     * @returns {Promise<Array>} Array of user objects
     */
    async getUsersFromGitHub(githubToken) {
        const filePath = USER_JSON_GITHUB_PATH;
        
        try {
            logger.info('📖 Fetching users.json from GitHub...');
            const response = await this.githubApiRequest(
                `/repos/${this.repoOwner}/${this.repoName}/contents/${filePath}?ref=${this.branch}`,
                'GET',
                githubToken
            );
            
            const content = Buffer.from(response.content, 'base64').toString('utf8');
            const users = JSON.parse(content);
            
            logger.info(`✅ Fetched ${users.length} users from GitHub`);
            return users;
        } catch (error) {
            if (error.message.includes('404')) {
                logger.info('📝 No users.json found on GitHub, returning empty array');
                return [];
            }
            logger.error(`❌ Failed to fetch users from GitHub: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get specific user by ID from GitHub
     * @param {string} userId - User ID to find
     * @param {string} githubToken - GitHub personal access token
     * @returns {Promise<Object|null>} User object or null
     */
    async getUserByIdFromGitHub(userId, githubToken) {
        try {
            const users = await this.getUsersFromGitHub(githubToken);
            return users.find(user => user.userId === userId) || null;
        } catch (error) {
            logger.error(`❌ Failed to get user by ID from GitHub: ${error.message}`);
            return null;
        }
    }

    /**
     * Get all active users from GitHub
     * @param {string} githubToken - GitHub personal access token
     * @returns {Promise<Array>} Array of active user objects
     */
    async getActiveUsersFromGitHub(githubToken) {
        try {
            const users = await this.getUsersFromGitHub(githubToken);
            return users.filter(user => user.isActive);
        } catch (error) {
            logger.error(`❌ Failed to get active users from GitHub: ${error.message}`);
            return [];
        }
    }

    async githubApiRequest(path, method = 'GET', githubToken, payload = {}) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                port: 443,
                path: path,
                method: method,
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'User-Agent': 'AI-News-Agent',
                    'Accept': 'application/vnd.github.v3+json'
                }
            };

            if (method === 'POST' || method === 'PUT') {
                options.headers['Content-Type'] = 'application/json';
                options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(payload));
            }

            const timeout = setTimeout(() => {
                req.destroy();
                reject(new Error('GitHub request timeout'));
            }, 30000);

            const req = https.request(options, (res) => {
                clearTimeout(timeout);
                
                logger.info(`🔧 GitHub API response status: ${res.statusCode}`);
                
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(response);
                        } else {
                            logger.error(`❌ GitHub API error status: ${res.statusCode}`);
                            reject(new Error(`GitHub API returned status ${res.statusCode}: ${response.message || 'Unknown error'}`));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse GitHub response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(`GitHub request failed: ${error.message}`));
            });

            if (method === 'POST' || method === 'PUT') {
                req.write(JSON.stringify(payload));
            }
            req.end();
        });
    }
}

module.exports = GitHubService; 