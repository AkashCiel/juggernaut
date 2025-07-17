const https = require('https');
const { v4: uuidv4 } = require('uuid');

/**
 * Uploads a report by creating a new branch, committing the file, and opening a pull request to main.
 * @param {Object} reportData - The report data to upload.
 * @param {string} githubToken - GitHub personal access token.
 * @param {string} baseBranch - The branch to branch off from (e.g., 'main').
 * @param {string} repoOwner - The owner of the repo (e.g., 'AkashCiel').
 * @param {string} repoName - The name of the repo (e.g., 'juggernaut').
 * @param {string} userId - Optional user ID for future multi-user support.
 * @returns {Promise<{prUrl: string, branchName: string, fileUrl: string}>}
 */
async function uploadReportViaPR(reportData, githubToken, baseBranch, repoOwner, repoName, userId = null) {
    const fileName = `report-${reportData.date}.html`;
    
    // Future-proof file path structure for multi-user support
    const userPath = userId ? `user-${userId}` : 'public';
    const filePath = `reports/${userPath}/${fileName}`;
    
    const branchName = `auto/report-${reportData.date}-${uuidv4().slice(0, 8)}`;
    const commitMessage = `Add AI research report for ${reportData.date}${userId ? ` (User: ${userId})` : ''}`;
    const prTitle = `Automated AI Research Report for ${reportData.date}${userId ? ` (User: ${userId})` : ''}`;
    const prBody = `This PR adds the AI-generated research report for ${reportData.date}.${userId ? `\n\nUser ID: ${userId}` : ''}`;
    const fileContent = Buffer.from(reportData.html || reportData.content || '').toString('base64');

    // 1. Get the latest commit SHA of the base branch
    const baseSha = await getBranchSha(repoOwner, repoName, baseBranch, githubToken);

    // 2. Create a new branch from the base branch
    await createBranch(repoOwner, repoName, branchName, baseSha, githubToken);

    // 3. Create or update the file in the new branch
    await createOrUpdateFile(repoOwner, repoName, filePath, fileContent, branchName, commitMessage, githubToken);

    // 4. Open a pull request from the new branch to the base branch
    const prUrl = await createPullRequest(repoOwner, repoName, branchName, baseBranch, prTitle, prBody, githubToken);

    const fileUrl = `https://github.com/${repoOwner}/${repoName}/blob/${branchName}/${filePath}`;
    return { prUrl, branchName, fileUrl };
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

async function getBranchSha(owner, repo, branch, githubToken) {
    const path = `/repos/${owner}/${repo}/git/ref/heads/${branch}`;
    const data = await githubApiRequest(path, 'GET', githubToken);
    return data.object.sha;
}

async function createBranch(owner, repo, branchName, baseSha, githubToken) {
    const path = `/repos/${owner}/${repo}/git/refs`;
    const data = {
        ref: `refs/heads/${branchName}`,
        sha: baseSha
    };
    await githubApiRequest(path, 'POST', githubToken, data);
}

async function createOrUpdateFile(owner, repo, filePath, content, branch, message, githubToken) {
    const path = `/repos/${owner}/${repo}/contents/${filePath}`;
    const data = {
        message,
        content,
        branch
    };
    await githubApiRequest(path, 'PUT', githubToken, data);
}

async function createPullRequest(owner, repo, head, base, title, body, githubToken) {
    const path = `/repos/${owner}/${repo}/pulls`;
    const data = {
        title,
        head,
        base,
        body
    };
    const response = await githubApiRequest(path, 'POST', githubToken, data);
    return response.html_url;
}

module.exports = { uploadReportViaPR }; 