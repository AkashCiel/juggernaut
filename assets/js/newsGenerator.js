// News Generation Logic
class NewsGenerator {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.isGenerating = false;
        this.newsAPIs = new window.NewsAPIs();
    }

    init() {
        // Initialize news generator and load API keys
        const savedKeys = window.AINewsData.getApiKeys();
        console.log('🔍 Loading saved API keys:', savedKeys);
        
        if (savedKeys && Object.keys(savedKeys).length > 0) {
            this.newsAPIs.setApiKeys(savedKeys);
            console.log('✅ News generator initialized with saved API keys');
        } else {
            console.log('⚠️ News generator initialized (API keys not set - will use mock data)');
        }
    }

    // Set API keys
    setApiKeys(keys) {
        this.newsAPIs.setApiKeys(keys);
        window.AINewsData.saveApiKeys(keys);
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
            console.log('🔄 Starting news generation...');
            
            // Get active topics
            const activeTopics = this.settingsManager.getTopics();
            console.log('📋 Active topics:', activeTopics);
            
            // Fetch news from real sources (with fallback to mock)
            const newsItems = await this.generateNewsItems(activeTopics);
            
            // Display the report
            this.displayReport(newsItems);
            
            // Generate shareable report
            const reportDate = document.getElementById('reportDate').textContent;
            const generatedReport = await window.reportGenerator.generateShareableReport(newsItems, activeTopics, new Date());
            
            // Display the full HTML report
            this.displayFullReport(generatedReport);
            
            // Show share buttons
            if (window.showShareButtons) {
                window.showShareButtons();
            }
            
            // Update last run time
            this.settingsManager.setLastRun();
            
            if (window.uiManager) {
                window.uiManager.showStatusMessage('Report generated successfully!', 'success');
            }
            
            console.log('✅ News report generated successfully');
            
        } catch (error) {
            console.error('❌ Error generating report:', error);
            if (window.uiManager) {
                window.uiManager.showStatusMessage('Error generating report', 'error');
            }
            
            // Fallback to mock data on error
            try {
                const mockItems = await window.AINewsData.getMockNewsData();
                this.displayReport(mockItems);
            } catch (fallbackError) {
                console.error('❌ Even fallback failed:', fallbackError);
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
                    🔍 Searching real-time AI research news and papers...
                    <br><small>Checking NewsAPI, ArXiv, and other sources</small>
                </div>
            `;
            
            // Clear any existing full report section
            const fullReportSection = document.getElementById('fullReportSection');
            if (fullReportSection) {
                fullReportSection.remove();
            }
        }
    }

    async generateNewsItems(activeTopics) {
        try {
            console.log('🌐 Fetching news from real sources...');
            
            // Try to fetch from real APIs
            const realNews = await this.newsAPIs.fetchAllNews(activeTopics);
            
            if (realNews && realNews.length > 0) {
                console.log(`✅ Successfully fetched ${realNews.length} real news items`);
                return realNews.slice(0, 20); // Limit to top 20 items
            } else {
                console.log('⚠️ No real news found, using mock data');
                return await this.getMockFilteredNews(activeTopics);
            }
            
        } catch (error) {
            console.error('❌ Error fetching real news:', error);
            console.log('📋 Falling back to mock data');
            return await this.getMockFilteredNews(activeTopics);
        }
    }

    async getMockFilteredNews(activeTopics) {
        const mockNewsData = await window.AINewsData.getMockNewsData();
        
        // Filter mock news based on active topics (same logic as before)
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
                    <br>Try adding more topics or check your API keys in settings.
                </div>
            `;
            return;
        }

        // Group news by type
        const newsArticles = newsItems.filter(item => item.type === 'news');
        const researchPapers = newsItems.filter(item => item.type === 'research');

        let html = '';
        
        // Add news articles section
        if (newsArticles.length > 0) {
            html += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #667eea; margin-bottom: 15px;">📰 Latest News Articles (${newsArticles.length})</h3>
                    ${newsArticles.map(item => this.createNewsItemHTML(item)).join('')}
                </div>
            `;
        }
        
        // Add research papers section
        if (researchPapers.length > 0) {
            html += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #764ba2; margin-bottom: 15px;">🔬 Research Papers (${researchPapers.length})</h3>
                    ${researchPapers.map(item => this.createNewsItemHTML(item)).join('')}
                </div>
            `;
        }
        
        newsContent.innerHTML = html;
    }

    createNewsItemHTML(item) {
        const typeIcon = item.type === 'research' ? '🔬' : '📰';
        const urlLink = item.url ? `<a href="${item.url}" target="_blank" style="color: #667eea; text-decoration: none;">Read full article →</a>` : '';
        
        return `
            <div class="news-item fade-in">
                <div class="news-title">${typeIcon} ${this.escapeHtml(item.title)}</div>
                <div class="news-summary">${this.escapeHtml(item.summary)}</div>
                <div class="news-meta">
                    <span class="news-source">${this.escapeHtml(item.source)}</span>
                    <div>
                        <span class="news-topic">${this.escapeHtml(item.topic)}</span>
                        <span style="margin-left: 10px;">${this.escapeHtml(item.time)}</span>
                    </div>
                </div>
                ${urlLink ? `<div style="margin-top: 10px; font-size: 0.9em;">${urlLink}</div>` : ''}
            </div>
        `;
    }

    // Display the full HTML report using an iframe for isolation
    displayFullReport(report) {
        const reportContainer = document.getElementById('reportContainer');
        if (!reportContainer) return;

        // Create or update the full report section
        let fullReportSection = document.getElementById('fullReportSection');
        if (!fullReportSection) {
            fullReportSection = document.createElement('div');
            fullReportSection.id = 'fullReportSection';
            fullReportSection.style.cssText = `
                margin-top: 30px;
                padding: 0;
                background: none;
                border: none;
            `;
            reportContainer.appendChild(fullReportSection);
        }

        // Add header and iframe
        fullReportSection.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #667eea; margin-bottom: 10px;">📄 Full Generated Report</h3>
                <p style="color: #666; font-size: 0.9em;">
                    This is the complete HTML report that was generated and can be shared or downloaded.
                </p>
            </div>
            <iframe id="fullReportIframe" style="width: 100%; height: 600px; border-radius: 10px; border: 1px solid #e0e0e0; background: white;"></iframe>
        `;

        // Write the full HTML content into the iframe
        const iframe = document.getElementById('fullReportIframe');
        if (iframe) {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(report.htmlContent);
            doc.close();
        }

        console.log('✅ Full report displayed in iframe preview.');
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
window.NewsGenerator = NewsGenerator;