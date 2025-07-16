const https = require('https');
const xml2js = require('xml2js');

// Server-side ArXiv API for GitHub Actions
// Default: 50 papers (higher than client-side for comprehensive automated reports)
const SERVER_MAX_PAPERS = 50;

async function fetchArxivPapers(topics, maxResults = SERVER_MAX_PAPERS) {
    console.log(`🔍 Searching ArXiv for topics: ${topics.join(', ')}`);
    console.log(`📊 Server-side limit: ${maxResults} papers (GitHub Actions)`);
    
    const papers = [];
    
    for (const topic of topics) {
        try {
            const searchResults = await searchArxiv(topic, maxResults);
            papers.push(...searchResults);
        } catch (error) {
            console.error(`❌ Error searching for topic "${topic}":`, error.message);
        }
    }
    
    // Remove duplicates and sort by date
    const uniquePapers = removeDuplicates(papers);
    uniquePapers.sort((a, b) => new Date(b.published) - new Date(a.published));
    
    return uniquePapers.slice(0, maxResults);
}

function searchArxiv(query, maxResults = SERVER_MAX_PAPERS) {
    return new Promise((resolve, reject) => {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://export.arxiv.org/api/query?search_query=all:${encodedQuery}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', async () => {
                try {
                    const papers = await parseArxivResponse(data);
                    resolve(papers);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

async function parseArxivResponse(xmlData) {
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

function removeDuplicates(papers) {
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

module.exports = { fetchArxivPapers }; 