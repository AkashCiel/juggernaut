// News APIs Integration
class NewsAPIs {
    constructor() {
        this.apiKeys = {
            newsApi: 'YOUR_NEWSAPI_KEY_HERE', // Get from newsapi.org
            githubToken: 'YOUR_GITHUB_TOKEN_HERE' // For uploading reports
        };
        
        // Leading AI research companies to filter for
        this.aiCompanies = [
            'OpenAI', 'Anthropic', 'DeepMind', 'Google AI', 'Meta AI', 'Facebook AI',
            'Microsoft Research', 'Stanford AI', 'MIT CSAIL', 'Carnegie Mellon',
            'Berkeley AI', 'NVIDIA Research', 'Tesla AI', 'Cohere', 'Stability AI'
        ];
        
        // Cache to avoid duplicate API calls
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    }

    // Set API keys (called from settings)
    setApiKeys(keys) {
        this.apiKeys = { ...this.apiKeys, ...keys };
        console.log('✅ API keys updated');
    }

    // Main function to fetch all news
    async fetchAllNews(topics) {
        try {
            console.log('🔄 Fetching news from all sources...');
            
            const [newsArticles, researchPapers] = await Promise.all([
                this.fetchNewsArticles(topics),
                this.fetchResearchPapers(topics)
            ]);

            const allNews = [...newsArticles, ...researchPapers];
            
            // Sort by relevance and recency
            const sortedNews = this.sortNewsByRelevance(allNews, topics);
            
            console.log(`✅ Fetched ${sortedNews.length} news items from real sources`);
            return sortedNews;
            
        } catch (error) {
            console.warn('⚠️ Error fetching real news, falling back to mock data:', error);
            return await this.getMockNewsData();
        }
    }

    // Fetch news articles from NewsAPI.org
    async fetchNewsArticles(topics) {
        const cacheKey = `news_${topics.join('_')}`;
        
        // Check cache first
        if (this.isValidCache(cacheKey)) {
            console.log('📋 Using cached news articles');
            return this.cache.get(cacheKey).data;
        }

        if (!this.apiKeys.newsApi || this.apiKeys.newsApi === 'YOUR_NEWSAPI_KEY_HERE') {
            console.warn('⚠️ NewsAPI key not set, using mock data');
            return [];
        }

        try {
            const articles = [];
            
            // Fetch for each topic
            for (const topic of topics.slice(0, 5)) { // Limit to 5 topics to stay within API limits
                const query = this.buildNewsQuery(topic);
                const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&pageSize=10&apiKey=${this.apiKeys.newsApi}`;
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`NewsAPI error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.articles) {
                    const processedArticles = data.articles.map(article => ({
                        title: article.title,
                        summary: article.description || article.content?.substring(0, 200) + '...',
                        source: article.source.name,
                        topic: topic,
                        time: this.formatTimeAgo(new Date(article.publishedAt)),
                        url: article.url,
                        publishedAt: article.publishedAt,
                        type: 'news'
                    }));
                    
                    articles.push(...processedArticles);
                }
            }

            // Remove duplicates and filter quality
            const uniqueArticles = this.removeDuplicates(articles);
            const filteredArticles = this.filterHighQuality(uniqueArticles);
            
            // Cache results
            this.cache.set(cacheKey, {
                data: filteredArticles,
                timestamp: Date.now()
            });
            
            console.log(`✅ Fetched ${filteredArticles.length} news articles`);
            return filteredArticles;
            
        } catch (error) {
            console.error('❌ Error fetching news articles:', error);
            return [];
        }
    }

    // Fetch research papers from ArXiv
    async fetchResearchPapers(topics) {
        const cacheKey = `arxiv_${topics.join('_')}`;
        
        // Check cache first
        if (this.isValidCache(cacheKey)) {
            console.log('📋 Using cached research papers');
            return this.cache.get(cacheKey).data;
        }

        try {
            const papers = [];
            
            // Fetch for each topic
            for (const topic of topics.slice(0, 3)) { // Limit topics for ArXiv
                const query = this.buildArxivQuery(topic);
                const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&start=0&max_results=5&sortBy=submittedDate&sortOrder=descending`;
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`ArXiv error: ${response.status}`);
                }
                
                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                
                const entries = xmlDoc.querySelectorAll('entry');
                
                entries.forEach(entry => {
                    const title = entry.querySelector('title')?.textContent?.trim();
                    const summary = entry.querySelector('summary')?.textContent?.trim();
                    const authors = Array.from(entry.querySelectorAll('author name')).map(name => name.textContent).join(', ');
                    const publishedDate = entry.querySelector('published')?.textContent;
                    const arxivUrl = entry.querySelector('id')?.textContent;
                    
                    // Check if it's from a leading AI company
                    const isFromAICompany = this.isFromAICompany(title, summary, authors);
                    
                    if (title && summary && isFromAICompany) {
                        papers.push({
                            title: title,
                            summary: summary.substring(0, 300) + '...',
                            source: this.extractAICompany(title, summary, authors) || 'ArXiv Research',
                            topic: topic,
                            time: this.formatTimeAgo(new Date(publishedDate)),
                            url: arxivUrl,
                            publishedAt: publishedDate,
                            type: 'research',
                            authors: authors
                        });
                    }
                });
            }

            // Cache results
            this.cache.set(cacheKey, {
                data: papers,
                timestamp: Date.now()
            });
            
            console.log(`✅ Fetched ${papers.length} research papers from leading AI companies`);
            return papers;
            
        } catch (error) {
            console.error('❌ Error fetching research papers:', error);
            return [];
        }
    }

    // Build optimized query for NewsAPI
    buildNewsQuery(topic) {
        const aiKeywords = ['AI', 'artificial intelligence', 'machine learning', 'deep learning'];
        return `"${topic}" AND (${aiKeywords.join(' OR ')})`;
    }

    // Build optimized query for ArXiv
    buildArxivQuery(topic) {
        // ArXiv categories for AI/ML
        const categories = 'cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV OR cat:cs.RO';
        return `(${categories}) AND all:"${topic}"`;
    }

    // Check if paper is from leading AI company
    isFromAICompany(title, summary, authors) {
        const text = `${title} ${summary} ${authors}`.toLowerCase();
        return this.aiCompanies.some(company => 
            text.includes(company.toLowerCase())
        );
    }

    // Extract which AI company
    extractAICompany(title, summary, authors) {
        const text = `${title} ${summary} ${authors}`.toLowerCase();
        for (const company of this.aiCompanies) {
            if (text.includes(company.toLowerCase())) {
                return company;
            }
        }
        return null;
    }

    // Remove duplicate articles
    removeDuplicates(articles) {
        const seen = new Set();
        return articles.filter(article => {
            const key = article.title.toLowerCase().substring(0, 50);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    // Filter high quality articles
    filterHighQuality(articles) {
        return articles.filter(article => {
            // Filter out articles with poor quality indicators
            const title = article.title.toLowerCase();
            const summary = article.summary.toLowerCase();
            
            // Skip if title/summary is too short
            if (title.length < 20 || summary.length < 50) {
                return false;
            }
            
            // Skip common junk patterns
            const junkPatterns = [
                'removed', 'deleted', 'unavailable', '[removed]',
                'click here', 'subscribe now', 'read more'
            ];
            
            return !junkPatterns.some(pattern => 
                title.includes(pattern) || summary.includes(pattern)
            );
        });
    }

    // Sort news by relevance to topics
    sortNewsByRelevance(articles, topics) {
        return articles.sort((a, b) => {
            // Score based on topic relevance and recency
            const scoreA = this.calculateRelevanceScore(a, topics);
            const scoreB = this.calculateRelevanceScore(b, topics);
            
            if (scoreA !== scoreB) {
                return scoreB - scoreA; // Higher score first
            }
            
            // If same relevance, sort by recency
            return new Date(b.publishedAt) - new Date(a.publishedAt);
        });
    }

    // Calculate relevance score
    calculateRelevanceScore(article, topics) {
        let score = 0;
        const text = `${article.title} ${article.summary}`.toLowerCase();
        
        // Score for topic matches
        topics.forEach(topic => {
            if (text.includes(topic.toLowerCase())) {
                score += 10;
            }
        });
        
        // Bonus for research papers
        if (article.type === 'research') {
            score += 5;
        }
        
        // Bonus for recent articles (last 7 days)
        const daysSincePublished = (Date.now() - new Date(article.publishedAt)) / (1000 * 60 * 60 * 24);
        if (daysSincePublished <= 7) {
            score += 3;
        }
        
        return score;
    }

    // Format time ago
    formatTimeAgo(date) {
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
        
        if (diffInHours < 1) {
            return 'Less than 1 hour ago';
        } else if (diffInHours < 24) {
            return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
        } else {
            const diffInDays = Math.floor(diffInHours / 24);
            return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
        }
    }

    // Check if cache is valid
    isValidCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return false;
        
        return (Date.now() - cached.timestamp) < this.cacheExpiry;
    }

    // Fallback to mock data
    async getMockNewsData() {
        console.log('📋 Using mock news data as fallback');
        return window.AINewsData.getMockNewsData();
    }
}

// Make available globally
window.NewsAPIs = NewsAPIs;