/**
 * AI News Agent - Simplified Application
 * Main application controller
 */

class App {
    constructor() {
        this.topics = [];
        this.reports = [];
        this.currentView = 'dashboard';
        this.isGenerating = false;
        
        // DOM elements
        this.elements = {};
        
        // Initialize
        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            console.log('🚀 Initializing AI News Agent...');
            
            // Initialize elements
            this.initializeElements();
            
            // Load data
            await this.loadData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Show dashboard
            this.showView('dashboard');
            
            console.log('✅ Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showError('Initialization failed. Please check the console for more details.');
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.elements = {
            // Navigation
            navDashboard: document.getElementById('nav-dashboard'),
            navTopics: document.getElementById('nav-topics'),
            navReports: document.getElementById('nav-reports'),
            navScheduler: document.getElementById('nav-scheduler'),
            navSettings: document.getElementById('nav-settings'),
            
            // Views
            dashboardView: document.getElementById('dashboard-view'),
            topicsView: document.getElementById('topics-view'),
            reportsView: document.getElementById('reports-view'),
            schedulerView: document.getElementById('scheduler-view'),
            settingsView: document.getElementById('settings-view'),
            
            // Dashboard
            dashboardStats: document.getElementById('dashboard-stats'),
            generateButton: document.getElementById('generate-button'),
            progressBar: document.getElementById('progress-bar'),
            progressText: document.getElementById('progress-text'),
            recentReports: document.getElementById('recent-reports'),
            
            // Topics
            topicsList: document.getElementById('topics-list'),
            addTopicBtn: document.getElementById('add-topic-btn'),
            topicName: document.getElementById('topic-name'),
            topicCategory: document.getElementById('topic-category'),
            
            // Reports
            reportsList: document.getElementById('reports-list'),
            reportViewer: document.getElementById('report-viewer'),
            
            // Modal
            modal: document.getElementById('modal'),
            modalContent: document.getElementById('modal-content'),
            modalTitle: document.getElementById('modal-title'),
            modalClose: document.getElementById('modal-close'),
            
            // Notifications
            notifications: document.getElementById('notifications')
        };
    }

    /**
     * Load data from localStorage
     */
    async loadData() {
        // Load topics
        const savedTopics = localStorage.getItem('topics');
        this.topics = savedTopics ? JSON.parse(savedTopics) : this.getDefaultTopics();
        
        // Load reports
        const savedReports = localStorage.getItem('reports');
        this.reports = savedReports ? JSON.parse(savedReports) : [];
        
        console.log(`📊 Loaded ${this.topics.length} topics and ${this.reports.length} reports`);
    }

    /**
     * Save data to localStorage
     */
    saveData() {
        localStorage.setItem('topics', JSON.stringify(this.topics));
        localStorage.setItem('reports', JSON.stringify(this.reports));
    }

    /**
     * Get default topics
     */
    getDefaultTopics() {
        return [
            { id: 'transformer', name: 'Transformer Models', category: 'nlp' },
            { id: 'llm', name: 'Large Language Models', category: 'nlp' },
            { id: 'computer-vision', name: 'Computer Vision', category: 'cv' },
            { id: 'reinforcement-learning', name: 'Reinforcement Learning', category: 'ml' },
            { id: 'deep-learning', name: 'Deep Learning', category: 'ml' },
            { id: 'ai-ethics', name: 'AI Ethics and Safety', category: 'ethics' },
            { id: 'robotics', name: 'Robotics and Automation', category: 'robotics' },
            { id: 'neural-networks', name: 'Neural Network Architectures', category: 'neural' },
            { id: 'ai-applications', name: 'AI Applications', category: 'applications' },
            { id: 'ai-theory', name: 'AI Theory and Foundations', category: 'theory' }
        ];
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation
        this.elements.navDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            this.showView('dashboard');
        });
        
        this.elements.navTopics.addEventListener('click', (e) => {
            e.preventDefault();
            this.showView('topics');
        });
        
        this.elements.navReports.addEventListener('click', (e) => {
            e.preventDefault();
            this.showView('reports');
        });
        
        this.elements.navScheduler.addEventListener('click', (e) => {
            e.preventDefault();
            this.showView('scheduler');
        });
        
        this.elements.navSettings.addEventListener('click', (e) => {
            e.preventDefault();
            this.showView('settings');
        });

        // Generate report button
        this.elements.generateButton.addEventListener('click', () => {
            this.generateReport();
        });

        // Add topic button
        this.elements.addTopicBtn.addEventListener('click', () => {
            this.addTopic();
        });

        // Modal close
        this.elements.modalClose.addEventListener('click', () => {
            this.hideModal();
        });
    }

    /**
     * Show a specific view
     */
    showView(viewName) {
        // Hide all views
        Object.values(this.elements).forEach(element => {
            if (element && element.classList && element.classList.contains('view')) {
                element.style.display = 'none';
            }
        });

        // Remove active from all nav items
        Object.values(this.elements).forEach(element => {
            if (element && element.classList && element.classList.contains('nav-item')) {
                element.classList.remove('active');
            }
        });

        // Show selected view
        const viewElement = this.elements[`${viewName}View`];
        if (viewElement) {
            viewElement.style.display = 'block';
        }

        // Add active to nav item
        const navElement = this.elements[`nav${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`];
        if (navElement) {
            navElement.classList.add('active');
        }

        this.currentView = viewName;
        this.updateView(viewName);
    }

    /**
     * Update view content
     */
    updateView(viewName) {
        switch (viewName) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'topics':
                this.updateTopics();
                break;
            case 'reports':
                this.updateReports();
                break;
            case 'scheduler':
                this.updateScheduler();
                break;
            case 'settings':
                this.updateSettings();
                break;
        }
    }

    /**
     * Update dashboard
     */
    updateDashboard() {
        // Update stats
        const stats = this.getStats();
        this.elements.dashboardStats.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>${stats.topics}</h3>
                    <p>Research Topics</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.reports}</h3>
                    <p>Reports Generated</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.thisWeek}</h3>
                    <p>This Week</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.totalPapers}</h3>
                    <p>Papers Analyzed</p>
                </div>
            </div>
        `;

        // Update recent reports
        const recentReports = this.reports.slice(0, 5);
        if (recentReports.length === 0) {
            this.elements.recentReports.innerHTML = '<p>No reports generated yet.</p>';
        } else {
            this.elements.recentReports.innerHTML = recentReports.map(report => `
                <div class="report-item" onclick="app.showReport('${report.id}')">
                    <h4>${report.title || 'AI News Report'}</h4>
                    <p>${report.papers?.length || 0} papers • ${new Date(report.generatedAt).toLocaleDateString()}</p>
                </div>
            `).join('');
        }
    }

    /**
     * Update topics view
     */
    updateTopics() {
        if (this.topics.length === 0) {
            this.elements.topicsList.innerHTML = '<p>No topics configured yet.</p>';
            return;
        }

        const categories = [
            { id: 'ai', name: 'Artificial Intelligence' },
            { id: 'ml', name: 'Machine Learning' },
            { id: 'nlp', name: 'Natural Language Processing' },
            { id: 'cv', name: 'Computer Vision' },
            { id: 'robotics', name: 'Robotics' },
            { id: 'neural', name: 'Neural Networks' },
            { id: 'ethics', name: 'AI Ethics' },
            { id: 'applications', name: 'AI Applications' },
            { id: 'theory', name: 'AI Theory' },
            { id: 'systems', name: 'AI Systems' }
        ];

        this.elements.topicsList.innerHTML = this.topics.map(topic => {
            const category = categories.find(c => c.id === topic.category);
            return `
                <div class="topic-item">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h4>${topic.name}</h4>
                            <span>${category?.name || 'Unknown'}</span>
                        </div>
                        <button class="btn btn-danger" onclick="app.removeTopic('${topic.id}')">
                            Remove
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Update reports view
     */
    updateReports() {
        if (this.reports.length === 0) {
            this.elements.reportsList.innerHTML = '<p>No reports generated yet.</p>';
            return;
        }

        this.elements.reportsList.innerHTML = this.reports.map(report => `
            <div class="report-item" onclick="app.showReport('${report.id}')">
                <h4>${report.title || 'AI News Report'}</h4>
                <p>${report.papers?.length || 0} papers • ${new Date(report.generatedAt).toLocaleDateString()}</p>
            </div>
        `).join('');
    }

    /**
     * Update scheduler view
     */
    updateScheduler() {
        this.elements.schedulerList.innerHTML = '<p>Scheduler functionality coming soon...</p>';
    }

    /**
     * Update settings view
     */
    updateSettings() {
        // Settings view is simple for now
    }

    /**
     * Add a new topic
     */
    addTopic() {
        const topicName = this.elements.topicName.value.trim();
        const topicCategory = this.elements.topicCategory.value;
        
        if (!topicName) {
            this.showNotification('Please enter a topic name', 'warning');
            return;
        }
        
        const newTopic = {
            id: this.generateId(),
            name: topicName,
            category: topicCategory
        };
        
        this.topics.push(newTopic);
        this.saveData();
        this.updateTopics();
        
        // Clear form
        this.elements.topicName.value = '';
        
        this.showNotification(`Topic "${topicName}" added successfully`, 'success');
    }

    /**
     * Remove a topic
     */
    removeTopic(topicId) {
        const index = this.topics.findIndex(t => t.id === topicId);
        if (index !== -1) {
            const topicName = this.topics[index].name;
            this.topics.splice(index, 1);
            this.saveData();
            this.updateTopics();
            this.showNotification(`Topic "${topicName}" removed`, 'success');
        }
    }

    /**
     * Generate report
     */
    async generateReport() {
        if (this.isGenerating) {
            this.showNotification('Report generation already in progress', 'warning');
            return;
        }

        if (this.topics.length === 0) {
            this.showNotification('Please add at least one topic first', 'warning');
            return;
        }

        try {
            this.isGenerating = true;
            this.elements.generateButton.disabled = true;
            this.elements.progressBar.style.display = 'block';
            this.elements.progressText.textContent = 'Initializing...';

            const topicNames = this.topics.map(t => t.name);
            
            this.elements.progressText.textContent = 'Requesting backend...';
            
            const response = await fetch('http://localhost:8000/api/generate-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    topics: topicNames,
                    maxPapers: 50
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            this.elements.progressText.textContent = 'Processing results...';
            
            // Create report object
            const report = {
                id: this.generateId(),
                title: 'AI News Report',
                topics: topicNames,
                papers: result.data?.papers || [],
                generatedAt: new Date().toISOString(),
                paperCount: result.data?.papersCount || 0
            };
            
            this.reports.unshift(report);
            this.saveData();
            
            this.elements.progressText.textContent = 'Complete!';
            
            this.showNotification('Report generated successfully!', 'success');
            this.updateDashboard();
            
        } catch (error) {
            console.error('Report generation failed:', error);
            this.showNotification(`Generation failed: ${error.message}`, 'error');
        } finally {
            this.isGenerating = false;
            this.elements.generateButton.disabled = false;
            this.elements.progressBar.style.display = 'none';
        }
    }

    /**
     * Show a specific report
     */
    showReport(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (!report) {
            this.showNotification('Report not found', 'error');
            return;
        }

        const content = `
            <h2>${report.title}</h2>
            <p><strong>Generated:</strong> ${new Date(report.generatedAt).toLocaleString()}</p>
            <p><strong>Topics:</strong> ${report.topics.join(', ')}</p>
            <p><strong>Papers:</strong> ${report.papers.length}</p>
            <hr>
            <div class="papers-list">
                ${report.papers.map(paper => `
                    <div class="paper-item">
                        <h4>${paper.title}</h4>
                        <p><strong>Authors:</strong> ${paper.authors?.join(', ') || 'Unknown'}</p>
                        <p><strong>Abstract:</strong> ${paper.abstract || 'No abstract available'}</p>
                        <p><strong>Published:</strong> ${paper.published || 'Unknown'}</p>
                    </div>
                `).join('')}
            </div>
        `;

        this.showModal('Report Details', content);
    }

    /**
     * Show modal
     */
    showModal(title, content) {
        this.elements.modalTitle.textContent = title;
        this.elements.modalContent.querySelector('.modal-body').innerHTML = content;
        this.elements.modal.style.display = 'block';
    }

    /**
     * Hide modal
     */
    hideModal() {
        this.elements.modal.style.display = 'none';
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;

        this.elements.notifications.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Show error screen
     */
    showError(message) {
        document.body.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                color: white;
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
            ">
                <h1 style="color: #ff6b6b; font-size: 3em; margin-bottom: 20px;">Initialization Failed</h1>
                <p style="font-size: 1.2em; margin-bottom: 40px;">${message}</p>
                <button onclick="location.reload()" style="
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 8px;
                    font-size: 1.1em;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                ">
                    🔄 Retry
                </button>
            </div>
        `;
    }

    /**
     * Get application statistics
     */
    getStats() {
        const thisWeek = this.reports.filter(r => {
            const reportDate = new Date(r.generatedAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return reportDate >= weekAgo;
        }).length;

        const totalPapers = this.reports.reduce((sum, r) => sum + (r.papers?.length || 0), 0);

        return {
            topics: this.topics.length,
            reports: this.reports.length,
            thisWeek,
            totalPapers
        };
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});