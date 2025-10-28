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
     * Upload library JSON to GitHub with article-level merge
     * @param {Object} library - Library object
     * @param {string} targetPath - Target path in repo (e.g., 'backend/data/article-library/technology.json')
     * @returns {Promise<Object>} - {fileUrl, sha, mergeInfo}
     */
    async uploadLibrary(library, targetPath) {
        logger.info('Uploading library to GitHub', { targetPath });
        
        if (!this.githubToken) {
            throw new Error('GITHUB_TOKEN environment variable not set');
        }
        
        try {
            // Step 1: Try to download existing library
            logger.info('Checking for existing library on GitHub');
            const existingLibrary = await this.downloadExistingLibrary(targetPath);
            
            let finalLibrary;
            let mergeInfo = null;
            
            if (existingLibrary) {
                // Step 2: Merge with existing
                logger.info('Existing library found, merging articles', {
                    existingCount: existingLibrary.articles.length,
                    newCount: library.articles.length
                });
                
                const LibraryBuilder = require('./libraryBuilder');
                const builder = new LibraryBuilder();
                finalLibrary = builder.mergeLibraries(existingLibrary, library);
                
                mergeInfo = finalLibrary.metadata.merge_info;
                
                logger.info('Libraries merged', {
                    totalArticles: finalLibrary.metadata.article_count,
                    newArticles: mergeInfo.new_articles,
                    updatedArticles: mergeInfo.updated_articles
                });
            } else {
                // No existing library, use new one as-is
                logger.info('No existing library found, creating new');
                finalLibrary = library;
            }
            
            // Step 3: Upload merged library
            const content = JSON.stringify(finalLibrary, null, 2);
            const commitMessage = this.generateCommitMessage(finalLibrary);
            
            const result = await this.uploadFile(
                targetPath,
                content,
                commitMessage
            );
            
            logger.info('Library uploaded successfully', { 
                fileUrl: result.fileUrl,
                articleCount: finalLibrary.metadata.article_count
            });
            
            return {
                ...result,
                mergeInfo: mergeInfo
            };
            
        } catch (error) {
            logger.error('Failed to upload library', { 
                error: error.message,
                targetPath
            });
            throw error;
        }
    }

    /**
     * Download existing library from GitHub (if exists)
     * @param {string} path - File path in repo
     * @returns {Promise<Object|null>} - Existing library or null
     */
    async downloadExistingLibrary(path) {
        try {
            logger.debug('Attempting to download existing library', { path });
            
            const response = await this.githubService.githubApiRequest(
                `/repos/${this.githubService.repoOwner}/${this.githubService.repoName}/contents/${path}?ref=${this.githubService.branch}`,
                'GET',
                this.githubToken
            );
            
            // Decode base64 content
            const content = Buffer.from(response.content, 'base64').toString('utf8');
            const library = JSON.parse(content);
            
            logger.debug('Existing library downloaded', { 
                articleCount: library.articles?.length || 0,
                sha: response.sha.substring(0, 8)
            });
            
            return library;
            
        } catch (err) {
            if (err.message.includes('404')) {
                logger.debug('No existing library found (404)');
                return null;
            }
            throw err;
        }
    }

    /**
     * Generate commit message based on merge info
     * @param {Object} library - Library object
     * @returns {string} - Commit message
     */
    generateCommitMessage(library) {
        const section = library.metadata.section;
        const mergeInfo = library.metadata.merge_info;
        
        if (mergeInfo) {
            return `Update ${section} library: +${mergeInfo.new_articles} new, ~${mergeInfo.updated_articles} updated (${mergeInfo.total_count} total)`;
        } else {
            return `Create ${section} library: ${library.metadata.article_count} articles`;
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

