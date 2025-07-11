// Email Sender Module using Mailgun API
class EmailSender {
    constructor() {
        this.mailgun = null;
        this.domain = null;
        this.apiKey = null;
        this.senderEmail = null;
        this.recipients = [];
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('📧 Initializing Email Sender...');
            
            // Check browser compatibility
            if (typeof fetch === 'undefined') {
                throw new Error('Fetch API not available. Please use a modern browser.');
            }
            
            if (typeof FormData === 'undefined') {
                throw new Error('FormData not available. Please use a modern browser.');
            }
            
            // Load email configuration
            const config = this.loadEmailConfig();
            if (config.apiKey && config.domain) {
                await this.initializeMailgun(config);
            }
            
            // Load recipients
            this.recipients = this.loadRecipients();
            
            this.isInitialized = true;
            console.log('✅ Email Sender initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Email Sender:', error);
            // Don't throw here, allow the app to continue without email functionality
        }
    }

    loadEmailConfig() {
        try {
            if (window.settingsManager) {
                return window.settingsManager.getEmailConfig();
            }
            console.warn('settingsManager not available, returning empty config');
            return {};
        } catch (error) {
            console.error('Error loading email config:', error);
            return {};
        }
    }

    saveEmailConfig(config) {
        try {
            if (window.settingsManager) {
                window.settingsManager.setEmailConfig(config);
            } else {
                console.warn('settingsManager not available, cannot save email config');
            }
            console.log('✅ Email config saved successfully');
        } catch (error) {
            console.error('Error saving email config:', error);
        }
    }

    loadRecipients() {
        try {
            if (window.settingsManager) {
                return window.settingsManager.getEmailRecipients();
            }
            console.warn('settingsManager not available, returning empty recipients');
            return [];
        } catch (error) {
            console.error('Error loading email recipients:', error);
            return [];
        }
    }

    saveRecipients(recipients) {
        try {
            if (window.settingsManager) {
                window.settingsManager.setEmailRecipients(recipients);
            } else {
                console.warn('settingsManager not available, cannot save recipients');
            }
            console.log('✅ Email recipients saved successfully');
        } catch (error) {
            console.error('Error saving email recipients:', error);
        }
    }

    async initializeMailgun(config) {
        try {
            // For browser compatibility, we'll use a different approach
            // Since we can't use Node.js modules in browser, we'll create a simple HTTP client
            this.domain = config.domain;
            this.apiKey = config.apiKey;
            this.senderEmail = config.senderEmail || `noreply@${config.domain}`;
            
            // Test the configuration by making a simple API call
            await this.testMailgunConnection();
            
            console.log('✅ Mailgun initialized with domain:', this.domain);
        } catch (error) {
            console.error('❌ Failed to initialize Mailgun:', error);
            throw new Error('Mailgun initialization failed. Please check your API key and domain.');
        }
    }

    async testMailgunConnection() {
        // Test the Mailgun connection by fetching domains
        const response = await fetch(`https://api.mailgun.net/v3/domains/${this.domain}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + btoa(`api:${this.apiKey}`),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Mailgun API test failed: ${response.status} ${response.statusText}`);
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    addRecipient(email) {
        if (!this.validateEmail(email)) {
            throw new Error('Invalid email address format');
        }
        
        if (this.recipients.includes(email)) {
            throw new Error('Email address already exists');
        }
        
        this.recipients.push(email);
        this.saveRecipients(this.recipients);
        return true;
    }

    removeRecipient(email) {
        const index = this.recipients.indexOf(email);
        if (index > -1) {
            this.recipients.splice(index, 1);
            this.saveRecipients(this.recipients);
            return true;
        }
        return false;
    }

    getRecipients() {
        return [...this.recipients];
    }

    async sendEmail(subject, htmlContent, textContent = null) {
        if (!this.isInitialized || !this.domain || !this.apiKey) {
            throw new Error('Email sender not initialized. Please configure Mailgun settings.');
        }

        if (this.recipients.length === 0) {
            throw new Error('No email recipients configured.');
        }

        try {
            // Create form data for Mailgun API
            const formData = new FormData();
            formData.append('from', this.senderEmail);
            formData.append('to', this.recipients.join(', '));
            formData.append('subject', subject);
            formData.append('html', htmlContent);
            if (textContent) {
                formData.append('text', textContent);
            }

            console.log('📧 Sending email to:', this.recipients.length, 'recipients');
            
            const response = await fetch(`https://api.mailgun.net/v3/${this.domain}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + btoa(`api:${this.apiKey}`)
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Mailgun API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Email sent successfully:', result.id);
            return {
                success: true,
                messageId: result.id,
                recipients: this.recipients.length
            };
        } catch (error) {
            console.error('❌ Email sending failed:', error);
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }

    stripHtml(html) {
        // Simple HTML to text conversion
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    createEmailTemplate(reportData, topics, reportDate) {
        const dateStr = reportDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const topicsStr = topics.join(', ');
        
        // Get AI summary from the reportData argument
        let aiSummary = reportData.aiSummary || '';
        let reportUrl = reportData.pagesUrl || (window.githubUploader ? window.githubUploader.getReportsArchiveUrl() : '#');
        
        // Check if AI summary is available
        const hasAISummary = aiSummary && aiSummary.trim() !== '';
        
        // Print the reportUrl that will be included in the email (DEBUG)
        console.log('[DEBUG] Email will include report link:', reportUrl);

        // Create HTML email template
        const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Research News Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background: #f8f9fa; }
        .ai-summary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .ai-summary h3 { color: white; margin-bottom: 15px; }
        .ai-summary p { color: white; margin-bottom: 15px; }
        .ai-summary .generated-by { font-size: 12px; opacity: 0.9; color: white; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
        .stat { text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .stat-number { font-size: 1.5em; font-weight: bold; color: #667eea; }
        .stat-label { font-size: 12px; color: #666; }
        .full-report-link { text-align: center; margin: 20px 0; }
        .full-report-link a { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .topic-tag { background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-right: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 AI Research News Report</h1>
        <p>${dateStr}</p>
        <p>Topics: ${topicsStr}</p>
    </div>
    
    <div class="content">
        ${hasAISummary ? `
        <div class="ai-summary">
            <h3>🤖 AI Research Summary</h3>
            ${aiSummary.split('\n').map(paragraph => 
                paragraph.trim() ? `<p>${paragraph}</p>` : ''
            ).join('')}
            <div class="generated-by">Generated by OpenAI GPT-4o-mini</div>
        </div>
        ` : `
        <div style="text-align: center; padding: 20px; color: #666;">
            <p>📊 Report Summary</p>
            <p>No AI summary available. Please check the full report for details.</p>
        </div>
        `}
        
        <div class="stats">
            <div class="stat">
                <div class="stat-number">${reportData.metadata.totalItems}</div>
                <div class="stat-label">Total Items</div>
            </div>
            <div class="stat">
                <div class="stat-number">${reportData.metadata.newsArticles}</div>
                <div class="stat-label">News Articles</div>
            </div>
            <div class="stat">
                <div class="stat-number">${reportData.metadata.researchPapers}</div>
                <div class="stat-label">Research Papers</div>
            </div>
        </div>
        
        <div class="full-report-link">
            <a href="${reportUrl}" target="_blank">
                📄 View Full Report with All Papers
            </a>
        </div>
    </div>
    
    <div class="footer">
        <p>Generated by AI Research News Agent</p>
        <p>Stay updated with the latest developments in artificial intelligence research</p>
    </div>
</body>
</html>`;

        return htmlTemplate;
    }

    async sendReportEmail(reportData, topics, reportDate) {
        try {
            const subject = `AI Research News Report - ${reportDate.toLocaleDateString()}`;
            const htmlContent = this.createEmailTemplate(reportData, topics, reportDate);
            // Print the reportUrl that will be included in the email (DEBUG)
            let reportUrl = '#';
            if (reportData && reportData.pagesUrl) {
                reportUrl = reportData.pagesUrl;
            } else if (window.githubUploader) {
                reportUrl = window.githubUploader.getReportsArchiveUrl();
            }
            console.log('[DEBUG] Email will include report link (sendReportEmail):', reportUrl);
            return await this.sendEmail(subject, htmlContent);
        } catch (error) {
            console.error('❌ Failed to send report email:', error);
            throw error;
        }
    }

    async autoSendReport(reportData, topics, reportDate) {
        try {
            console.log('📧 Auto-sending report email...');
            // Print the reportUrl that will be included in the email (DEBUG)
            let reportUrl = '#';
            if (reportData && reportData.pagesUrl) {
                reportUrl = reportData.pagesUrl;
            } else if (window.githubUploader) {
                reportUrl = window.githubUploader.getReportsArchiveUrl();
            }
            console.log('[DEBUG] Email will include report link (autoSendReport):', reportUrl);
            if (!window.settingsManager.getAutoEmail()) {
                console.log('📧 Auto-email disabled');
                return { success: false, reason: 'Auto-email disabled' };
            }
            const result = await this.sendReportEmail(reportData, topics, reportDate);
            if (window.uiManager) {
                window.uiManager.showStatusMessage(`Email sent successfully to ${result.recipients} recipients!`, 'success');
            }
            return result;
        } catch (error) {
            console.error('❌ Auto-email failed:', error);
            if (window.uiManager) {
                window.uiManager.showStatusMessage(`Email sending failed: ${error.message}`, 'error');
            }
            throw error;
        }
    }

    showManualEmailModal() {
        // Check if email is properly configured
        if (!this.isInitialized || !this.domain || !this.apiKey) {
            alert('Email not configured. Please set up Mailgun API key and domain in Settings → API Keys first.');
            return;
        }

        if (this.recipients.length === 0) {
            alert('No email recipients configured. Please add email recipients in Settings → API Keys → Email Sharing first.');
            return;
        }

        // Create modal for manual email sending
        const modal = document.createElement('div');
        modal.id = 'emailModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
            align-items: center; justify-content: center;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin-bottom: 20px; color: #333;">📧 Send Report via Email</h3>
                
                <div style="margin-bottom: 20px;">
                    <p style="color: #666; margin-bottom: 15px;">
                        <strong>From:</strong> ${this.senderEmail}<br>
                        <strong>To:</strong> ${this.recipients.join(', ')}
                    </p>
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <h4 style="margin-bottom: 10px; color: #333;">Email Recipients (${this.recipients.length})</h4>
                        <div id="emailRecipientsList">
                            ${this.recipients.map(email => `
                                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: white; border-radius: 8px; margin-bottom: 5px; border: 1px solid #e0e0e0;">
                                    <span style="font-family: monospace;">${email}</span>
                                    <button onclick="removeEmailRecipient('${email}')" style="background: #ff4757; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center;">×</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <input type="email" id="newEmailRecipient" placeholder="Add new recipient..." style="flex: 1; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                        <button class="btn btn-secondary" onclick="addEmailRecipient()">Add</button>
                    </div>
                    <small style="color: #666;">Recipients are saved automatically</small>
                </div>
                
                <div style="margin-top: 25px; text-align: right;">
                    <button class="btn btn-secondary" onclick="closeEmailModal()" style="margin-right: 10px;">Cancel</button>
                    <button class="btn btn-primary" onclick="sendManualEmail()">📧 Send Email Report</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add global functions for modal interaction
        window.addEmailRecipient = () => {
            const input = document.getElementById('newEmailRecipient');
            const email = input.value.trim();
            
            if (!email) {
                alert('Please enter an email address');
                return;
            }
            
            try {
                this.addRecipient(email);
                this.updateEmailRecipientsList();
                input.value = '';
            } catch (error) {
                alert(error.message);
            }
        };
        
        window.removeEmailRecipient = (email) => {
            if (confirm(`Remove ${email} from email recipients?`)) {
                this.removeRecipient(email);
                this.updateEmailRecipientsList();
            }
        };
        
        window.closeEmailModal = () => {
            document.body.removeChild(modal);
        };
        
        window.sendManualEmail = async () => {
            try {
                const lastReport = window.reportGenerator.getLastReport();
                if (!lastReport) {
                    alert('No report available to send. Please generate a report first.');
                    return;
                }
                
                const activeTopics = window.settingsManager.getTopics();
                const result = await this.sendReportEmail(lastReport, activeTopics, new Date());
                
                alert(`✅ Email sent successfully to ${result.recipients} recipients!`);
                window.closeEmailModal();
                
                // Show success message in UI
                if (window.uiManager) {
                    window.uiManager.showStatusMessage(`Email sent successfully to ${result.recipients} recipients!`, 'success');
                }
            } catch (error) {
                alert(`❌ Failed to send email: ${error.message}`);
                console.error('Email sending error:', error);
            }
        };
        
        this.updateEmailRecipientsList = () => {
            const list = document.getElementById('emailRecipientsList');
            if (list) {
                list.innerHTML = this.recipients.map(email => `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: white; border-radius: 8px; margin-bottom: 5px; border: 1px solid #e0e0e0;">
                        <span style="font-family: monospace;">${email}</span>
                        <button onclick="removeEmailRecipient('${email}')" style="background: #ff4757; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center;">×</button>
                    </div>
                `).join('');
            }
        };
    }

    // Configuration methods
    setEmailConfig(config) {
        this.saveEmailConfig(config);
        if (config.apiKey && config.domain) {
            this.initializeMailgun(config);
        }
    }

    getEmailConfig() {
        return this.loadEmailConfig();
    }

    setAutoEmail(enabled) {
        try {
            if (window.settingsManager) {
                window.settingsManager.setAutoEmail(enabled);
            } else {
                console.warn('settingsManager not available, cannot save auto-email setting');
            }
        } catch (error) {
            console.error('Error saving auto-email setting:', error);
        }
    }

    getAutoEmail() {
        try {
            if (window.settingsManager) {
                return window.settingsManager.getAutoEmail();
            }
            console.warn('settingsManager not available, returning false for auto-email');
            return false;
        } catch (error) {
            console.error('Error loading auto-email setting:', error);
            return false;
        }
    }
}

// Make available globally
window.EmailSender = EmailSender; 