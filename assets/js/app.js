// Main Application Entry Point
class AINewsAgent {
    constructor() {
        this.settingsManager = new SettingsManager();
        this.topicsManager = new TopicsManager(this.settingsManager);
        this.schedulerManager = new SchedulerManager(this.settingsManager);
        this.newsGenerator = new NewsGenerator(this.settingsManager);
        this.reportGenerator = new ReportGenerator();
        this.uiManager = new UIManager();
        
        // Make managers globally available for onclick handlers
        window.settingsManager = this.settingsManager;
        window.topicsManager = this.topicsManager;
        window.schedulerManager = this.schedulerManager;
        window.newsGenerator = this.newsGenerator;
        window.reportGenerator = this.reportGenerator;
        window.uiManager = this.uiManager;
        
        console.log('✅ All managers created successfully');
        console.log('🔍 ReportGenerator instance:', this.reportGenerator);
        console.log('🔍 window.reportGenerator:', window.reportGenerator);
    }

    async init() {
        try {
            console.log('🚀 Starting initialization...');
            
            // Load default topics
            const defaultTopics = await window.AINewsData.loadDefaultTopics();
            console.log('✅ Default topics loaded:', defaultTopics.length);
            
            // Initialize all managers
            await this.settingsManager.init(defaultTopics);
            console.log('✅ Settings manager initialized');
            
            this.topicsManager.init();
            console.log('✅ Topics manager initialized');
            
            this.schedulerManager.init();
            console.log('✅ Scheduler manager initialized');
            
            this.newsGenerator.init();
            console.log('✅ News generator initialized');
            
            this.reportGenerator.init();
            console.log('✅ Report generator initialized');
            
            this.uiManager.init();
            console.log('✅ UI manager initialized');
            
            // Set up event listeners
            this.setupEventListeners();
            console.log('✅ Event listeners set up');
            
            // Check for scheduled runs
            this.schedulerManager.checkScheduledRun();
            
            // Show ready message
            this.uiManager.showStatusMessage('Ready to generate your AI research news report!', 'info');
            
            console.log('🎉 AI News Agent initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize AI News Agent:', error);
            alert('Failed to initialize application. Check console for details.');
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
            console.log('✅ Topic input listener added');
        }

        // File import handler
        const importFile = document.getElementById('importFile');
        if (importFile) {
            importFile.addEventListener('change', () => {
                this.settingsManager.importSettings();
            });
            console.log('✅ File import listener added');
        }
    }
}

// Simple initialization - no retry mechanism
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM loaded, starting app initialization...');
    
    try {
        // Small delay to ensure all scripts are loaded
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if required classes exist
        const requiredClasses = ['SettingsManager', 'TopicsManager', 'SchedulerManager', 'NewsGenerator', 'ReportGenerator', 'UIManager'];
        const missingClasses = requiredClasses.filter(className => !window[className]);
        
        console.log('🔍 Checking available classes:', Object.keys(window).filter(key => key.endsWith('Manager') || key.endsWith('Generator') || key === 'UIManager'));
        
        if (missingClasses.length > 0) {
            console.error('❌ Missing classes:', missingClasses);
            alert(`Missing required classes: ${missingClasses.join(', ')}`);
            return;
        }
        
        console.log('✅ All required classes are available');
        
        // Initialize the app
        const app = new AINewsAgent();
        await app.init();
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        alert('Application failed to start. Check console for details.');
    }
});