/**
 * Section Summary Generator
 * Generates a high-level summary for a Guardian section based on recent articles
 * 
 * Usage: node generate-section-summary.js <section-name>
 * Example: node generate-section-summary.js technology
 */

require('dotenv').config();
const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GITHUB_REPO_OWNER = 'AkashCiel';
const GITHUB_REPO_NAME = 'juggernaut-reports';
const GITHUB_BRANCH = 'main';
const SECTION_SUMMARY_MODEL = 'gpt-4o';

// System prompt for section summary generation
const SYSTEM_PROMPT = `You are responsible for writing highly informative, insightful, and information dense summaries of a collection of news articles.
Your summary will be used to identify if those articles map to the implicit or explicit interests of a reader.

Your summary should:
1. Start with a statement of the main theme or topic of the section.
2. Identify all major themes or topic clusters within the section
3. Describe the typical subject matter and focus areas
4. Note any geographic or temporal patterns (e.g., US-focused, breaking news vs analysis)
5. Highlight the breadth vs depth of coverage (broad topics vs specialized niches)

Output format: 500 words

DO NOT:
- List individual articles or specific stories
- Include metadata or article counts
- Add disclaimers or caveats`;

/**
 * Fetch section library from GitHub
 */
async function fetchSectionLibrary(section) {
    const path = `backend/data/article-library/${section}.json`;
    const url = `/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${path}?ref=${GITHUB_BRANCH}`;
    
    console.log(`Fetching library: ${section}.json`);
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: url,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'User-Agent': 'Node.js',
                'Accept': 'application/vnd.github.v3+json'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`GitHub API returned ${res.statusCode}: ${data}`));
                    return;
                }
                
                try {
                    const json = JSON.parse(data);
                    // Decode base64 content
                    const content = Buffer.from(json.content, 'base64').toString('utf8');
                    const library = JSON.parse(content);
                    resolve(library);
                } catch (e) {
                    reject(new Error(`Failed to parse library: ${e.message}`));
                }
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

/**
 * Generate section summary using OpenAI
 */
async function generateSectionSummary(articles, section) {
    console.log(`Generating summary for ${articles.length} articles...`);
    
    // Format articles for prompt - only summaries
    const articleTexts = articles.map((article, index) => {
        return `${index + 1}. ${article.summary}`;
    }).join('\n\n');
    
    const userPrompt = articleTexts;
    
    const requestData = {
        model: SECTION_SUMMARY_MODEL,
        messages: [
            {
                role: 'system',
                content: SYSTEM_PROMPT
            },
            {
                role: 'user',
                content: userPrompt
            }
        ],
        temperature: 0.7
    };
    
    const data = JSON.stringify(requestData);
    
    const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Length': Buffer.byteLength(data)
        }
    };
    
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(responseData);
                    if (json.error) {
                        reject(new Error(`OpenAI API error: ${json.error.message}`));
                    } else {
                        const summary = json.choices[0].message.content.trim();
                        resolve({
                            summary,
                            tokens: json.usage
                        });
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse OpenAI response: ${e.message}`));
                }
            });
        });
        
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

/**
 * Main execution
 */
async function main() {
    const section = process.argv[2];
    
    if (!section) {
        console.error('Usage: node generate-section-summary.js <section-name>');
        console.error('Example: node generate-section-summary.js technology');
        process.exit(1);
    }
    
    console.log('='.repeat(80));
    console.log(`SECTION SUMMARY GENERATOR: ${section}`);
    console.log('='.repeat(80));
    console.log('');
    
    try {
        // Step 1: Fetch library
        const library = await fetchSectionLibrary(section);
        console.log(`✅ Loaded library: ${library.articles.length} total articles`);
        console.log(`   Date range: ${library.metadata.date_range.from} to ${library.metadata.date_range.to}`);
        console.log('');
        
        // Step 2: Take top 100 articles (most recent)
        const articlesToAnalyze = library.articles.slice(0, 100);
        console.log(`📊 Analyzing top ${articlesToAnalyze.length} articles`);
        console.log('');
        
        // Step 3: Generate summary
        const result = await generateSectionSummary(articlesToAnalyze, section);
        
        // Step 4: Display results
        console.log('='.repeat(80));
        console.log('SECTION SUMMARY');
        console.log('='.repeat(80));
        console.log('');
        console.log(result.summary);
        console.log('');
        console.log('-'.repeat(80));
        console.log(`Tokens used: ${result.tokens.total_tokens} (prompt: ${result.tokens.prompt_tokens}, completion: ${result.tokens.completion_tokens})`);
        console.log('='.repeat(80));
        
    } catch (error) {
        console.error('');
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run
main();

