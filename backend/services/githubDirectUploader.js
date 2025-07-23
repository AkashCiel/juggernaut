const https = require('https');
const { getUserReportPath } = require('../utils/userUtils');

/**
 * Directly uploads a report to the main branch (for when branch protection is disabled).
 * @param {Object} reportData - The report data to upload.
 * @param {string} githubToken - GitHub personal access token.
 * @param {string} branch - The branch to upload to (e.g., 'main').
 * @param {string} repoOwner - The owner of the repo (e.g., 'AkashCiel').
 * @param {string} repoName - The name of the repo (e.g., 'juggernaut').
 * @param {string} userId - Optional user ID for future multi-user support.
 * @param {Array} topics - Array of topics for directory naming.
 * @param {string} openaiApiKey - OpenAI API key for topic directory generation.
 * @returns {Promise<{fileUrl: string, sha: string}>}
 */
async function uploadReportDirect(reportData, githubToken, branch, repoOwner, repoName, userId = null, topics = null, openaiApiKey = null) {
    const fileName = `report-${reportData.date}.html`;
    
    // Get user report path with topic-based subdirectory
    const userReportPath = await getUserReportPath(userId || 'public', topics, openaiApiKey);
    const filePath = `${userReportPath}/${fileName}`;
    
    const commitMessage = `Add AI research report for ${reportData.date}${userId ? ` (User: ${userId})` : ''}`;
    const fileContent = Buffer.from(reportData.html || reportData.content || '').toString('base64');

    try {
        const response = await githubApiRequest(
            `/repos/${repoOwner}/${repoName}/contents/${filePath}`,
            'PUT',
            githubToken,
            {
                message: commitMessage,
                content: fileContent,
                branch: branch
            }
        );
        
        // Generate GitHub Pages URL for the uploaded file
        const pagesUrl = `https://akashciel.github.io/juggernaut-reports/${filePath}`;
        return {
            fileUrl: pagesUrl,
            sha: response.content.sha
        };
    } catch (error) {
        if (error.message.includes('422') && error.message.includes('sha')) {
            // File exists, get SHA and update
            const sha = await getFileSha(repoOwner, repoName, filePath, branch, githubToken);
            return await updateExistingFile(repoOwner, repoName, filePath, fileContent, branch, commitMessage, sha, githubToken);
        }
        throw error;
    }
}

function githubApiRequest(path, method, githubToken, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            port: 443,
            path,
            method,
            headers: {
                'Authorization': `token ${githubToken}`,
                'User-Agent': 'AI-News-Agent',
                'Accept': 'application/vnd.github.v3+json',
            }
        };
        let body = '';
        if (data) {
            body = JSON.stringify(data);
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => { responseData += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(responseData));
                    } catch (e) {
                        resolve(responseData);
                    }
                } else {
                    reject(new Error(`GitHub API error: ${res.statusCode} ${res.statusMessage} - ${responseData}`));
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function getFileSha(owner, repo, filePath, branch, githubToken) {
    const path = `/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
    const response = await githubApiRequest(path, 'GET', githubToken);
    return response.sha;
}

async function updateExistingFile(owner, repo, filePath, content, branch, message, sha, githubToken) {
    const path = `/repos/${owner}/${repo}/contents/${filePath}`;
    const response = await githubApiRequest(path, 'PUT', githubToken, {
        message,
        content,
        sha,
        branch
    });
    
    // Generate GitHub Pages URL for the uploaded file
    const pagesUrl = `https://akashciel.github.io/juggernaut-reports/${filePath}`;
    return {
        fileUrl: pagesUrl,
        sha: response.content.sha
    };
}

module.exports = { uploadReportDirect }; 