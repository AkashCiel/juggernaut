const https = require('https');

async function generateAISummary(papers, apiKey, timeoutMs = 20000) {
    if (!papers || papers.length === 0) {
        return 'No papers available for summary generation.';
    }

    console.log(`🤖 Generating AI summary for ${papers.length} papers...`);

    const prompt = createSummaryPrompt(papers);
    
    try {
        const summary = await callOpenAI(prompt, apiKey, timeoutMs);
        return summary;
    } catch (error) {
        console.error('❌ Error generating AI summary:', error.message);
        return 'AI summary generation failed. Please check the full report for paper details.';
    }
}

function createSummaryPrompt(papers) {
    const papersText = papers.map((paper, index) => {
        const authors = Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors;
        return `${index + 1}. **${paper.title}**\n   Authors: ${authors}\n   Summary: ${paper.summary}\n`;
    }).join('\n');

    return `You are an AI research assistant. Please provide a high-level summary of the following AI research papers. Focus on the most important trends, breakthroughs, and implications. Keep it concise but insightful (2-3 paragraphs max).

Research Papers:
${papersText}

Please provide a clear, well-structured summary that highlights the key findings and their significance in the AI research landscape.`;
}

function callOpenAI(prompt, apiKey, timeoutMs) {
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

        const req = https.request(options, (res) => {
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
            reject(new Error(`Request failed: ${error.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.setTimeout(timeoutMs);
        req.write(data);
        req.end();
    });
}

module.exports = { generateAISummary }; 