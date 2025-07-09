// Settings and Storage Management
class SettingsManager {
    constructor() {
        this.settings = {
            topics: [],
            schedule: 'daily',
            lastRun: null,
            whatsappNumbers: ['+31647388314'], // Your default number
            autoShare: true, // Enable auto-sharing by default - truly autonomous!
            enableNewsSearch: true, // Enable news search by default
            enableResearchSearch: true, // Enable research search by default
            openaiApiKey: '', // OpenAI API key for summary generation
            githubToken: '',
            newsApiKey: '',
            emailConfig: {}, // Mailgun configuration
            emailRecipients: [], // Email recipients list
            autoEmail: false // Auto-email setting
        };
    }

    async init(defaultTopics = []) {
        await this.loadSettings(defaultTopics);
    }

    async loadSettings(defaultTopics = []) {
        try {
            // Load topics
            const savedTopics = localStorage.getItem('aiNewsTopics');
            if (savedTopics) {
                this.settings.topics = JSON.parse(savedTopics);
            } else {
                this.settings.topics = [...defaultTopics];
            }
            
            // Load schedule
            const savedSchedule = localStorage.getItem('aiNewsSchedule');
            if (savedSchedule) {
                this.settings.schedule = savedSchedule;
            }
            
            // Load last run time
            const savedLastRun = localStorage.getItem('aiNewsLastRun');
            if (savedLastRun) {
                this.settings.lastRun = new Date(savedLastRun);
            }

            // Load WhatsApp numbers
            const savedWhatsAppNumbers = localStorage.getItem('aiNewsWhatsAppNumbers');
            if (savedWhatsAppNumbers) {
                this.settings.whatsappNumbers = JSON.parse(savedWhatsAppNumbers);
            }

            // Load auto-share setting
            const savedAutoShare = localStorage.getItem('aiNewsAutoShare');
            if (savedAutoShare !== null) {
                this.settings.autoShare = JSON.parse(savedAutoShare);
            }

            // Load email settings
            const savedEmailConfig = localStorage.getItem('aiNewsEmailConfig');
            if (savedEmailConfig) {
                this.settings.emailConfig = JSON.parse(savedEmailConfig);
            }

            const savedEmailRecipients = localStorage.getItem('aiNewsEmailRecipients');
            if (savedEmailRecipients) {
                this.settings.emailRecipients = JSON.parse(savedEmailRecipients);
            } else {
                this.settings.emailRecipients = [];
            }

            const savedAutoEmail = localStorage.getItem('aiNewsAutoEmail');
            if (savedAutoEmail !== null) {
                this.settings.autoEmail = JSON.parse(savedAutoEmail);
            } else {
                this.settings.autoEmail = false;
            }

            // Load search options
            const savedEnableNewsSearch = localStorage.getItem('aiNewsEnableNewsSearch');
            if (savedEnableNewsSearch !== null) {
                this.settings.enableNewsSearch = JSON.parse(savedEnableNewsSearch);
            }

            const savedEnableResearchSearch = localStorage.getItem('aiNewsEnableResearchSearch');
            if (savedEnableResearchSearch !== null) {
                this.settings.enableResearchSearch = JSON.parse(savedEnableResearchSearch);
            }

            // Load OpenAI API key
            const savedOpenaiApiKey = localStorage.getItem('aiNewsOpenaiApiKey');
            if (savedOpenaiApiKey !== null) {
                this.settings.openaiApiKey = savedOpenaiApiKey;
            }
            
            // Load GitHub token
            const savedGithubToken = localStorage.getItem('aiNewsGithubToken');
            if (savedGithubToken !== null) {
                this.settings.githubToken = savedGithubToken;
            }
            // Load NewsAPI key
            const savedNewsApiKey = localStorage.getItem('aiNewsNewsApiKey');
            if (savedNewsApiKey !== null) {
                this.settings.newsApiKey = savedNewsApiKey;
            }
            
            console.log('Settings loaded successfully');
        } catch (error) {
            console.warn('Could not load saved settings, using defaults:', error);
            this.settings.topics = [...defaultTopics];
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('aiNewsTopics', JSON.stringify(this.settings.topics));
            localStorage.setItem('aiNewsSchedule', this.settings.schedule);
            localStorage.setItem('aiNewsWhatsAppNumbers', JSON.stringify(this.settings.whatsappNumbers));
            localStorage.setItem('aiNewsAutoShare', JSON.stringify(this.settings.autoShare));
            if (this.settings.lastRun) {
                localStorage.setItem('aiNewsLastRun', this.settings.lastRun.toISOString());
            }
            
            // Save email settings
            if (this.settings.emailConfig) {
                localStorage.setItem('aiNewsEmailConfig', JSON.stringify(this.settings.emailConfig));
            }
            if (this.settings.emailRecipients) {
                localStorage.setItem('aiNewsEmailRecipients', JSON.stringify(this.settings.emailRecipients));
            }
            if (this.settings.autoEmail !== undefined) {
                localStorage.setItem('aiNewsAutoEmail', JSON.stringify(this.settings.autoEmail));
            }
            
            // Save search options
            localStorage.setItem('aiNewsEnableNewsSearch', JSON.stringify(this.settings.enableNewsSearch));
            localStorage.setItem('aiNewsEnableResearchSearch', JSON.stringify(this.settings.enableResearchSearch));
            
            // Save OpenAI API key
            if (this.settings.openaiApiKey) {
                localStorage.setItem('aiNewsOpenaiApiKey', this.settings.openaiApiKey);
            }
            if (this.settings.githubToken) {
                localStorage.setItem('aiNewsGithubToken', this.settings.githubToken);
            }
            if (this.settings.newsApiKey) {
                localStorage.setItem('aiNewsNewsApiKey', this.settings.newsApiKey);
            }
            
            console.log('Settings saved successfully');
        } catch (error) {
            console.warn('Could not save settings:', error);
        }
    }

    // Topics methods (unchanged)
    getTopics() {
        return this.settings.topics;
    }

    setTopics(topics) {
        this.settings.topics = topics;
        this.saveSettings();
    }

    addTopic(topic) {
        if (topic && !this.settings.topics.includes(topic)) {
            this.settings.topics.push(topic);
            this.saveSettings();
            return true;
        }
        return false;
    }

    removeTopic(topic) {
        this.settings.topics = this.settings.topics.filter(t => t !== topic);
        this.saveSettings();
    }

    // Schedule methods (unchanged)
    getSchedule() {
        return this.settings.schedule;
    }

    setSchedule(schedule) {
        this.settings.schedule = schedule;
        this.saveSettings();
    }

    getLastRun() {
        return this.settings.lastRun;
    }

    setLastRun(date = new Date()) {
        this.settings.lastRun = date;
        this.saveSettings();
    }

    // WhatsApp methods (new)
    getWhatsAppNumbers() {
        return this.settings.whatsappNumbers;
    }

    setWhatsAppNumbers(numbers) {
        this.settings.whatsappNumbers = numbers;
        this.saveSettings();
    }

    addWhatsAppNumber(number) {
        // Validate and format phone number
        const formattedNumber = this.formatPhoneNumber(number);
        if (formattedNumber && !this.settings.whatsappNumbers.includes(formattedNumber)) {
            this.settings.whatsappNumbers.push(formattedNumber);
            this.saveSettings();
            return true;
        }
        return false;
    }

    removeWhatsAppNumber(number) {
        this.settings.whatsappNumbers = this.settings.whatsappNumbers.filter(n => n !== number);
        this.saveSettings();
    }

    getAutoShare() {
        return this.settings.autoShare;
    }

    setAutoShare(enabled) {
        this.settings.autoShare = enabled;
        this.saveSettings();
    }

    // Email methods
    getEmailConfig() {
        return this.settings.emailConfig || {};
    }

    setEmailConfig(config) {
        this.settings.emailConfig = config;
        this.saveSettings();
    }

    getEmailRecipients() {
        return this.settings.emailRecipients || [];
    }

    setEmailRecipients(recipients) {
        this.settings.emailRecipients = recipients;
        this.saveSettings();
    }

    addEmailRecipient(email) {
        if (!this.settings.emailRecipients) {
            this.settings.emailRecipients = [];
        }
        if (email && !this.settings.emailRecipients.includes(email)) {
            this.settings.emailRecipients.push(email);
            this.saveSettings();
            return true;
        }
        return false;
    }

    removeEmailRecipient(email) {
        if (this.settings.emailRecipients) {
            this.settings.emailRecipients = this.settings.emailRecipients.filter(e => e !== email);
            this.saveSettings();
        }
    }

    getAutoEmail() {
        return this.settings.autoEmail || false;
    }

    setAutoEmail(enabled) {
        this.settings.autoEmail = enabled;
        this.saveSettings();
    }

    // Phone number formatting helper
    formatPhoneNumber(number) {
        // Remove all non-digit characters except +
        let cleaned = number.replace(/[^\d+]/g, '');
        
        // Ensure it starts with +
        if (!cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }
        
        // Basic validation (should be at least 10 digits after +)
        const digits = cleaned.substring(1);
        if (digits.length >= 10 && digits.length <= 15) {
            return cleaned;
        }
        
        return null; // Invalid number
    }

    // Search options methods
    getEnableNewsSearch() {
        return this.settings.enableNewsSearch;
    }

    setEnableNewsSearch(enabled) {
        this.settings.enableNewsSearch = enabled;
        this.saveSettings();
    }

    getEnableResearchSearch() {
        return this.settings.enableResearchSearch;
    }

    setEnableResearchSearch(enabled) {
        this.settings.enableResearchSearch = enabled;
        this.saveSettings();
    }

    // OpenAI API key methods
    getOpenaiApiKey() {
        return this.settings.openaiApiKey;
    }

    setOpenaiApiKey(key) {
        this.settings.openaiApiKey = key;
        this.saveSettings();
    }

    getGithubToken() {
        return this.settings.githubToken;
    }
    setGithubToken(token) {
        this.settings.githubToken = token;
        this.saveSettings();
    }
    getNewsApiKey() {
        return this.settings.newsApiKey;
    }
    setNewsApiKey(key) {
        this.settings.newsApiKey = key;
        this.saveSettings();
    }

    // Export/Import methods (enhanced)
    exportSettings() {
        // Export all settings fields, including email, API keys, tokens, etc.
        const exportData = {
            ...this.settings,
            exportDate: new Date().toISOString(),
            version: '2.1'
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ai-news-settings-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        if (window.uiManager) {
            window.uiManager.showStatusMessage('Settings exported successfully!', 'success');
        }
    }



    importSettings() {
        const fileInput = document.getElementById('importFile');
        const file = fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedSettings = JSON.parse(e.target.result);
                // Restore all known fields
                if (importedSettings.topics && Array.isArray(importedSettings.topics)) {
                    this.settings.topics = importedSettings.topics;
                }
                if (importedSettings.schedule) {
                    this.settings.schedule = importedSettings.schedule;
                }
                if (importedSettings.lastRun) {
                    this.settings.lastRun = new Date(importedSettings.lastRun);
                }
                if (importedSettings.whatsappNumbers && Array.isArray(importedSettings.whatsappNumbers)) {
                    this.settings.whatsappNumbers = importedSettings.whatsappNumbers;
                }
                if (importedSettings.autoShare !== undefined) {
                    this.settings.autoShare = importedSettings.autoShare;
                }
                if (importedSettings.emailConfig) {
                    this.settings.emailConfig = importedSettings.emailConfig;
                }
                if (importedSettings.emailRecipients) {
                    this.settings.emailRecipients = importedSettings.emailRecipients;
                }
                if (importedSettings.autoEmail !== undefined) {
                    this.settings.autoEmail = importedSettings.autoEmail;
                }
                if (importedSettings.enableNewsSearch !== undefined) {
                    this.settings.enableNewsSearch = importedSettings.enableNewsSearch;
                }
                if (importedSettings.enableResearchSearch !== undefined) {
                    this.settings.enableResearchSearch = importedSettings.enableResearchSearch;
                }
                if (importedSettings.openaiApiKey) {
                    this.settings.openaiApiKey = importedSettings.openaiApiKey;
                }
                if (importedSettings.githubToken) {
                    this.settings.githubToken = importedSettings.githubToken;
                }
                if (importedSettings.newsApiKey) {
                    this.settings.newsApiKey = importedSettings.newsApiKey;
                }
                // Save and update UI
                this.saveSettings();
                if (window.topicsManager) {
                    window.topicsManager.updateDisplay();
                }
                if (window.schedulerManager) {
                    window.schedulerManager.updateDisplay();
                }
                if (window.uiManager) {
                    window.uiManager.showStatusMessage('Settings imported successfully!', 'success');
                }
            } catch (error) {
                console.error('Error importing settings:', error);
                if (window.uiManager) {
                    window.uiManager.showStatusMessage('Error importing settings file', 'error');
                }
            }
        };
        reader.readAsText(file);
        fileInput.value = '';
    }
}

// Make available globally
window.SettingsManager = SettingsManager;