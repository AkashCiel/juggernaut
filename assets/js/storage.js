// Settings and Storage Management
class SettingsManager {
    constructor() {
        this.settings = {
            topics: [],
            schedule: 'daily',
            lastRun: null
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
            if (this.settings.lastRun) {
                localStorage.setItem('aiNewsLastRun', this.settings.lastRun.toISOString());
            }
            console.log('Settings saved successfully');
        } catch (error) {
            console.warn('Could not save settings:', error);
        }
    }

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

    exportSettings() {
        const exportData = {
            ...this.settings,
            exportDate: new Date().toISOString(),
            version: '1.0'
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