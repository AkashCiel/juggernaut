const https = require('https');
const { logger, logApiCall } = require('../utils/logger');
const { handleOpenAIError } = require('../utils/errorHandler');
const { sanitizeText } = require('../utils/sanitizer');

class SummaryService {
    async generateSummary(papers, apiKey, timeoutMs = 60000, topics = []) {
        if (!papers || papers.length === 0) {
            return 'No papers available for summary generation.';
        }

        logger.info(`🤖 Generating AI summary for ${papers.length} papers...`);

        // If topics are provided, generate topic-based summaries
        if (topics && topics.length > 0) {
            return await this.generateTopicBasedSummary(papers, topics, apiKey, timeoutMs);
        }

        // Fallback to original single summary approach
        const prompt = this.createSummaryPrompt(papers);
        
        try {
            const summary = await this.callOpenAI(prompt, apiKey, timeoutMs);
            const sanitizedSummary = sanitizeText(summary);
            
            logApiCall('openai', 'generateSummary', { 
                papersCount: papers.length,
                summaryLength: sanitizedSummary.length 
            });
            
            return sanitizedSummary;
        } catch (error) {
            handleOpenAIError(error);
        }
    }

    async generateSummaryForTopic(topicPapers, topic, apiKey, timeoutMs) {
        if (!topicPapers || topicPapers.length === 0) {
            logger.warn(`⚠️ No papers provided for topic: ${topic}`);
            return null;
        }

        logger.info(`📝 Generating summary for topic "${topic}" with ${topicPapers.length} papers`);
        
        try {
            const topicPrompt = this.createTopicSummaryPrompt(topicPapers, topic);
            const topicSummary = await this.callOpenAI(topicPrompt, apiKey, timeoutMs);
            
            const sanitizedTopicSummary = sanitizeText(topicSummary);
            
            logApiCall('openai', 'generateTopicSummary', { 
                topic: topic,
                papersCount: topicPapers.length,
                summaryLength: sanitizedTopicSummary.length 
            });
            
            return {
                topic: topic,
                summary: sanitizedTopicSummary,
                paperCount: topicPapers.length
            };
            
        } catch (error) {
            logger.error(`❌ Error generating summary for topic "${topic}": ${error.message}`);
            return null;
        }
    }

    async generateTopicBasedSummary(papers, topics, apiKey, timeoutMs) {
        logger.info(`🤖 Generating topic-based summaries for ${topics.length} topics...`);
        
        const topicSummaries = [];
        
        for (const topic of topics) {
            try {
                // Filter papers for this topic (simple keyword matching)
                const topicPapers = this.filterPapersByTopic(papers, topic);
                
                if (topicPapers.length === 0) {
                    logger.warn(`⚠️ No papers found for topic: ${topic}`);
                    continue;
                }
                
                const topicSummary = await this.generateSummaryForTopic(topicPapers, topic, apiKey, timeoutMs);
                if (topicSummary) {
                    topicSummaries.push(topicSummary);
                }
                
            } catch (error) {
                logger.error(`❌ Error generating summary for topic "${topic}": ${error.message}`);
                // Continue with other topics even if one fails
            }
        }
        
        // Combine all topic summaries
        return this.combineTopicSummaries(topicSummaries);
    }

    filterPapersByTopic(papers, topic) {
        const topicLower = topic.toLowerCase();
        return papers.filter(paper => {
            const title = (paper.title || '').toLowerCase();
            const summary = (paper.summary || '').toLowerCase();
            const categories = Array.isArray(paper.categories) 
                ? paper.categories.join(' ').toLowerCase() 
                : '';
            
            return title.includes(topicLower) || 
                   summary.includes(topicLower) || 
                   categories.includes(topicLower);
        });
    }

    createTopicSummaryPrompt(papers, topic) {
        const papersText = papers.map((paper, index) => {
            const authors = Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors;
            const title = sanitizeText(paper.title || '');
            const summary = sanitizeText(paper.summary || '');
            
            return `${index + 1}. **${title}**\n   Authors: ${authors}\n   Summary: ${summary}\n`;
        }).join('\n');

        return `You are a research assistant. Please provide a focused summary of the following research papers related to "${topic}". Focus on the most important trends, breakthroughs, and implications specific to this topic. Write the summary in a way that a STEM graduate who is not an expert in the field can understand. Keep it concise but insightful (1-2 paragraphs max).

Research Papers for "${topic}":
${papersText}

Please provide a clear, well-structured summary that highlights the key findings and their significance in the context of ${topic}.`;
    }

    combineTopicSummaries(topicSummaries) {
        if (topicSummaries.length === 0) {
            return 'No topic summaries available.';
        }
        
        const combinedSummary = topicSummaries.map(item => {
            return `## ${item.topic}\n\n${item.summary}\n\n*Based on ${item.paperCount} research paper${item.paperCount > 1 ? 's' : ''}*\n`;
        }).join('\n---\n\n');
        
        return combinedSummary;
    }

    createSummaryPrompt(papers) {
        const papersText = papers.map((paper, index) => {
            const authors = Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors;
            const title = sanitizeText(paper.title || '');
            const summary = sanitizeText(paper.summary || '');
            
            return `${index + 1}. **${title}**\n   Authors: ${authors}\n   Summary: ${summary}\n`;
        }).join('\n');

        return `You are a research assistant. Please provide a high-level summary of the following research papers. Focus on the most important trends, breakthroughs, and implications. Write the summary in a way that a STEM graduate who is not an expert in the field can understand. Keep it concise but insightful (2-3 paragraphs max).

Research Papers:
${papersText}

Please provide a clear, well-structured summary that highlights the key findings and their significance.`;
    }

    callOpenAI(prompt, apiKey, timeoutMs) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an AI research assistant that provides clear, insightful summaries of research papers.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 4000,
                temperature: 0.7
            });

            const options = {
                hostname: 'api.openai.com',
                port: 443,
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            const timeout = setTimeout(() => {
                req.destroy();
                reject(new Error('OpenAI request timeout'));
            }, timeoutMs);

            const req = https.request(options, (res) => {
                clearTimeout(timeout);
                
                if (res.statusCode !== 200) {
                    reject(new Error(`OpenAI API returned status ${res.statusCode}`));
                    return;
                }
                
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        
                        if (response.error) {
                            reject(new Error(`OpenAI API Error: ${response.error.message}`));
                            return;
                        }
                        
                        if (response.choices && response.choices[0] && response.choices[0].message) {
                            resolve(response.choices[0].message.content.trim());
                        } else {
                            reject(new Error('Unexpected response format from OpenAI API'));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse OpenAI response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(`Request failed: ${error.message}`));
            });

            req.write(data);
            req.end();
        });
    }
}

module.exports = SummaryService; 