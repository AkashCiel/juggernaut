const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import services
const ArxivService = require('./services/arxivService');
const SummaryService = require('./services/summaryService');
const EmailService = require('./services/emailService');
const GitHubService = require('./services/githubService');

// Initialize services
const arxivService = new ArxivService();
const summaryService = new SummaryService();
const emailService = new EmailService();
const githubService = new GitHubService();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'AI News Agent Backend'
    });
});

// Main report generation endpoint
app.post('/api/generate-report', async (req, res) => {
    try {
        console.log('🚀 Starting report generation...');
        
        const { 
            topics = ['artificial intelligence', 'machine learning', 'deep learning'],
            recipients = [],
            maxPapers = 50
        } = req.body;

        // Check for demo mode (missing environment variables)
        const requiredEnvVars = ['OPENAI_API_KEY', 'MAILGUN_API_KEY', 'MAILGUN_DOMAIN', 'GITHUB_TOKEN'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName] || process.env[varName].includes('placeholder'));
        
        const isDemoMode = missingVars.length > 0;
        
        if (isDemoMode) {
            console.log('⚠️ Running in demo mode - some features will be limited');
        }

        // Step 1: Fetch papers from ArXiv
        console.log('📚 Fetching papers from ArXiv...');
        const papers = await arxivService.fetchPapers(topics, maxPapers);
        
        if (!papers || papers.length === 0) {
            return res.status(404).json({
                error: 'No papers found for the specified topics'
            });
        }

        // Step 2: Generate AI summary (skip in demo mode)
        let aiSummary = null;
        if (!isDemoMode) {
            console.log('🤖 Generating AI summary...');
            try {
                aiSummary = await summaryService.generateSummary(papers, process.env.OPENAI_API_KEY);
            } catch (error) {
                console.log('⚠️ AI summary generation failed, continuing without summary');
            }
        } else {
            console.log('⚠️ Skipping AI summary in demo mode');
        }

        // Step 3: Prepare report data
        const reportDate = new Date().toISOString().split('T')[0];
        const reportData = {
            date: reportDate,
            topics: topics,
            papers: papers,
            aiSummary: aiSummary
        };

        // Step 4: Upload report to GitHub (skip in demo mode)
        let uploadResult = null;
        if (!isDemoMode) {
            console.log('📤 Uploading report to GitHub...');
            try {
                uploadResult = await githubService.uploadReport(reportData, process.env.GITHUB_TOKEN);
                reportData.pagesUrl = uploadResult.pagesUrl;
            } catch (error) {
                console.log('⚠️ GitHub upload failed, continuing without upload');
            }
        } else {
            console.log('⚠️ Skipping GitHub upload in demo mode');
        }

        // Step 5: Send email if recipients provided (skip in demo mode)
        let emailResult = null;
        if (recipients && recipients.length > 0 && !isDemoMode) {
            console.log('📧 Sending email...');
            try {
                emailService.initialize(process.env.MAILGUN_API_KEY, process.env.MAILGUN_DOMAIN);
                emailResult = await emailService.sendEmail(reportData, topics, recipients, new Date());
            } catch (error) {
                console.log('⚠️ Email sending failed, continuing without email');
            }
        } else if (recipients && recipients.length > 0 && isDemoMode) {
            console.log('⚠️ Skipping email in demo mode');
        }

        // Step 6: Return success response
        const response = {
            success: true,
            message: isDemoMode ? 'Report generated successfully (Demo Mode)' : 'Report generated successfully',
            data: {
                reportDate: reportDate,
                topics: topics,
                papersCount: papers.length,
                hasAISummary: !!aiSummary,
                reportUrl: uploadResult?.pagesUrl || null,
                emailSent: !!emailResult,
                demoMode: isDemoMode
            }
        };

        if (emailResult) {
            response.data.emailId = emailResult.messageId;
        }

        console.log('✅ Report generation completed successfully');
        res.json(response);

    } catch (error) {
        console.error('❌ Report generation failed:', error.message);
        res.status(500).json({
            error: 'Report generation failed',
            message: error.message
        });
    }
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Backend is running',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint for individual services
app.post('/api/test/arxiv', async (req, res) => {
    try {
        const { topics = ['artificial intelligence'], maxPapers = 10 } = req.body;
        const papers = await arxivService.fetchPapers(topics, maxPapers);
        res.json({ success: true, papersCount: papers.length, papers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/test/summary', async (req, res) => {
    try {
        const { papers, apiKey } = req.body;
        if (!apiKey) {
            return res.status(400).json({ error: 'OpenAI API key required' });
        }
        const summary = await summaryService.generateSummary(papers, apiKey);
        res.json({ success: true, summary });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 AI News Agent Backend running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 API endpoint: http://localhost:${PORT}/api/generate-report`);
});

module.exports = app; 