// Report Generation and Sharing
class ReportGenerator {
    constructor() {
        this.isGenerating = false;
        this.lastGeneratedReport = null;
    }

    init() {
        console.log('✅ Report generator initialized');
    }

    // Generate shareable HTML report
    async generateShareableReport(newsItems, topics, reportDate, aiSummary = null) {
        try {
            console.log('🔄 Generating shareable report...');
            
            // Create report data
            const reportData = {
                id: this.generateReportId(),
                date: reportDate || new Date(),
                topics: topics,
                newsItems: newsItems,
                aiSummary: aiSummary,
                metadata: {
                    totalItems: newsItems.length,
                    newsArticles: newsItems.filter(item => item.type === 'news' || item.type === 'mock').length,
                    researchPapers: newsItems.filter(item => item.type === 'research').length,
                    hasAISummary: !!aiSummary,
                    generatedAt: new Date().toISOString()
                }
            };

            // Generate HTML content
            const htmlContent = this.createReportHTML(reportData);
            
            // Store for sharing
            this.lastGeneratedReport = {
                ...reportData,
                htmlContent,
                fileName: `ai-news-report-${reportData.id}.html`
            };

            console.log(`✅ Report generated with ID: ${reportData.id}`);
            return this.lastGeneratedReport;

        } catch (error) {
            console.error('❌ Error generating report:', error);
            throw error;
        }
    }

    // Create beautiful HTML report
    createReportHTML(reportData) {
        const { id, date, topics, newsItems, metadata, aiSummary } = reportData;
        
        // Separate news by type (treat 'mock' as news)
        const newsArticles = newsItems.filter(item => item.type === 'news' || item.type === 'mock');
        const researchPapers = newsItems.filter(item => item.type === 'research');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Research News Report - ${this.formatDate(date)}</title>
    <meta name="description" content="Daily AI research news and papers covering ${topics.slice(0, 3).join(', ')} and more">
    <meta property="og:title" content="AI Research News Report - ${this.formatDate(date)}">
    <meta property="og:description" content="${metadata.totalItems} AI news items covering ${topics.slice(0, 3).join(', ')}">
    <meta property="og:type" content="article">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 2px solid #f0f0f0;
        }

        .header h1 {
            font-size: 2.5em;
            font-weight: 700;
            background: linear-gradient(45deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }

        .header .date {
            font-size: 1.2em;
            color: #666;
            margin-bottom: 20px;
        }

        .summary {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 30px;
            border-left: 4px solid #667eea;
        }

        .summary h3 {
            color: #333;
            margin-bottom: 15px;
        }

        .topics {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 15px;
        }

        .topic-tag {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 500;
        }

        .section {
            margin-bottom: 40px;
        }

        .section h2 {
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f0f0f0;
            font-size: 1.5em;
        }

        .news-item {
            background: white;
            padding: 25px;
            margin-bottom: 20px;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            border-left: 4px solid #667eea;
            transition: transform 0.3s ease;
        }

        .news-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }

        .news-title {
            font-size: 1.3em;
            font-weight: 600;
            color: #333;
            margin-bottom: 12px;
            line-height: 1.4;
        }

        .news-summary {
            color: #666;
            margin-bottom: 15px;
            line-height: 1.6;
        }

        .news-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9em;
            color: #888;
            margin-bottom: 10px;
        }

        .news-source {
            font-weight: 600;
            color: #667eea;
        }

        .news-url {
            margin-top: 10px;
        }

        .news-url a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }

        .news-url a:hover {
            text-decoration: underline;
        }

        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px solid #f0f0f0;
            color: #666;
            font-size: 0.9em;
        }

        .powered-by {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }

        .stat {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .stat-number {
            font-size: 2em;
            font-weight: 700;
            color: #667eea;
        }

        .stat-label {
            font-size: 0.9em;
            color: #666;
            margin-top: 5px;
        }

        @media (max-width: 768px) {
            .container {
                padding: 20px;
            }
            
            .header h1 {
                font-size: 2em;
            }
            
            .news-meta {
                flex-direction: column;
                align-items: flex-start;
                gap: 5px;
            }
        }

        .type-icon {
            font-size: 1.2em;
            margin-right: 8px;
        }

        .research-paper {
            border-left-color: #764ba2;
        }

        .research-paper .type-icon {
            color: #764ba2;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 AI Research News Report</h1>
            <div class="date">${this.formatDate(date)}</div>
        </div>

        <div class="summary">
            <h3>📊 Report Summary</h3>
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">${metadata.totalItems}</div>
                    <div class="stat-label">Total Items</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${metadata.newsArticles}</div>
                    <div class="stat-label">News Articles</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${metadata.researchPapers}</div>
                    <div class="stat-label">Research Papers</div>
                </div>
            </div>
            
            <strong>Topics Covered:</strong>
            <div class="topics">
                ${topics.map(topic => `<span class="topic-tag">${this.escapeHtml(topic)}</span>`).join('')}
            </div>
        </div>

        ${aiSummary ? `
        <div class="summary" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-left-color: white;">
            <h3 style="color: white;">🤖 AI Research Summary</h3>
            <div style="line-height: 1.6; font-size: 1.1em; color: white;">
                ${aiSummary.split('\n').map(paragraph => 
                    paragraph.trim() ? `<p style="margin-bottom: 15px; color: white;">${this.escapeHtml(paragraph)}</p>` : ''
                ).join('')}
            </div>
            <div style="margin-top: 15px; font-size: 0.9em; opacity: 0.9; color: white;">
                Generated by OpenAI GPT-4o-mini
            </div>
        </div>
        ` : ''}

        ${newsArticles.length > 0 ? `
        <div class="section">
            <h2>📰 Latest News Articles</h2>
            ${newsArticles.map(item => this.createNewsItemHTML(item)).join('')}
        </div>
        ` : ''}

        ${researchPapers.length > 0 ? `
        <div class="section">
            <h2>🔬 Research Papers</h2>
            ${researchPapers.map(item => this.createNewsItemHTML(item, true)).join('')}
        </div>
        ` : ''}

        <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
            <div class="powered-by">
                <strong>Powered by AI Research News Agent</strong><br>
                <small>Automated daily intelligence on artificial intelligence research</small>
            </div>
        </div>
    </div>
</body>
</html>`;
    }

    // Create individual news item HTML
    createNewsItemHTML(item, isResearch = false) {
        const typeIcon = isResearch ? '🔬' : '📰';
        const extraClass = isResearch ? 'research-paper' : '';
        
        return `
            <div class="news-item ${extraClass}">
                <div class="news-title">
                    <span class="type-icon">${typeIcon}</span>
                    ${this.escapeHtml(item.title)}
                </div>
                <div class="news-summary">${this.escapeHtml(item.summary)}</div>
                <div class="news-meta">
                    <span class="news-source">${this.escapeHtml(item.source)}</span>
                    <span>${this.escapeHtml(item.time)}</span>
                </div>
                ${item.url ? `
                <div class="news-url">
                    <a href="${this.escapeHtml(item.url)}" target="_blank" rel="noopener">Read full article →</a>
                </div>
                ` : ''}
            </div>
        `;
    }

    // Generate unique report ID
    generateReportId() {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
        return `${dateStr}-${timeStr}`;
    }

    // Format date for display
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Escape HTML
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

    // Download report as HTML file
    downloadReport(report) {
        if (!report) {
            console.error('No report to download');
            return;
        }

        const blob = new Blob([report.htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = report.fileName;
        link.click();
        
        URL.revokeObjectURL(url);
        
        console.log(`✅ Report downloaded: ${report.fileName}`);
    }

    // Get last generated report
    getLastReport() {
        return this.lastGeneratedReport;
    }
}

// Make available globally
window.ReportGenerator = ReportGenerator;