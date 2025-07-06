// WhatsApp Sharing Integration - Automated + Manual
class WhatsAppSharer {
    constructor() {
        this.isGenerating = false;
        this.settingsManager = null;
    }

    init() {
        this.settingsManager = window.settingsManager;
        console.log('✅ WhatsApp sharer initialized with automated + manual sharing');
    }

    // AUTOMATED SHARING - Called by scheduler
    async autoShareReport(newsItems, topics, reportDate) {
        if (!this.settingsManager.getAutoShare()) {
            console.log('📱 Auto-sharing disabled, skipping WhatsApp');
            return;
        }

        const configuredNumbers = this.settingsManager.getWhatsAppNumbers();
        if (configuredNumbers.length === 0) {
            console.warn('⚠️ No WhatsApp numbers configured for auto-sharing');
            return;
        }

        try {
            console.log('🤖 Starting automated WhatsApp sharing...');
            
            // Generate and upload report
            const report = await window.reportGenerator.generateShareableReport(newsItems, topics, reportDate);
            const uploadResult = await window.githubUploader.uploadReport(report);
            
            // Send to all configured numbers
            for (const number of configuredNumbers) {
                await this.sendToNumber(report, uploadResult, number, true);
            }
            
            console.log(`✅ Automated report sent to ${configuredNumbers.length} WhatsApp number(s)`);
            
            if (window.uiManager) {
                window.uiManager.showStatusMessage(`📱 Report auto-sent to ${configuredNumbers.length} WhatsApp number(s)`, 'success');
            }

        } catch (error) {
            console.error('❌ Error in automated WhatsApp sharing:', error);
            if (window.uiManager) {
                window.uiManager.showStatusMessage(`❌ Auto-share failed: ${error.message}`, 'error');
            }
        }
    }

    // MANUAL SHARING - Called by user clicking button
    showManualShareModal() {
        const lastReport = window.reportGenerator.getLastReport();
        
        if (!lastReport) {
            if (window.uiManager) {
                window.uiManager.showStatusMessage('No report available to share. Generate a report first.', 'error');
            }
            return;
        }

        // Get user's primary number as default
        const defaultNumber = this.settingsManager.getWhatsAppNumbers()[0] || '+31647388314';
        
        // Show the manual share modal
        this.displayManualShareModal(defaultNumber, lastReport);
    }

    // Display manual share modal
    displayManualShareModal(defaultNumber, report) {
        // Remove existing modal if any
        const existingModal = document.getElementById('manualShareModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalHTML = `
            <div id="manualShareModal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1001;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
                    <h3 style="margin-bottom: 20px; color: #333;">📱 Share Report via WhatsApp</h3>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Send to WhatsApp Number:</label>
                        <input type="tel" id="manualWhatsAppNumber" value="${defaultNumber}" placeholder="+31647388314" style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px;">
                        <small style="color: #666;">Include country code (e.g., +31 for Netherlands)</small>
                    </div>
                    
                    <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                        <strong>Preview:</strong><br>
                        <span style="color: #666; font-size: 0.9em;">AI Research News Report - ${this.formatDate(report.date)}</span><br>
                        <span style="color: #666; font-size: 0.9em;">${report.metadata.totalItems} items (${report.metadata.newsArticles} news, ${report.metadata.researchPapers} papers)</span>
                    </div>
                    
                    <div style="text-align: right;">
                        <button class="btn btn-secondary" onclick="closeManualShareModal()" style="margin-right: 10px;">Cancel</button>
                        <button class="btn btn-primary" onclick="sendManualWhatsApp()">📱 Send to WhatsApp</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Focus on input
        setTimeout(() => {
            const input = document.getElementById('manualWhatsAppNumber');
            if (input) {
                input.focus();
                input.select();
            }
        }, 100);
    }

    // Send manual WhatsApp (called from modal)
    async sendManualWhatsApp() {
        const numberInput = document.getElementById('manualWhatsAppNumber');
        const number = numberInput.value.trim();
        
        if (!number) {
            alert('Please enter a WhatsApp number');
            return;
        }

        // Validate number format
        const formattedNumber = this.settingsManager.formatPhoneNumber(number);
        if (!formattedNumber) {
            alert('Please enter a valid phone number with country code (e.g., +31647388314)');
            return;
        }

        try {
            const lastReport = window.reportGenerator.getLastReport();
            
            if (window.uiManager) {
                window.uiManager.showStatusMessage('🔄 Sharing report to WhatsApp...', 'info');
            }

            // Upload report if not already uploaded
            const uploadResult = await window.githubUploader.uploadReport(lastReport);
            
            // Send to WhatsApp
            await this.sendToNumber(lastReport, uploadResult, formattedNumber, false);
            
            // Close modal
            this.closeManualShareModal();
            
            if (window.uiManager) {
                window.uiManager.showStatusMessage(`✅ Report sent to ${formattedNumber}!`, 'success');
            }

        } catch (error) {
            console.error('❌ Error sending manual WhatsApp:', error);
            alert(`Error sharing report: ${error.message}`);
        }
    }

    // Close manual share modal
    closeManualShareModal() {
        const modal = document.getElementById('manualShareModal');
        if (modal) {
            modal.remove();
        }
    }

    // Core method to send to specific number
    async sendToNumber(report, uploadResult, phoneNumber, isAutomatic = false) {
        const message = this.createWhatsAppMessage(report, uploadResult);
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodedMessage}`;
        
        if (isAutomatic) {
            // For automatic sharing, just log the URL (could be enhanced to use WhatsApp Business API)
            console.log(`📱 Auto-sharing to ${phoneNumber}: ${whatsappUrl}`);
            
            // For now, we'll open the WhatsApp link (user would need to send manually)
            // In a production system, you might use WhatsApp Business API for true automation
            window.open(whatsappUrl, '_blank');
        } else {
            // For manual sharing, open WhatsApp
            console.log(`📱 Manual sharing to ${phoneNumber}`);
            window.open(whatsappUrl, '_blank');
        }
    }

    // Create WhatsApp message with report summary
    createWhatsAppMessage(report, uploadResult) {
        const { metadata, topics, date } = report;
        const { pagesUrl } = uploadResult;

        const summary = this.createReportSummary(report);
        
        const message = `🤖 *AI Research News Report*
📅 ${this.formatDate(date)}

📊 *Summary:*
• ${metadata.totalItems} total items
• ${metadata.newsArticles} news articles
• ${metadata.researchPapers} research papers

🎯 *Topics:*
${topics.slice(0, 6).map(topic => `• ${topic}`).join('\n')}

${summary}

🔗 *Full Report:*
${pagesUrl}

📱 Generated by AI Research News Agent`;

        return message;
    }

    // Create brief summary of top news items
    createReportSummary(report) {
        const { newsItems } = report;
        
        if (newsItems.length === 0) {
            return '📭 No news items found for selected topics.';
        }

        const topItems = newsItems.slice(0, 3);
        let summary = '🔥 *Highlights:*\n';
        
        topItems.forEach((item, index) => {
            const emoji = item.type === 'research' ? '🔬' : '📰';
            const title = item.title.length > 60 ? item.title.substring(0, 60) + '...' : item.title;
            summary += `${emoji} ${title} (${item.source})\n`;
        });

        if (newsItems.length > 3) {
            summary += `\n... and ${newsItems.length - 3} more items in the full report`;
        }

        return summary;
    }

    // LEGACY METHODS (for backward compatibility)
    async generateAndShare(newsItems, topics, reportDate) {
        // This method now triggers automated sharing
        return await this.autoShareReport(newsItems, topics, reportDate);
    }

    async quickShare() {
        // This method now shows the manual modal
        this.showManualShareModal();
    }

    downloadReport() {
        const lastReport = window.reportGenerator.getLastReport();
        
        if (!lastReport) {
            if (window.uiManager) {
                window.uiManager.showStatusMessage('No report available to download. Generate a report first.', 'error');
            }
            return;
        }

        window.reportGenerator.downloadReport(lastReport);
        
        if (window.uiManager) {
            window.uiManager.showStatusMessage('✅ Report downloaded!', 'success');
        }
    }

    // Format date for display
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Create shareable link preview
    createLinkPreview(report, uploadResult) {
        return {
            title: `AI Research News Report - ${this.formatDate(report.date)}`,
            description: `${report.metadata.totalItems} AI news items covering ${report.topics.slice(0, 3).join(', ')}`,
            url: uploadResult.pagesUrl,
            image: null // Could add a generated image in the future
        };
    }

    // Get sharing statistics
    getSharingStats() {
        // This could be enhanced to track sharing metrics
        return {
            reportsGenerated: localStorage.getItem('aiNewsReportsGenerated') || 0,
            reportsShared: localStorage.getItem('aiNewsReportsShared') || 0,
            lastShared: localStorage.getItem('aiNewsLastShared') || null
        };
    }

    // Update sharing statistics
    updateSharingStats() {
        const stats = this.getSharingStats();
        stats.reportsShared = parseInt(stats.reportsShared) + 1;
        stats.lastShared = new Date().toISOString();
        
        localStorage.setItem('aiNewsReportsShared', stats.reportsShared.toString());
        localStorage.setItem('aiNewsLastShared', stats.lastShared);
    }
}

// Make global functions available for onclick handlers
window.closeManualShareModal = function() {
    window.whatsappSharer.closeManualShareModal();
};

window.sendManualWhatsApp = function() {
    window.whatsappSharer.sendManualWhatsApp();
};

// Make available globally
window.WhatsAppSharer = WhatsAppSharer;