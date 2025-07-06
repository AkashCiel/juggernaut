// GitHub Report Uploader
class GitHubUploader {
    constructor() {
        this.apiKeys = {};
        this.repoOwner = 'AkashCiel'; // Your GitHub username
        this.repoName = 'juggernaut'; // Your repo name
        this.reportFolder = 'reports'; // Folder for reports
        this.baseUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents`;
    }

    init() {
        // Load GitHub token from settings
        const savedKeys = window.AINewsData.getApiKeys();
        if (savedKeys.githubToken) {
            this.setGitHubToken(savedKeys.githubToken);
        }
        console.log('✅ GitHub uploader initialized');
    }

    // Set GitHub token
    setGitHubToken(token) {
        this.apiKeys.githubToken = token;
        console.log('✅ GitHub token updated');
    }

    // Upload report to GitHub
    async uploadReport(report) {
        if (!this.apiKeys.githubToken || this.apiKeys.githubToken === 'YOUR_GITHUB_TOKEN_HERE') {
            throw new Error('GitHub token not set. Please add it in API Keys settings.');
        }

        if (!report || !report.htmlContent) {
            throw new Error('No report content to upload');
        }

        try {
            console.log('🔄 Uploading report to GitHub...');

            // Create reports folder if it doesn't exist
            await this.ensureReportsFolder();

            // Upload the report file
            const filePath = `${this.reportFolder}/${report.fileName}`;
            const uploadResult = await this.uploadFile(filePath, report.htmlContent, `Add AI news report ${report.id}`);

            // Create/update reports index
            await this.updateReportsIndex(report);

            const githubUrl = uploadResult.content.html_url;
            const pagesUrl = githubUrl.replace('github.com', 'github.io').replace('/blob/', '/');

            console.log(`✅ Report uploaded successfully: ${pagesUrl}`);

            return {
                success: true,
                githubUrl,
                pagesUrl,
                fileName: report.fileName,
                reportId: report.id
            };

        } catch (error) {
            console.error('❌ Error uploading to GitHub:', error);
            throw error;
        }
    }

    // Ensure reports folder exists
    async ensureReportsFolder() {
        try {
            const response = await fetch(`${this.baseUrl}/${this.reportFolder}`, {
                headers: {
                    'Authorization': `token ${this.apiKeys.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.status === 404) {
                // Folder doesn't exist, create it with a README
                await this.uploadFile(
                    `${this.reportFolder}/README.md`,
                    '# AI News Reports\n\nThis folder contains generated AI research news reports.\n',
                    'Create reports folder'
                );
                console.log('✅ Reports folder created');
            }
        } catch (error) {
            console.warn('⚠️ Could not check/create reports folder:', error);
        }
    }

    // Upload file to GitHub
    async uploadFile(path, content, commitMessage) {
        // Check if file exists first
        let sha = null;
        try {
            const existingResponse = await fetch(`${this.baseUrl}/${path}`, {
                headers: {
                    'Authorization': `token ${this.apiKeys.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (existingResponse.ok) {
                const existingData = await existingResponse.json();
                sha = existingData.sha;
                console.log('📝 Updating existing file');
            }
        } catch (error) {
            console.log('📄 Creating new file');
        }

        // Upload/update file
        const body = {
            message: commitMessage,
            content: btoa(unescape(encodeURIComponent(content))), // Base64 encode UTF-8 content
            ...(sha && { sha }) // Include SHA if updating existing file
        };

        const response = await fetch(`${this.baseUrl}/${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${this.apiKeys.githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        return await response.json();
    }

    // Update reports index page
    async updateReportsIndex(newReport) {
        try {
            // Get existing reports index
            let existingReports = [];
            try {
                const indexResponse = await fetch(`${this.baseUrl}/${this.reportFolder}/index.json`, {
                    headers: {
                        'Authorization': `token ${this.apiKeys.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (indexResponse.ok) {
                    const indexData = await indexResponse.json();
                    const indexContent = atob(indexData.content);
                    existingReports = JSON.parse(indexContent);
                }
            } catch (error) {
                console.log('📄 Creating new reports index');
            }

            // Add new report to index
            const reportEntry = {
                id: newReport.id,
                fileName: newReport.fileName,
                date: newReport.date,
                topics: newReport.topics,
                metadata: newReport.metadata,
                createdAt: new Date().toISOString()
            };

            // Remove existing report with same ID (if any)
            existingReports = existingReports.filter(report => report.id !== newReport.id);
            
            // Add new report at the beginning
            existingReports.unshift(reportEntry);

            // Keep only last 50 reports
            existingReports = existingReports.slice(0, 50);

            // Upload updated index
            await this.uploadFile(
                `${this.reportFolder}/index.json`,
                JSON.stringify(existingReports, null, 2),
                `Update reports index with ${newReport.id}`
            );

            // Create/update HTML index page
            const htmlIndex = this.createReportsIndexHTML(existingReports);
            await this.uploadFile(
                `${this.reportFolder}/index.html`,
                htmlIndex,
                `Update reports HTML index with ${newReport.id}`
            );

            console.log('✅ Reports index updated');

        } catch (error) {
            console.warn('⚠️ Could not update reports index:', error);
        }
    }

    // Create HTML index of all reports
    createReportsIndexHTML(reports) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Research News Reports Archive</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 {
            text-align: center;
            background: linear-gradient(45deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 30px;
        }
        .report-item {
            background: white;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
            border-left: 4px solid #667eea;
        }
        .report-title {
            font-size: 1.2em;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .report-meta {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 10px;
        }
        .report-link {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }
        .report-link:hover {
            text-decoration: underline;
        }
        .topics {
            margin-top: 10px;
        }
        .topic-tag {
            background: #f0f0f0;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 AI Research News Reports Archive</h1>
        <p style="text-align: center; color: #666; margin-bottom: 30px;">
            Archive of ${reports.length} AI research news reports
        </p>
        
        ${reports.map(report => `
            <div class="report-item">
                <div class="report-title">
                    AI News Report - ${new Date(report.date).toLocaleDateString()}
                </div>
                <div class="report-meta">
                    📊 ${report.metadata.totalItems} items 
                    (${report.metadata.newsArticles} news, ${report.metadata.researchPapers} papers)
                    • Generated ${new Date(report.createdAt).toLocaleDateString()}
                </div>
                <div>
                    <a href="./${report.fileName}" class="report-link" target="_blank">
                        View Report →
                    </a>
                </div>
                <div class="topics">
                    ${report.topics.slice(0, 5).map(topic => 
                        `<span class="topic-tag">${topic}</span>`
                    ).join('')}
                </div>
            </div>
        `).join('')}
        
        <div style="text-align: center; margin-top: 30px; color: #666; font-size: 0.9em;">
            Powered by AI Research News Agent
        </div>
    </div>
</body>
</html>`;
    }

    // Get GitHub Pages URL for the repo
    getGitHubPagesBaseUrl() {
        return `https://${this.repoOwner.toLowerCase()}.github.io/${this.repoName}`;
    }

    // Get reports archive URL
    getReportsArchiveUrl() {
        return `${this.getGitHubPagesBaseUrl()}/${this.reportFolder}/`;
    }

    // Display the full HTML report
    displayFullReport(report) {
        const reportContainer = document.getElementById('reportContainer');
        if (!reportContainer) return;

        // Extract <body>...</body> content
        let bodyContent = report.htmlContent;
        const bodyMatch = bodyContent.match(/<body[^>]*>([\\s\\S]*?)<\\/body>/i);
        if (bodyMatch) {
            bodyContent = bodyMatch[1];
        }

        // Create a new section for the full report
        let fullReportSection = document.getElementById('fullReportSection');
        if (!fullReportSection) {
            fullReportSection = document.createElement('div');
            fullReportSection.id = 'fullReportSection';
            fullReportSection.style.cssText = `
                margin-top: 30px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 15px;
                border: 2px solid #667eea;
            `;
            reportContainer.appendChild(fullReportSection);
        }

        // Add report header and extracted body content
        fullReportSection.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #667eea; margin-bottom: 10px;">📄 Full Generated Report</h3>
                <p style="color: #666; font-size: 0.9em;">
                    This is the complete HTML report that was generated and can be shared or downloaded.
                </p>
            </div>
            <div style="background: white; border-radius: 10px; padding: 20px; max-height: 600px; overflow-y: auto; border: 1px solid #e0e0e0;">
                ${bodyContent}
            </div>
        `;

        console.log('✅ Full report displayed in UI:', bodyContent);
    }
}

// Make available globally
window.GitHubUploader = GitHubUploader;