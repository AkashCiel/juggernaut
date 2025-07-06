// Main Application Entry Point
class AINewsAgent {
    constructor() {
        // Check if all required classes are available
        if (!window.SettingsManager || !window.TopicsManager || !window.SchedulerManager || 
            !window.NewsGenerator || !window.UIManager) {
            console.error('Required classes not loaded yet');
            return;
        }

        this.settingsManager = new window.SettingsManager();
        this.topicsManager = new window.TopicsManager(this.settingsManager);
        this.schedulerManager = new window.SchedulerManager(this.settingsManager);
        this.newsGenerator = new window.NewsGenerator(this.settingsManager);
        this.uiManager = new window.UIManager();
        
        // Make managers globally available for onclick handlers
        window.settingsManager = this.settingsManager;
        window.topicsManager = this.topicsManager;
        window.schedulerManager = this.schedulerManager;
        window.newsGenerator = this.newsGenerator;
        window.uiManager = this.uiManager;
    }

    async init() {
        try {
            // Load default topics
            const defaultTopics = await window.AINewsData.loadDefaultTopics();
            
            // Initialize all managers
            await this.settingsManager.init(defaultTopics);
            this.topicsManager.init();
            this.schedulerManager.init();
            this.newsGenerator.init();
            this.uiManager.init();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Check for scheduled runs
            this.schedulerManager.checkScheduledRun();
            
            // Show ready message
            this.uiManager.showStatusMessage('Ready to generate your AI research news report!', 'info');
            
            console.log('🤖 AI News Agent initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AI News Agent:', error);
            if (this.uiManager) {
                this.uiManager.showStatusMessage('Failed to initialize application', 'error');
            }
        }
    }

    setupEventListeners() {
        // Topic input enter key
        const topicInput = document.getElementById('newTopicInput');
        if (topicInput) {
            topicInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.topicsManager.addTopic();
                }
            });
        }

        // File import handler
        const importFile = document.getElementById('importFile');
        if (importFile) {
            importFile.addEventListener('change', () => {
                this.settingsManager.importSettings();
            });
        }
    }
}

// Wait for all scripts to load, then initialize
function initializeApp() {
    // Check if all required classes are available
    if (window.SettingsManager && window.TopicsManager && window.SchedulerManager && 
        window.NewsGenerator && window.UIManager && window.AINewsData) {
        
        const app = new AINewsAgent();
        if (app.settingsManager) { // Check if construction was successful
            app.init();
        }
    } else {
        console.log('Waiting for classes to load...');
        setTimeout(initializeApp, 100); // Try again in 100ms
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeApp, 50); // Small delay to ensure scripts are loaded
});