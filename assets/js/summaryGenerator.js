// Summary Generator - AI-powered research paper summaries
class SummaryGenerator {
    constructor() {
        this.apiKeys = {};
        this.isGenerating = false;
    }

    // Set API keys
    setApiKeys(keys) {
        this.apiKeys = keys;
    }

    // Initialize the summary generator
    init() {
        // Get API keys from settingsManager
        if (window.settingsManager) {
            const apiKeys = {
                githubToken: window.settingsManager.getGithubToken(),
                newsApi: window.settingsManager.getNewsApiKey(),
                openaiApi: window.settingsManager.getOpenaiApiKey()
            };
            this.setApiKeys(apiKeys);
        }
        
        console.log('✅ Summary generator initialized');
    }

    // Main function to generate summary
    async generateSummary(newsItems, topics) {
        if (this.isGenerating) {
            console.log('⚠️ Summary generation already in progress');
            return null;
        }

        if (!this.apiKeys.openaiApi) {
            console.log('⚠️ OpenAI API key not set, skipping summary generation');
            return null;
        }

        try {
            this.isGenerating = true;
            console.log('🤖 Generating AI summary...');

            // Extract research papers
            const papers = this.formatPapersForAPI(newsItems);
            
            if (papers.length === 0) {
                console.log('⚠️ No research papers found for summary');
                return null;
            }

            console.log(`📊 Found ${papers.length} research papers for summary`);

            // Create prompt for OpenAI
            const prompt = this.createSummaryPrompt(papers, topics);

            // Call OpenAI API
            const summary = await this.callOpenAIAPI(prompt);

            if (summary) {
                console.log('✅ AI summary generated successfully');
                return summary;
            } else {
                console.log('❌ Failed to generate summary');
                return null;
            }

        } catch (error) {
            console.error('❌ Error generating summary:', error);
            return null;
        } finally {
            this.isGenerating = false;
        }
    }

    // Extract abstracts from research papers
    formatPapersForAPI(newsItems) {
        // Filter only research papers
        const researchPapers = newsItems.filter(item => item.type === 'research');
        
        // Extract abstracts (the 'summary' field contains the abstract)
        const abstracts = researchPapers.map(paper => ({
            title: paper.title,
            abstract: paper.summary,  // This is already the abstract
            authors: paper.authors,
            source: paper.source,
            url: paper.url,
            topic: paper.topic
        }));
        
        console.log(`📝 Formatted ${abstracts.length} papers for API`);
        return abstracts;
    }

    // Create optimized prompt for OpenAI
    createSummaryPrompt(papers, topics) {
        const papersText = papers.map(paper => `
Title: ${paper.title}
Abstract: ${paper.abstract}
Authors: ${paper.authors}
Source: ${paper.source}
Topic: ${paper.topic}
`).join('\n');

        return `You are an AI research analyst. Analyze these recent AI research papers and provide a high-level summary.

Research Papers:
${papersText}

Topics Covered: ${topics.join(', ')}

Please provide a concise summary (2-3 paragraphs) that covers:
1. Key research trends and breakthroughs
2. Notable findings and implications
3. Overall direction of AI research in these areas

Focus on the most significant and impactful research. Write in a language that is easily accessible by a STEM graduate who is not an expert in these fields: ${topics.join(', ')}. Ensure all important information is preserved, and explain or rephrase any technical jargon or advanced concepts as needed for clarity.`;
    }

    // Call OpenAI API
    async callOpenAIAPI(prompt) {
        try {
            console.log('📡 Calling OpenAI API...');

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKeys.openaiApi}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini', // Using the more cost-effective model
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert AI research analyst who provides clear, insightful summaries of research papers.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ OpenAI API error:', response.status, errorData);
                return null;
            }

            const data = await response.json();
            const summary = data.choices?.[0]?.message?.content;

            if (summary) {
                console.log('✅ OpenAI API call successful');
                return summary.trim();
            } else {
                console.error('❌ No summary in OpenAI response');
                return null;
            }

        } catch (error) {
            console.error('❌ Error calling OpenAI API:', error);
            return null;
        }
    }

    // Get summary status
    isGeneratingSummary() {
        return this.isGenerating;
    }

    // Check if summary generator is ready
    isReady() {
        return this.apiKeys && this.apiKeys.openaiApi && this.apiKeys.openaiApi.trim() !== '';
    }
}

// Export for global access
window.SummaryGenerator = SummaryGenerator; 