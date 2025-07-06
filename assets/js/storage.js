// Settings and Storage Management
class SettingsManager {
    constructor() {
        this.settings = {
            topics: [],
            schedule: 'daily',
            lastRun: null,
            whatsappNumbers: ['+31647388314'], // Your default number
            autoShare: true // Enable auto-sharing by default - truly autonomous!
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
            
            console.log('Settings loaded:', this.settings);
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

    // Export/Import methods (enhanced)
    exportSettings() {
        const exportData = {
            ...this.settings,
            exportDate: new Date().toISOString(),
            version: '2.0' // Updated version
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
                
                // Validate and import settings
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
                
                this.saveSettings();
                
                // Update UI
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