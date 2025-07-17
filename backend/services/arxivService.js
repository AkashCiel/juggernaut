const https = require('https');
const xml2js = require('xml2js');
const { logger, logApiCall } = require('../utils/logger');
const { handleArxivError } = require('../utils/errorHandler');
const { sanitizePapers } = require('../utils/sanitizer');

// ArXiv API Service for fetching research papers
// Default: 50 papers for comprehensive reports
const SERVER_MAX_PAPERS = 50;

class ArxivService {
    async fetchPapers(topics, maxResults = SERVER_MAX_PAPERS) {
        logger.info(`🔍 Searching ArXiv for topics: ${topics.join(', ')}`);
        logger.info(`📊 Server-side limit: ${maxResults} papers`);
        
        const papers = [];
        
        for (const topic of topics) {
            try {
                const searchResults = await this.searchArxiv(topic, maxResults);
                papers.push(...searchResults);
            } catch (error) {
                handleArxivError(error, topic);
            }
        }
        
        // Remove duplicates and sort by date
        const uniquePapers = this.removeDuplicates(papers);
        uniquePapers.sort((a, b) => new Date(b.published) - new Date(a.published));
        
        // Sanitize papers before returning
        const sanitizedPapers = sanitizePapers(uniquePapers.slice(0, maxResults));
        
        logApiCall('arxiv', 'fetchPapers', { 
            topics: topics.join(', '), 
            papersFound: sanitizedPapers.length 
        });
        
        return sanitizedPapers;
    }

    searchArxiv(query, maxResults = SERVER_MAX_PAPERS) {
        return new Promise((resolve, reject) => {
            const encodedQuery = encodeURIComponent(query);
            const url = `https://export.arxiv.org/api/query?search_query=all:${encodedQuery}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
            
            const timeout = setTimeout(() => {
                reject(new Error('ArXiv request timeout'));
            }, 30000); // 30 second timeout
            
            https.get(url, (res) => {
                clearTimeout(timeout);
                
                if (res.statusCode !== 200) {
                    reject(new Error(`ArXiv API returned status ${res.statusCode}`));
                    return;
                }
                
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', async () => {
                    try {
                        const papers = await this.parseArxivResponse(data);
                        resolve(papers);
                    } catch (error) {
                        reject(error);
                    }
                });
            }).on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    async parseArxivResponse(xmlData) {
        return new Promise((resolve, reject) => {
            xml2js.parseString(xmlData, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                try {
                    const entries = result.feed.entry || [];
                    const papers = entries.map(entry => ({
                        id: entry.id[0],
                        title: entry.title[0].replace(/\s+/g, ' ').trim(),
                        authors: entry.author ? entry.author.map(author => author.name[0]) : [],
                        summary: entry.summary[0].replace(/\s+/g, ' ').trim(),
                        published: entry.published[0],
                        updated: entry.updated[0],
                        link: entry.link ? entry.link[0].$.href : '',
                        categories: entry.category ? entry.category.map(cat => cat.$.term) : []
                    }));
                    
                    resolve(papers);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    removeDuplicates(papers) {
        const seen = new Set();
        return papers.filter(paper => {
            const key = paper.id;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
}

module.exports = ArxivService; 