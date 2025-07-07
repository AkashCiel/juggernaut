// News APIs Integration - CORS Fixed Version
class NewsAPIs {
    constructor() {
        this.apiKeys = {
            newsApi: null, // Will be set via setApiKeys
            githubToken: null // For uploading reports
        };
        
        // CORS proxy options (fallback chain)
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://cors-anywhere.herokuapp.com/',
            'https://thingproxy.freeboard.io/fetch/'
        ];
        
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
        console.log('✅ API keys updated:', {
            newsApi: this.apiKeys.newsApi ? 'SET' : 'NOT SET',
            githubToken: this.apiKeys.githubToken ? 'SET' : 'NOT SET'
        });
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

    // Fetch news articles from NewsAPI.org with CORS proxy
    async fetchNewsArticles(topics) {
        console.log('🔍 fetchNewsArticles called - NEW VERSION');
        const cacheKey = `news_${topics.join('_')}`;
        
        // Check cache first
        if (this.isValidCache(cacheKey)) {
            console.log('📋 Using cached news articles');
            return this.cache.get(cacheKey).data;
        }

        console.log('🔍 Checking NewsAPI key:', {
            hasKey: !!this.apiKeys.newsApi,
            keyValue: this.apiKeys.newsApi ? this.apiKeys.newsApi.substring(0, 10) + '...' : 'NOT SET',
        });
        
        if (!this.apiKeys.newsApi) {
            console.warn('⚠️ NewsAPI key not set or invalid, using mock data');
            return [];
        }

        try {
            const articles = [];
            
            // Fetch for each topic
            for (const topic of topics.slice(0, 5)) { // Limit to 5 topics to stay within API limits
                const query = this.buildNewsQuery(topic);
                const apiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&pageSize=10&apiKey=${this.apiKeys.newsApi}`;
                
                // Try with time-based retry logic
                const response = await this.fetchWithTimeLimit(apiUrl);
                
                if (!response || !response.ok) {
                    console.warn('⚠️ All API attempts failed for topic:', topic);
                    continue;
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

    // New method: Fetch with 15-second time limit for proxies
    async fetchWithTimeLimit(apiUrl, timeLimit = 15000) {
        const startTime = Date.now();
        let attempt = 0;
        
        // Try direct API call first
        try {
            console.log('🔄 Trying direct API call...');
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(10000)
            });
            
            if (response.ok) {
                console.log('✅ Success with direct API call');
                return response;
            } else {
                throw new Error(`Direct API responded with ${response.status}`);
            }
        } catch (error) {
            console.warn('⚠️ Direct API call failed:', error.message);
        }
        
        // If direct call failed, try CORS proxies with time limit
        while (Date.now() - startTime < timeLimit) {
            attempt++;
            
            for (const proxy of this.corsProxies) {
                // Check if we've exceeded time limit
                if (Date.now() - startTime >= timeLimit) {
                    console.warn('⏰ Time limit reached, giving up');
                    return null;
                }
                
                try {
                    const proxiedUrl = proxy + encodeURIComponent(apiUrl);
                    console.log(`🔄 Attempt ${attempt}: Trying proxy: ${proxy.split('?')[0]}...`);
                    
                    const response = await fetch(proxiedUrl, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        signal: AbortSignal.timeout(5000) // 5s timeout per proxy attempt
                    });
                    
                    if (response.ok) {
                        console.log(`✅ Success with proxy: ${proxy.split('?')[0]} (attempt ${attempt})`);
                        return response;
                    } else {
                        throw new Error(`Proxy responded with ${response.status}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Proxy ${proxy.split('?')[0]} failed (attempt ${attempt}):`, error.message);
                    continue;
                }
            }
            
            // Brief pause between rounds to avoid overwhelming proxies
            if (Date.now() - startTime < timeLimit - 1000) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        console.warn('⏰ Time limit reached, all proxy attempts failed');
        return null;
    }

    // Fetch research papers from ArXiv (ArXiv allows CORS, so no proxy needed)
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
                    
                    // Include all papers with valid title and summary
                    if (title && summary) {
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
            
            console.log(`✅ Fetched ${papers.length} research papers from ArXiv`);
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
        
        // Expand the topic with related terms and synonyms
        const expandedTerms = this.expandTopicQuery(topic);
        
        return `(${categories}) AND (${expandedTerms})`;
    }

    // Expand topic query with related terms and synonyms
    expandTopicQuery(topic) {
        const topicLower = topic.toLowerCase();
        
        // Define expansion mappings for common AI research topics
        const expansions = {
            'large language models': ['large language models', 'LLM', 'LLMs', 'language models', 'transformer models', 'GPT', 'BERT', 'text generation'],
            'computer vision': ['computer vision', 'CV', 'image recognition', 'object detection', 'image processing', 'visual AI', 'computer vision systems'],
            'reinforcement learning': ['reinforcement learning', 'RL', 'Q-learning', 'policy gradient', 'deep reinforcement learning', 'DRL', 'agent learning'],
            'neural networks': ['neural networks', 'neural network', 'deep neural networks', 'DNN', 'artificial neural networks', 'ANN'],
            'natural language processing': ['natural language processing', 'NLP', 'text processing', 'language understanding', 'computational linguistics'],
            'machine learning': ['machine learning', 'ML', 'supervised learning', 'unsupervised learning', 'statistical learning'],
            'deep learning': ['deep learning', 'deep neural networks', 'deep architectures', 'hierarchical learning'],
            'artificial general intelligence': ['artificial general intelligence', 'AGI', 'general AI', 'human-level AI', 'strong AI'],
            'AI safety': ['AI safety', 'AI alignment', 'AI ethics', 'value alignment', 'AI governance', 'AI risk', 'safety research'],
            'transformers': ['transformer', 'transformers', 'attention mechanism', 'self-attention', 'transformer architecture'],
            'diffusion models': ['diffusion models', 'diffusion', 'generative models', 'score-based models', 'denoising diffusion'],
            'robotics AI': ['robotics AI', 'robotic systems', 'autonomous robots', 'robot learning', 'robotic control', 'robot navigation'],
            'AI alignment research': ['AI alignment', 'alignment research', 'value alignment', 'AI safety', 'AI ethics', 'human-AI alignment', 'goal alignment'],
            'AI ethics': ['AI ethics', 'ethical AI', 'responsible AI', 'AI governance', 'AI policy', 'ethical machine learning'],
            'AI governance': ['AI governance', 'AI policy', 'AI regulation', 'AI oversight', 'AI accountability', 'AI safety'],
            'multimodal AI': ['multimodal AI', 'multimodal learning', 'vision-language models', 'CLIP', 'DALL-E', 'multimodal systems'],
            'federated learning': ['federated learning', 'distributed learning', 'privacy-preserving ML', 'collaborative learning'],
            'few-shot learning': ['few-shot learning', 'meta-learning', 'learning to learn', 'rapid adaptation', 'low-data learning'],
            'causal inference': ['causal inference', 'causality', 'causal discovery', 'causal reasoning', 'causal models'],
            'adversarial attacks': ['adversarial attacks', 'adversarial examples', 'robustness', 'adversarial training', 'security'],
            'interpretability': ['interpretability', 'explainable AI', 'XAI', 'model interpretability', 'transparency', 'explainability']
        };
        
        // Check for exact matches first
        for (const [key, terms] of Object.entries(expansions)) {
            if (topicLower.includes(key) || key.includes(topicLower)) {
                return terms.map(term => `all:"${term}"`).join(' OR ');
            }
        }
        
        // If no exact match, create a broader query based on the topic
        const broaderTerms = this.createBroaderQuery(topic);
        return broaderTerms.map(term => `all:"${term}"`).join(' OR ');
    }

    // Create broader query for unknown topics
    createBroaderQuery(topic) {
        const words = topic.toLowerCase().split(' ');
        const expanded = [topic]; // Include original topic
        
        // Add individual words
        words.forEach(word => {
            if (word.length > 2) { // Skip very short words
                expanded.push(word);
            }
        });
        
        // Add common AI-related prefixes/suffixes
        const aiPrefixes = ['AI', 'ML', 'deep', 'neural', 'intelligent'];
        const aiSuffixes = ['learning', 'models', 'systems', 'algorithms', 'research'];
        
        aiPrefixes.forEach(prefix => {
            expanded.push(`${prefix} ${topic}`);
        });
        
        aiSuffixes.forEach(suffix => {
            expanded.push(`${topic} ${suffix}`);
        });
        
        // Remove duplicates and limit to reasonable number
        return [...new Set(expanded)].slice(0, 8);
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