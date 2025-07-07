// Scheduling Management
class SchedulerManager {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
    }

    init() {
        this.updateDisplay();
    }

    updateDisplay() {
        const currentSchedule = this.settingsManager.getSchedule();
        
        // Update schedule option display
        document.querySelectorAll('.schedule-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.schedule === currentSchedule) {
                option.classList.add('active');
            }
        });
    }

    setSchedule(schedule) {
        const validSchedules = ['daily', 'weekly', 'manual'];
        
        if (!validSchedules.includes(schedule)) {
            console.warn('Invalid schedule:', schedule);
            return;
        }

        this.settingsManager.setSchedule(schedule);
        this.updateDisplay();
        
        if (window.uiManager) {
            window.uiManager.showStatusMessage(`Schedule updated to: ${schedule}`, 'success');
        }
    }

    checkScheduledRun() {
        const schedule = this.settingsManager.getSchedule();
        
        if (schedule === 'manual') {
            console.log('Manual mode - no automatic scheduling');
            return;
        }
        
        const lastRun = this.settingsManager.getLastRun();
        const now = new Date();
        
        if (!lastRun) {
            this.triggerScheduledRun('First run');
            return;
        }
        
        const timeDiff = now - lastRun;
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        let shouldRun = false;
        let reason = '';
        
        switch (schedule) {
            case 'daily':
                if (hoursDiff >= 24) {
                    shouldRun = true;
                    reason = 'Daily schedule triggered';
                }
                break;
            case 'weekly':
                if (hoursDiff >= 168) { // 7 days * 24 hours
                    shouldRun = true;
                    reason = 'Weekly schedule triggered';
                }
                break;
        }
        
        if (shouldRun) {
            this.triggerScheduledRun(reason);
        } else {
            const nextRun = this.getNextRunTime(lastRun, schedule);
            console.log(`Next scheduled run: ${nextRun.toLocaleString()}`);
        }
    }

    triggerScheduledRun(reason) {
        console.log('Scheduled run triggered:', reason);
        
        if (window.uiManager) {
            window.uiManager.showStatusMessage('Scheduled report generation triggered!', 'info');
        }
        
        // Delay to show the message, then generate report with auto-sharing
        setTimeout(async () => {
            if (window.newsGenerator) {
                try {
                    // Generate the regular report
                    await window.newsGenerator.generateReport();
                    
                    // If auto-sharing is enabled, trigger WhatsApp sharing
                    if (window.settingsManager.getAutoShare()) {
                        console.log('🤖 Triggering automated WhatsApp sharing...');
                        
                        // Get current news data for sharing
                        const activeTopics = window.settingsManager.getTopics();
                        const lastReport = window.reportGenerator.getLastReport();
                        
                        if (lastReport) {
                            // Auto-share the generated report
                            await window.whatsappSharer.autoShareReport(
                                lastReport.newsItems, 
                                activeTopics, 
                                new Date()
                            );
                        }
                    } else {
                        console.log('📱 Auto-sharing disabled, report generated only');
                    }
                    
                    // If auto-email is enabled, trigger email sending
                    if (window.emailSender && window.emailSender.getAutoEmail()) {
                        console.log('📧 Triggering automated email sending...');
                        
                        const activeTopics = window.settingsManager.getTopics();
                        const lastReport = window.reportGenerator.getLastReport();
                        
                        if (lastReport) {
                            // Auto-send the generated report via email
                            await window.emailSender.autoSendReport(
                                lastReport, 
                                activeTopics, 
                                new Date()
                            );
                        }
                    } else {
                        console.log('📧 Auto-email disabled, email sending skipped');
                    }
                } catch (error) {
                    console.error('❌ Error in scheduled run:', error);
                    if (window.uiManager) {
                        window.uiManager.showStatusMessage('Error in scheduled report generation', 'error');
                    }
                }
            }
        }, 1000);
    }

    getNextRunTime(lastRun, schedule) {
        const nextRun = new Date(lastRun);
        
        switch (schedule) {
            case 'daily':
                nextRun.setDate(nextRun.getDate() + 1);
                break;
            case 'weekly':
                nextRun.setDate(nextRun.getDate() + 7);
                break;
        }
        
        return nextRun;
    }
}

// Make available globally
window.SchedulerManager = SchedulerManager;