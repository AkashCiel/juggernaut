// News Generation Logic
class NewsGenerator {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.isGenerating = false;
    }

    init() {
        // Initialize news generator
        console.log('News generator initialized');
    }

    async generateReport() {
        if (this.isGenerating) {
            console.log('Report generation already in progress');
            return;
        }
        
        this.isGenerating = true;
        
        if (window.uiManager) {
            window.uiManager.showStatusMessage('Generating your AI research news report...', 'info');
        }
        
        // Show loading state
        this.showLoadingState();
        
        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Generate news items based on active topics
            const newsItems = await this.generateNewsItems();
            
            // Display the report
            this.displayReport(newsItems);
            
            // Update last run time
            this.settingsManager.setLastRun();
            
            if (window.uiManager) {
                window.uiManager.showStatusMessage('Report generated successfully!', 'success');
            }
            
        } catch (error) {
            console.error('Error generating report:', error);
            if (window.uiManager) {
                window.uiManager.showStatusMessage('Error generating report', 'error');
            }
        } finally {
            this.isGenerating = false;
        }
    }

    showLoadingState() {
        const reportContainer = document.getElementById('reportContainer');
        const newsContent = document.getElementById('newsContent');
        const reportDate = document.getElementById('reportDate');
        
        if (reportContainer && newsContent && reportDate) {
            reportContainer.style.display = 'block';
            reportDate.textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            newsContent.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    Searching for latest AI research news...
                </div>
            `;
        }
    }

    async generateNewsItems() {
        const activeTopics = this.settingsManager.getTopics();
        const mockNewsData = await window.AINewsData.getMockNewsData();
        
        // Filter news items based on active topics
        const relevantNews = mockNewsData.filter(item => 
            activeTopics.some(topic => 
                item.topic.toLowerCase().includes(topic.toLowerCase()) ||
                item.title.toLowerCase().includes(topic.toLowerCase()) ||
                item.summary.toLowerCase().includes(topic.toLowerCase())
            )
        );
        
        // Sort by recency (mock time parsing)
        return relevantNews.sort((a, b) => {
            const timeA = this.parseTimeAgo(a.time);
            const timeB = this.parseTimeAgo(b.time);
            return timeA - timeB;
        });
    }

    parseTimeAgo(timeString) {
        // Simple parser for "X hours ago", "X days ago" format
        const match = timeString.match(/(\d+)\s+(hour|day|minute)s?\s+ago/);
        if (!match) return 0;
        
        const value = parseInt(match[1]);
        const unit = match[2];
        
        switch (unit) {
            case 'minute': return value;
            case 'hour': return value * 60;
            case 'day': return value * 60 * 24;
            default: return 0;
        }
    }

    displayReport(newsItems) {
        const newsContent = document.getElementById('newsContent');
        
        if (!newsContent) return;
        
        if (newsItems.length === 0) {
            newsContent.innerHTML = `
                <div class="loading">
                    No news items found for your selected topics. 
                    Try adding more topics or check back later.
                </div>
            `;
            return;
        }

        newsContent.innerHTML = newsItems.map(item => `
            <div class="news-item fade-in">
                <div class="news-title">${this.escapeHtml(item.title)}</div>
                <div class="news-summary">${this.escapeHtml(item.summary)}</div>
                <div class="news-meta">
                    <span class="news-source">${this.escapeHtml(item.source)}</span>
                    <div>
                        <span class="news-topic">${this.escapeHtml(item.topic)}</span>
                        <span style="margin-left: 10px;">${this.escapeHtml(item.time)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Utility function to escape HTML
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}

// Make available globally
window.NewsGenerator = NewsGenerator;;