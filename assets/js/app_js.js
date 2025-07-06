// Main Application Entry Point
import { SettingsManager } from './storage.js';
import { TopicsManager } from './topics.js';
import { SchedulerManager } from './scheduler.js';
import { NewsGenerator } from './newsGenerator.js';
import { UIManager } from './ui.js';
import { loadDefaultTopics } from './data.js';

class AINewsAgent {
    constructor() {
        this.settingsManager = new SettingsManager();
        this.topicsManager = new TopicsManager(this.settingsManager);
        this.schedulerManager = new SchedulerManager(this.settingsManager);
        this.newsGenerator = new NewsGenerator(this.settingsManager);
        this.uiManager = new UIManager();
        
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
            const defaultTopics = await loadDefaultTopics();
            
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
            this.uiManager.showStatusMessage('Failed to initialize application', 'error');
        }
    }

    setupEventListeners() {
        // Topic input enter key
        const topicInput = document.getElementById('newTopicInput');
        topicInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.topicsManager.addTopic();
            }
        });

        // Schedule options - now handled by onclick in HTML
        // No need for additional event listeners since we're using onclick

        // File import handler
        document.getElementById('importFile').addEventListener('change', () => {
            this.settingsManager.importSettings();
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new AINewsAgent();
    await app.init();
});