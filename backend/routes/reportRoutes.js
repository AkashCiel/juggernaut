const express = require('express');
const router = express.Router();

// Import services
const ArxivService = require('../services/arxivService');
const SummaryService = require('../services/summaryService');
const EmailService = require('../services/emailService');
const GitHubService = require('../services/githubService');
const UserService = require('../services/userService');

// Import middleware
const { validateReportRequest, validateArxivTest, validateSummaryTest, handleValidationErrors } = require('../middleware/validation');
const { reportGenerationLimiter, optionalAuth } = require('../middleware/security');
const { sanitizeTopics, sanitizeEmails, sanitizePapers } = require('../utils/sanitizer');
const { asyncHandler, handleArxivError, handleOpenAIError, handleMailgunError, handleGitHubError, validateEnvironment, validateApiKey } = require('../utils/errorHandler');
const { logger, logApiCall, logReportGeneration } = require('../utils/logger');

// Initialize services
const arxivService = new ArxivService();
const summaryService = new SummaryService();
const emailService = new EmailService();
const githubService = new GitHubService();
const userService = new UserService();

/**
 * Generate complete HTML report
 */
function generateHtmlReport(reportData, topics, reportDate) {
    const dateStr = new Date(reportDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const topicsStr = topics.join(', ');
    const aiSummary = reportData.aiSummary || '';
    const papers = reportData.papers || [];
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Research News Report - ${dateStr}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f8f9fa;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
        }
        .header p {
            margin: 5px 0;
            opacity: 0.9;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 5px;
        }
        .stat-label {
            color: #666;
            font-size: 0.9em;
        }
        .ai-summary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin: 30px 0;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .ai-summary h2 {
            margin: 0 0 20px 0;
            color: white;
        }
        .ai-summary p {
            margin-bottom: 15px;
            line-height: 1.8;
        }
        .ai-summary .generated-by {
            font-size: 0.9em;
            opacity: 0.8;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
        }
        .papers-section {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .papers-section h2 {
            margin: 0 0 20px 0;
            color: #333;
        }
        .paper-item {
            border-left: 4px solid #667eea;
            padding: 20px;
            margin-bottom: 20px;
            background: #f8f9fa;
            border-radius: 0 8px 8px 0;
            transition: all 0.3s ease;
        }
        .paper-item:hover {
            transform: translateX(5px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        .paper-title {
            font-size: 1.2em;
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
        }
        .paper-authors {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 10px;
        }
        .paper-abstract {
            color: #555;
            line-height: 1.6;
            margin-bottom: 10px;
        }
        .paper-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.8em;
            color: #999;
        }
        .paper-link {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }
        .paper-link:hover {
            text-decoration: underline;
        }
        .footer {
            text-align: center;
            padding: 30px;
            color: #666;
            font-size: 0.9em;
            margin-top: 30px;
        }
        .no-summary {
            text-align: center;
            padding: 30px;
            color: #666;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        @media (max-width: 768px) {
            body { padding: 10px; }
            .header h1 { font-size: 2em; }
            .stats { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 AI Research News Report</h1>
        <p>${dateStr}</p>
        <p>Topics: ${topicsStr}</p>
    </div>
    
    <div class="stats">
        <div class="stat-card">
            <div class="stat-number">${papers.length}</div>
            <div class="stat-label">Research Papers</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${topics.length}</div>
            <div class="stat-label">Topics Covered</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${aiSummary ? 'Yes' : 'No'}</div>
            <div class="stat-label">AI Summary</div>
        </div>
    </div>
    
    ${aiSummary ? `
    <div class="ai-summary">
        <h2>🤖 AI Research Summary</h2>
        ${aiSummary.split('\n').map(paragraph => 
            paragraph.trim() ? `<p>${paragraph}</p>` : ''
        ).join('')}
        <div class="generated-by">Generated by OpenAI GPT-4o-mini</div>
    </div>
    ` : `
    <div class="no-summary">
        <h3>📊 Report Summary</h3>
        <p>No AI summary available. Please check the papers below for detailed information.</p>
    </div>
    `}
    
    <div class="papers-section">
        <h2>📄 Research Papers (${papers.length})</h2>
        ${papers.map(paper => `
            <div class="paper-item">
                <div class="paper-title">${paper.title || 'Untitled'}</div>
                <div class="paper-authors">
                    <strong>Authors:</strong> ${Array.isArray(paper.authors) ? paper.authors.join(', ') : (paper.authors || 'Unknown')}
                </div>
                <div class="paper-abstract">
                    <strong>Abstract:</strong> ${paper.abstract || paper.summary || 'No abstract available'}
                </div>
                <div class="paper-meta">
                    <span><strong>Published:</strong> ${paper.published || paper.published_date || 'Unknown'}</span>
                    <a href="${paper.pdf_url || paper.link || `https://arxiv.org/abs/${paper.id || paper.arxiv_id}`}" 
                       target="_blank" class="paper-link">📄 View Paper</a>
                </div>
            </div>
        `).join('')}
    </div>
    
    <div class="footer">
        <p>Generated by AI Research News Agent</p>
        <p>Stay updated with the latest developments in artificial intelligence research</p>
    </div>
</body>
</html>`;

    return html;
}

// Main report generation endpoint
router.post('/generate-report', 
    reportGenerationLimiter,
    optionalAuth,
    validateReportRequest,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        logger.info('🚀 Starting report generation...');
        
        const { 
            topics = ['artificial intelligence', 'machine learning', 'deep learning'],
            recipients = [],
            maxPapers = 50
        } = req.body;

        // Sanitize inputs
        const sanitizedTopics = sanitizeTopics(topics);
        const sanitizedRecipients = sanitizeEmails(recipients);
        const sanitizedMaxPapers = Math.min(Math.max(parseInt(maxPapers) || 50, 1), 100);

        // Check for demo mode (missing environment variables)
        const isDemoMode = !validateEnvironment();
        
        if (isDemoMode) {
            logger.warn('⚠️ Running in demo mode - some features will be limited');
        }

        // Step 1: Fetch papers from ArXiv
        logger.info('📚 Fetching papers from ArXiv...');
        logApiCall('arxiv', 'fetchPapers', { topics: sanitizedTopics, maxPapers: sanitizedMaxPapers });
        
        let papers = [];
        try {
            papers = await arxivService.fetchPapers(sanitizedTopics, sanitizedMaxPapers);
            papers = sanitizePapers(papers);
        } catch (error) {
            handleArxivError(error, sanitizedTopics.join(', '));
        }
        
        if (!papers || papers.length === 0) {
            throw new NotFoundError('No papers found for the specified topics');
        }

        // Step 2: Generate AI summary (skip in demo mode)
        let aiSummary = null;
        if (!isDemoMode) {
            logger.info('🤖 Generating AI summary...');
            try {
                validateApiKey(process.env.OPENAI_API_KEY, 'OpenAI');
                aiSummary = await summaryService.generateSummary(papers, process.env.OPENAI_API_KEY);
                logApiCall('openai', 'generateSummary', { papersCount: papers.length });
            } catch (error) {
                handleOpenAIError(error);
            }
        } else {
            logger.warn('⚠️ Skipping AI summary in demo mode');
        }

        // Step 3: Prepare report data
        const reportDate = new Date().toISOString().split('T')[0];
        const reportData = {
            date: reportDate,
            topics: sanitizedTopics,
            papers: papers,
            aiSummary: aiSummary
        };

        // Step 4: Generate HTML report
        const htmlReport = generateHtmlReport(reportData, sanitizedTopics, reportDate);

        // Step 5: Upload report to GitHub via Pull Request (skip in demo mode)
        let uploadResult = null;
        if (!isDemoMode) {
            logger.info('📤 Uploading report to GitHub via Pull Request...');
            try {
                validateApiKey(process.env.GITHUB_TOKEN, 'GitHub');
                uploadResult = await githubService.uploadReport(reportData, process.env.GITHUB_TOKEN, sanitizedRecipients);
                reportData.pagesUrl = uploadResult.pagesUrl;
                reportData.prUrl = uploadResult.prUrl;
                reportData.userId = uploadResult.userId;
                logApiCall('github', 'uploadReportViaPR', { reportDate, userId: uploadResult.userId });
            } catch (error) {
                handleGitHubError(error);
            }
        } else {
            logger.warn('⚠️ Skipping GitHub upload in demo mode');
        }

        // Step 6: Send email if recipients provided (skip in demo mode)
        let emailResult = null;
        if (sanitizedRecipients && sanitizedRecipients.length > 0 && !isDemoMode) {
            logger.info('📧 Sending email...');
            try {
                validateApiKey(process.env.MAILGUN_API_KEY, 'Mailgun');
                validateApiKey(process.env.MAILGUN_DOMAIN, 'Mailgun Domain');
                
                logger.info('📧 Initializing email service...');
                logger.info(`📧 Mailgun API Key: ${process.env.MAILGUN_API_KEY ? 'Present' : 'Missing'}`);
                logger.info(`📧 Mailgun Domain: ${process.env.MAILGUN_DOMAIN || 'Missing'}`);
                
                emailService.initialize(process.env.MAILGUN_API_KEY, process.env.MAILGUN_DOMAIN);
                emailResult = await emailService.sendEmail(reportData, sanitizedTopics, sanitizedRecipients, new Date());
                logApiCall('mailgun', 'sendEmail', { recipientsCount: sanitizedRecipients.length });
            } catch (error) {
                logger.error('❌ Email service error:', {
                    message: error.message,
                    stack: error.stack
                });
                handleMailgunError(error);
            }
        } else if (sanitizedRecipients && sanitizedRecipients.length > 0 && isDemoMode) {
            logger.warn('⚠️ Skipping email in demo mode');
        }

        // Step 7: Return success response with HTML report
        const response = {
            success: true,
            message: isDemoMode ? 'Report generated successfully (Demo Mode)' : 'Report generated successfully',
            data: {
                reportDate: reportDate,
                topics: sanitizedTopics,
                papersCount: papers.length,
                hasAISummary: !!aiSummary,
                reportUrl: uploadResult?.pagesUrl || null,
                prUrl: uploadResult?.prUrl || null,
                userId: uploadResult?.userId || 'public',
                emailSent: !!emailResult,
                demoMode: isDemoMode,
                htmlReport: htmlReport
            }
        };

        if (emailResult) {
            response.data.emailId = emailResult.messageId;
        }

        logReportGeneration(sanitizedTopics, papers.length, !!aiSummary, isDemoMode);
        logger.info('✅ Report generation completed successfully');
        
        res.json(response);
    })
);

// Test endpoint for ArXiv service
router.post('/test/arxiv',
    validateArxivTest,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { topics = ['artificial intelligence'], maxPapers = 10 } = req.body;
        const sanitizedTopics = sanitizeTopics(topics);
        const sanitizedMaxPapers = Math.min(Math.max(parseInt(maxPapers) || 10, 1), 20);
        
        try {
            const papers = await arxivService.fetchPapers(sanitizedTopics, sanitizedMaxPapers);
            const sanitizedPapers = sanitizePapers(papers);
            
            res.json({ 
                success: true, 
                papersCount: sanitizedPapers.length, 
                papers: sanitizedPapers 
            });
        } catch (error) {
            handleArxivError(error, sanitizedTopics.join(', '));
        }
    })
);

// Test endpoint for summary service
router.post('/test/summary',
    validateSummaryTest,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
        const { papers, apiKey } = req.body;
        const sanitizedPapers = sanitizePapers(papers);
        
        try {
            validateApiKey(apiKey, 'OpenAI');
            const summary = await summaryService.generateSummary(sanitizedPapers, apiKey);
            res.json({ success: true, summary });
        } catch (error) {
            handleOpenAIError(error);
        }
    })
);

// User registration endpoint
router.post('/register-user',
    asyncHandler(async (req, res) => {
        const { email, topics = ['artificial intelligence', 'machine learning'] } = req.body;
        
        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address'
            });
        }
        
        try {
            const sanitizedTopics = sanitizeTopics(topics);
            const user = await userService.registerUser(email, sanitizedTopics);
            
            logger.info(`✅ User registered: ${email} (${user.userId})`);
            
            res.json({
                success: true,
                message: 'User registered successfully for daily reports',
                data: {
                    userId: user.userId,
                    email: user.email,
                    topics: user.topics,
                    isActive: user.isActive
                }
            });
        } catch (error) {
            logger.error('❌ User registration failed:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to register user'
            });
        }
    })
);

// Get scheduler status
router.get('/scheduler/status',
    asyncHandler(async (req, res) => {
        try {
            const SchedulerService = require('../services/schedulerService');
            const schedulerService = new SchedulerService();
            const status = await schedulerService.getStatus();
            
            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            logger.error('❌ Failed to get scheduler status:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to get scheduler status'
            });
        }
    })
);

module.exports = router; 