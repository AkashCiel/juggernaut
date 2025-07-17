const https = require('https');
const { logger, logApiCall } = require('../utils/logger');
const { handleOpenAIError } = require('../utils/errorHandler');
const { sanitizeText } = require('../utils/sanitizer');

class SummaryService {
    async generateSummary(papers, apiKey, timeoutMs = 60000) {
        if (!papers || papers.length === 0) {
            return 'No papers available for summary generation.';
        }

        logger.info(`🤖 Generating AI summary for ${papers.length} papers...`);

        const prompt = this.createSummaryPrompt(papers);
        
        try {
            const summary = await this.callOpenAI(prompt, apiKey, timeoutMs);
            const sanitizedSummary = sanitizeText(summary, 5000);
            
            logApiCall('openai', 'generateSummary', { 
                papersCount: papers.length,
                summaryLength: sanitizedSummary.length 
            });
            
            return sanitizedSummary;
        } catch (error) {
            handleOpenAIError(error);
        }
    }

    createSummaryPrompt(papers) {
        const papersText = papers.map((paper, index) => {
            const authors = Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors;
            const title = sanitizeText(paper.title || '', 200);
            const summary = sanitizeText(paper.summary || '', 1000);
            
            return `${index + 1}. **${title}**\n   Authors: ${authors}\n   Summary: ${summary}\n`;
        }).join('\n');

        return `You are an AI research assistant. Please provide a high-level summary of the following AI research papers. Focus on the most important trends, breakthroughs, and implications. Keep it concise but insightful (2-3 paragraphs max).

Research Papers:
${papersText}

Please provide a clear, well-structured summary that highlights the key findings and their significance in the AI research landscape.`;
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
                max_tokens: 1000,
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