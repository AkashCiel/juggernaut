const GitHubService = require('../../services/githubService');
const { logger } = require('../utils/logger');

/**
 * GithubUploader - Uploads library to GitHub repository
 * Reuses existing GitHubService
 */
class GithubUploader {
    constructor() {
        this.githubService = new GitHubService();
        this.githubToken = process.env.GITHUB_TOKEN;
        
        if (!this.githubToken) {
            logger.warn('GITHUB_TOKEN not set - upload will fail');
        }
    }

    /**
     * Upload library JSON to GitHub
     * @param {Object} library - Library object
     * @param {string} targetPath - Target path in repo (e.g., 'backend/data/article-library/technology.json')
     * @returns {Promise<Object>} - {fileUrl, sha}
     */
    async uploadLibrary(library, targetPath) {
        logger.info('Uploading library to GitHub', { targetPath });
        
        if (!this.githubToken) {
            throw new Error('GITHUB_TOKEN environment variable not set');
        }
        
        try {
            // Convert library to JSON array format expected by uploadUsersJsonFile
            // (it expects array, but we can pass our library object)
            const content = JSON.stringify(library, null, 2);
            
            // Upload using GitHubService pattern
            const result = await this.uploadFile(
                targetPath,
                content,
                `Update article library: ${library.metadata.section}`
            );
            
            logger.info('Library uploaded successfully', { 
                fileUrl: result.fileUrl,
                sha: result.sha
            });
            
            return result;
            
        } catch (error) {
            logger.error('Failed to upload library', { 
                error: error.message,
                targetPath
            });
            throw error;
        }
    }

    /**
     * Upload file content to GitHub
     * @param {string} path - File path in repo
     * @param {string} content - File content
     * @param {string} message - Commit message
     * @returns {Promise<Object>} - {fileUrl, sha}
     */
    async uploadFile(path, content, message) {
        const fileContent = Buffer.from(content).toString('base64');
        
        // Check if file exists
        let sha = undefined;
        try {
            logger.debug('Checking if file exists', { path });
            const response = await this.githubService.githubApiRequest(
                `/repos/${this.githubService.repoOwner}/${this.githubService.repoName}/contents/${path}?ref=${this.githubService.branch}`,
                'GET',
                this.githubToken
            );
            sha = response.sha;
            logger.debug('File exists, will update', { sha: sha.substring(0, 8) });
        } catch (err) {
            if (err.message.includes('404')) {
                logger.debug('File does not exist, will create');
            } else {
                throw err;
            }
        }
        
        // Prepare payload
        const payload = {
            message: message,
            content: fileContent,
            branch: this.githubService.branch
        };
        
        if (sha) {
            payload.sha = sha;
        }
        
        // Upload
        logger.debug('Uploading to GitHub', { path, hasExisting: !!sha });
        const putResponse = await this.githubService.githubApiRequest(
            `/repos/${this.githubService.repoOwner}/${this.githubService.repoName}/contents/${path}`,
            'PUT',
            this.githubToken,
            payload
        );
        
        const fileUrl = `https://github.com/${this.githubService.repoOwner}/${this.githubService.repoName}/blob/${this.githubService.branch}/${path}`;
        
        return {
            fileUrl,
            sha: putResponse.content.sha
        };
    }
}

module.exports = GithubUploader;

