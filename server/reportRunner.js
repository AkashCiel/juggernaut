const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(FormData);

// Import the core logic from the browser modules (adapted for Node.js)
const { fetchArxivPapers } = require('./arxivAPI');
const { generateAISummary } = require('./summaryGenerator');
const { uploadToGitHub } = require('./githubUploader');

class ServerReportRunner {
    constructor() {
        this.settings = null;
        this.mailgunClient = null;
    }

    async loadSettingsFromEnvironment() {
        try {
            console.log('🔐 Loading settings from GitHub Secrets...');
            
            // Load all settings from environment variables
            this.settings = {
                topics: this.parseJsonFromEnv('TOPICS', []),
                schedule: process.env.SCHEDULE || 'daily',
                lastRun: process.env.LAST_RUN ? new Date(process.env.LAST_RUN) : null,
                whatsappNumbers: this.parseJsonFromEnv('WHATSAPP_NUMBERS', []),
                autoShare: this.parseBooleanFromEnv('AUTO_SHARE', false),
                enableNewsSearch: this.parseBooleanFromEnv('ENABLE_NEWS_SEARCH', true),
                enableResearchSearch: this.parseBooleanFromEnv('ENABLE_RESEARCH_SEARCH', true),
                openaiApiKey: process.env.OPENAI_API_KEY || '',
                githubToken: process.env.GITHUB_TOKEN || '',
                newsApiKey: process.env.NEWS_API_KEY || '',
                emailConfig: {
                    apiKey: process.env.MAILGUN_API_KEY || '',
                    domain: process.env.MAILGUN_DOMAIN || ''
                },
                emailRecipients: this.parseJsonFromEnv('EMAIL_RECIPIENTS', []),
                autoEmail: this.parseBooleanFromEnv('AUTO_EMAIL', false)
            };
            
            // Initialize Mailgun client
            if (this.settings.emailConfig && this.settings.emailConfig.apiKey) {
                this.mailgunClient = mailgun.client({
                    username: 'api',
                    key: this.settings.emailConfig.apiKey
                });
            }

            // Validate required settings
            if (!this.settings.topics || this.settings.topics.length === 0) {
                throw new Error('No topics configured in GitHub Secrets');
            }
            
            if (!this.settings.emailRecipients || this.settings.emailRecipients.length === 0) {
                console.warn('⚠️ No email recipients configured');
            }

            console.log('✅ Settings loaded from GitHub Secrets successfully');
            console.log(`📚 Topics: ${this.settings.topics.join(', ')}`);
            console.log(`📧 Email recipients: ${this.settings.emailRecipients.join(', ')}`);
            
            return this.settings;
        } catch (error) {
            console.error('❌ Error loading settings from environment:', error.message);
            throw error;
        }
    }

    parseJsonFromEnv(key, defaultValue) {
        try {
            const value = process.env[key];
            return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
            console.warn(`⚠️ Could not parse ${key} from environment, using default`);
            return defaultValue;
        }
    }

    parseBooleanFromEnv(key, defaultValue) {
        const value = process.env[key];
        if (value === undefined) return defaultValue;
        return value.toLowerCase() === 'true';
    }

    async generateReport() {
        if (!this.settings) {
            throw new Error('Settings not loaded');
        }

        console.log('🔍 Starting report generation...');
        
        const reportData = {
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            topics: this.settings.topics,
            papers: [],
            aiSummary: '',
            pagesUrl: ''
        };

        // Fetch research papers
        if (this.settings.enableResearchSearch) {
            console.log('📚 Fetching research papers...');
            const papers = await fetchArxivPapers(this.settings.topics);
            reportData.papers = papers;
            console.log(`✅ Found ${papers.length} papers`);
        }

        // Generate AI summary
        if (this.settings.openaiApiKey && reportData.papers.length > 0) {
            console.log('🤖 Generating AI summary...');
            try {
                const summary = await generateAISummary(reportData.papers, this.settings.openaiApiKey);
                reportData.aiSummary = summary;
                console.log('✅ AI summary generated');
            } catch (error) {
                console.error('❌ Error generating AI summary:', error.message);
                reportData.aiSummary = 'AI summary generation failed.';
            }
        }

        // Upload to GitHub
        if (this.settings.githubToken) {
            console.log('📤 Uploading to GitHub...');
            try {
                const uploadResult = await uploadToGitHub(reportData, this.settings.githubToken);
                reportData.pagesUrl = uploadResult.pagesUrl;
                console.log('✅ Report uploaded to GitHub');
            } catch (error) {
                console.error('❌ Error uploading to GitHub:', error.message);
            }
        }

        return reportData;
    }

    async sendEmail(reportData) {
        if (!this.mailgunClient || !this.settings.emailRecipients || !this.settings.autoEmail) {
            console.log('📧 Email sending disabled or not configured');
            return;
        }

        console.log('📧 Sending email...');

        const emailContent = this.generateEmailContent(reportData);
        
        try {
            const messageData = {
                from: `AI News Agent <noreply@${this.settings.emailConfig.domain}>`,
                to: this.settings.emailRecipients,
                subject: `AI Research Report - ${reportData.date}`,
                html: emailContent
            };

            const response = await this.mailgunClient.messages.create(this.settings.emailConfig.domain, messageData);
            console.log('✅ Email sent successfully:', response.id);
        } catch (error) {
            console.error('❌ Error sending email:', error.message);
        }
    }

    generateEmailContent(reportData) {
        const summarySection = reportData.aiSummary 
            ? `<h3>AI Summary</h3><p>${reportData.aiSummary}</p>` 
            : '';

        const papersSection = reportData.papers.length > 0 
            ? `<h3>Research Papers (${reportData.papers.length})</h3><p>View the complete report with all papers and detailed summaries.</p>` 
            : '';

        const reportLink = reportData.pagesUrl 
            ? `<p><a href="${reportData.pagesUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Full Report</a></p>` 
            : '';

        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>🤖 AI Research Report - ${reportData.date}</h2>
                <p>Your daily AI research digest is ready!</p>
                
                ${summarySection}
                ${papersSection}
                ${reportLink}
                
                <hr>
                <p style="color: #666; font-size: 12px;">
                    Generated by AI News Agent<br>
                    Topics: ${reportData.topics.join(', ')}
                </p>
            </div>
        `;
    }

    async run() {
        try {
            console.log('🚀 Starting automated report generation...');
            
            // Load settings from GitHub Secrets
            await this.loadSettingsFromEnvironment();
            
            // Generate report
            const reportData = await this.generateReport();
            
            // Send email
            await this.sendEmail(reportData);
            
            console.log('✅ Report generation completed successfully!');
            
        } catch (error) {
            console.error('❌ Report generation failed:', error.message);
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const runner = new ServerReportRunner();
    runner.run();
}

module.exports = { ServerReportRunner }; 