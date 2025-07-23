const https = require('https');
const { logger, logApiCall } = require('../utils/logger');
const { handleGitHubError } = require('../utils/errorHandler');
const { sanitizeText, sanitizeHtml } = require('../utils/sanitizer');
const { generateUserIdFromRecipients } = require('../utils/userUtils');
const { uploadReportViaPR } = require('./githubPullRequestUploader');
const { uploadReportDirect } = require('./githubDirectUploader');

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
     * Uploads a report to GitHub using either direct upload or pull request method
     * @param {Object} reportData - The report data to upload
     * @param {string} githubToken - GitHub personal access token
     * @param {string[]} recipients - Array of email recipients for user ID generation
     * @returns {Promise<Object>} Upload result with different properties based on method:
     *   - Direct upload: {pagesUrl, sha, userId}
     *   - Pull request: {pagesUrl, prUrl, branchName, userId}
     */
    async uploadReport(reportData, githubToken, recipients = []) {
        // Generate userId from recipients
        const userId = generateUserIdFromRecipients(recipients);
        
        // Log user ID generation
        if (recipients && recipients.length > 0) {
            logger.info(`👤 Generated user ID '${userId}' from email: ${recipients[0]}`);
        } else {
            logger.info('👤 No recipients provided, using public user ID');
        }
        logger.info(`📁 Reports will be stored in: reports/${userId === 'public' ? 'public' : `user-${userId}`}/`);
        
        // Use direct upload by default for the new hosting repo setup
        // Set GITHUB_DIRECT_UPLOAD=false to use PR-based uploads
        const useDirectUpload = process.env.GITHUB_DIRECT_UPLOAD !== 'false';
        
        if (useDirectUpload) {
            logger.info('📤 Uploading report directly to GitHub (branch protection disabled)...');
            logger.info(`🔧 Using branch: ${this.branch}`);
            logger.info(`👤 User ID: ${userId}`);
        } else {
            logger.info('📤 Uploading report to GitHub via Pull Request...');
            logger.info(`🔧 Using base branch: ${this.branch}`);
            logger.info(`👤 User ID: ${userId}`);
        }
        
        try {
            // Create report HTML
            const reportHtml = this.generateReportHtml(reportData);
            
            // Prepare report data with HTML content
            const reportDataWithHtml = {
                ...reportData,
                html: reportHtml
            };
            
            let uploadResult;
            
            if (useDirectUpload) {
                // Upload directly to main branch
                uploadResult = await uploadReportDirect(
                    reportDataWithHtml, 
                    githubToken, 
                    this.branch, 
                    this.repoOwner, 
                    this.repoName,
                    userId,
                    reportData.topics,
                    process.env.OPENAI_API_KEY
                );
                
                logApiCall('github', 'uploadReportDirect', { 
                    reportDate: reportData.date,
                    fileUrl: uploadResult.fileUrl,
                    userId: userId
                });
                
                return {
                    pagesUrl: uploadResult.fileUrl,
                    sha: uploadResult.sha,
                    userId: userId
                };
            } else {
                // Upload via Pull Request
                uploadResult = await uploadReportViaPR(
                    reportDataWithHtml, 
                    githubToken, 
                    this.branch, 
                    this.repoOwner, 
                    this.repoName,
                    userId,
                    reportData.topics,
                    process.env.OPENAI_API_KEY
                );
                
                logApiCall('github', 'uploadReportViaPR', { 
                    reportDate: reportData.date,
                    prUrl: uploadResult.prUrl,
                    branchName: uploadResult.branchName,
                    userId: userId
                });
                
                return {
                    pagesUrl: uploadResult.fileUrl,
                    prUrl: uploadResult.prUrl,
                    branchName: uploadResult.branchName,
                    userId: userId
                };
            }
        } catch (error) {
            logger.error(`❌ GitHub upload error: ${error.message}`);
            handleGitHubError(error);
            throw error;
        }
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


    generateReportHtml(reportData) {
        const papersHtml = reportData.papers.map((paper, index) => {
            const authors = Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors;
            const publishedDate = new Date(paper.published).toLocaleDateString();
            const title = sanitizeText(paper.title || '');
            const summary = sanitizeText(paper.summary || '');
            const link = sanitizeText(paper.link || '');
            const categories = Array.isArray(paper.categories) 
                ? paper.categories.map(cat => sanitizeText(cat)).join(', ')
                : '';
            
            return `
                <div class="paper">
                    <h3><a href="${link}" target="_blank">${title}</a></h3>
                    <p><strong>Authors:</strong> ${authors}</p>
                    <p><strong>Published:</strong> ${publishedDate}</p>
                    <p><strong>Categories:</strong> ${categories}</p>
                    <p><strong>Summary:</strong> ${summary}</p>
                </div>
            `;
        }).join('');

        const aiSummarySection = reportData.aiSummary ? `
            <div class="ai-summary">
                <h2>🤖 AI Summary</h2>
                <p>${sanitizeText(reportData.aiSummary)}</p>
            </div>
        ` : '';

        const topicsStr = sanitizeText(reportData.topics.join(', '));

        return sanitizeHtml(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Research Report - ${reportData.date}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #007bff;
            padding-bottom: 10px;
        }
        .ai-summary {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
        }
        .paper {
            border: 1px solid #ddd;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
            background: #fafafa;
        }
        .paper h3 {
            margin-top: 0;
            color: #007bff;
        }
        .paper a {
            color: #007bff;
            text-decoration: none;
        }
        .paper a:hover {
            text-decoration: underline;
        }
        .meta {
            color: #666;
            font-size: 14px;
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 AI Research Report</h1>
        <div class="meta">
            <strong>Date:</strong> ${reportData.date}<br>
            <strong>Topics:</strong> ${topicsStr}<br>
            <strong>Papers Found:</strong> ${reportData.papers.length}
        </div>
        
        ${aiSummarySection}
        
        <h2>📚 Research Papers</h2>
        ${papersHtml}
        
        <div class="meta">
            <p><em>Generated by AI News Agent</em></p>
        </div>
    </div>
</body>
</html>`);
    }

    async uploadFileToGitHub(content, date, githubToken) {
        return new Promise((resolve, reject) => {
            const fileName = `report-${date}.html`;
            const filePath = `reports/${fileName}`;
            
            const data = JSON.stringify({
                message: `Add AI research report for ${date}`,
                content: Buffer.from(content).toString('base64'),
                branch: this.branch
            });

            const options = {
                hostname: 'api.github.com',
                port: 443,
                path: `/repos/${this.repository}/contents/${filePath}`,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `token ${githubToken}`,
                    'User-Agent': 'AI-News-Agent',
                    'Content-Length': Buffer.byteLength(data)
                }
            };

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
                        
                        logger.info(`🔧 GitHub response message: ${response.message || 'No message'}`);
                        
                        if (res.statusCode === 422 && response.message && response.message.includes('sha')) {
                            logger.info('🔄 File exists, getting SHA and retrying...');
                            // File exists but SHA wasn't provided, get the SHA and retry
                            this.getFileSha(filePath, githubToken)
                                .then(sha => this.updateExistingFile(content, date, githubToken, sha))
                                .then(resolve)
                                .catch(reject);
                        } else if (res.statusCode !== 200 && res.statusCode !== 201) {
                            logger.error(`❌ GitHub API error status: ${res.statusCode}`);
                            reject(new Error(`GitHub API returned status ${res.statusCode}`));
                        } else if (response.content && response.content.sha) {
                            // Successfully uploaded
                            const pagesUrl = `https://akashciel.github.io/juggernaut/reports/${fileName}`;
                            resolve({
                                pagesUrl,
                                sha: response.content.sha
                            });
                        } else {
                            reject(new Error(`GitHub API Error: ${response.message || 'Unknown error'}`));
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

            req.write(data);
            req.end();
        });
    }

    async getFileSha(filePath, githubToken) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                port: 443,
                path: `/repos/${this.repository}/contents/${filePath}?ref=${this.branch}`,
                method: 'GET',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'User-Agent': 'AI-News-Agent'
                }
            };

            const timeout = setTimeout(() => {
                req.destroy();
                reject(new Error('GitHub request timeout'));
            }, 30000);

            const req = https.request(options, (res) => {
                clearTimeout(timeout);
                
                if (res.statusCode !== 200) {
                    reject(new Error(`GitHub API returned status ${res.statusCode}`));
                    return;
                }
                
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        
                        if (response.sha) {
                            resolve(response.sha);
                        } else {
                            reject(new Error('Could not get file SHA'));
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

            req.end();
        });
    }

    async updateExistingFile(content, date, githubToken, sha) {
        return new Promise((resolve, reject) => {
            const fileName = `report-${date}.html`;
            const filePath = `reports/${fileName}`;
            
            const data = JSON.stringify({
                message: `Update AI research report for ${date}`,
                content: Buffer.from(content).toString('base64'),
                sha: sha,
                branch: this.branch
            });

            const options = {
                hostname: 'api.github.com',
                port: 443,
                path: `/repos/${this.repository}/contents/${filePath}`,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `token ${githubToken}`,
                    'User-Agent': 'AI-News-Agent',
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            const timeout = setTimeout(() => {
                req.destroy();
                reject(new Error('GitHub request timeout'));
            }, 30000);

            const req = https.request(options, (res) => {
                clearTimeout(timeout);
                
                if (res.statusCode !== 200 && res.statusCode !== 201) {
                    reject(new Error(`GitHub API returned status ${res.statusCode}`));
                    return;
                }
                
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        
                        if (response.content && response.content.sha) {
                            const pagesUrl = `https://akashciel.github.io/juggernaut/reports/${fileName}`;
                            resolve({
                                pagesUrl,
                                sha: response.content.sha
                            });
                        } else {
                            reject(new Error(`GitHub API Error: ${response.message || 'Unknown error'}`));
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

            req.write(data);
            req.end();
        });
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