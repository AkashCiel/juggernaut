const https = require('https');
const {
    GITHUB_REPO_OWNER,
    GITHUB_REPO_NAME,
    GITHUB_BRANCH,
    SUMMARY_FILE_PATH,
    LIBRARY_PATH_PREFIX,
    SECTION_SUMMARY_MODEL,
    ARTICLES_TO_ANALYZE
} = require('../config/constants');

/**
 * SectionSummaryStorage - Manages section summaries in GitHub
 */
class SectionSummaryStorage {
    constructor() {
        this.githubToken = process.env.GITHUB_TOKEN;
        
        if (!this.githubToken) {
            throw new Error('GITHUB_TOKEN environment variable not set');
        }
    }
    
    /**
     * Discover all available section libraries in GitHub (auto-detect)
     * @returns {Promise<string[]>} - Array of section names
     */
    async discoverSections() {
        console.log('\n🔍 Discovering section libraries from GitHub...');
        
        const url = `/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${LIBRARY_PATH_PREFIX}?ref=${GITHUB_BRANCH}`;
        
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                path: url,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.githubToken}`,
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
                        const files = JSON.parse(data);
                        // Filter .json files and extract section names
                        const sections = files
                            .filter(file => file.name.endsWith('.json'))
                            .map(file => file.name.replace('.json', ''))
                            .sort();
                        
                        console.log(`   ✅ Found ${sections.length} sections: ${sections.join(', ')}`);
                        resolve(sections);
                    } catch (e) {
                        reject(new Error(`Failed to parse GitHub response: ${e.message}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.end();
        });
    }
    
    /**
     * Download existing summary file from GitHub
     * @returns {Promise<Object|null>} - Existing summaries or null
     */
    async downloadExistingSummaries() {
        console.log('\n📥 Downloading existing summaries from GitHub...');
        
        const url = `/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${SUMMARY_FILE_PATH}?ref=${GITHUB_BRANCH}`;
        
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                path: url,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.githubToken}`,
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
                    if (res.statusCode === 404) {
                        console.log('   ℹ️  No existing file found (will create new)');
                        resolve(null);
                        return;
                    }
                    
                    if (res.statusCode !== 200) {
                        reject(new Error(`GitHub API returned ${res.statusCode}: ${data}`));
                        return;
                    }
                    
                    try {
                        const json = JSON.parse(data);
                        // Decode base64 content
                        const content = Buffer.from(json.content, 'base64').toString('utf8');
                        const summaries = JSON.parse(content);
                        
                        const sectionCount = Object.keys(summaries.sections || {}).length;
                        console.log(`   ✅ Found existing file with ${sectionCount} sections`);
                        
                        // Store SHA for updating
                        summaries._sha = json.sha;
                        
                        resolve(summaries);
                    } catch (e) {
                        reject(new Error(`Failed to parse existing summaries: ${e.message}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.end();
        });
    }
    
    /**
     * Merge new summaries with existing (section-level replace)
     * @param {Object|null} existing - Existing summaries object
     * @param {Array} newSummaries - Array of new summary results
     * @returns {Object} - Merged summaries
     */
    mergeSummaries(existing, newSummaries) {
        console.log('\n🔀 Merging summaries...');
        
        // Initialize base structure
        const merged = {
            metadata: {
                generated_at: new Date().toISOString(),
                total_sections: 0,
                model: SECTION_SUMMARY_MODEL,
                articles_per_section: ARTICLES_TO_ANALYZE,
                repository: `${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`,
                last_updated: new Date().toISOString()
            },
            sections: {}
        };
        
        // Copy existing sections if present
        if (existing && existing.sections) {
            merged.sections = { ...existing.sections };
            // Preserve SHA if present
            if (existing._sha) {
                merged._sha = existing._sha;
            }
        }
        
        // Track merge statistics
        let updatedCount = 0;
        let addedCount = 0;
        
        // Merge new summaries (replace at section level)
        for (const summary of newSummaries) {
            const sectionName = summary.section;
            
            if (merged.sections[sectionName]) {
                updatedCount++;
            } else {
                addedCount++;
            }
            
            merged.sections[sectionName] = {
                summary: summary.summary,
                article_count: summary.article_count,
                date_range: summary.date_range,
                tokens_used: summary.tokens_used,
                generated_at: summary.generated_at
            };
        }
        
        // Update total count
        merged.metadata.total_sections = Object.keys(merged.sections).length;
        
        console.log(`   ✅ Merged: ${newSummaries.length} processed, ${updatedCount} updated, ${addedCount} added`);
        console.log(`   Total sections in file: ${merged.metadata.total_sections}`);
        
        return merged;
    }
    
    /**
     * Upload summaries to GitHub
     * @param {Object} summaries - Complete summaries object
     * @param {string} commitMessage - Commit message
     * @returns {Promise<Object>} - { fileUrl, sha }
     */
    async uploadSummaries(summaries, commitMessage) {
        console.log('\n📤 Uploading to GitHub...');
        
        // Extract SHA if present (for updates)
        const sha = summaries._sha;
        delete summaries._sha; // Remove from payload
        
        const content = JSON.stringify(summaries, null, 2);
        const base64Content = Buffer.from(content).toString('base64');
        
        const payload = {
            message: commitMessage,
            content: base64Content,
            branch: GITHUB_BRANCH
        };
        
        // Add SHA if updating existing file
        if (sha) {
            payload.sha = sha;
        }
        
        const data = JSON.stringify(payload);
        const url = `/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${SUMMARY_FILE_PATH}`;
        
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                path: url,
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.githubToken}`,
                    'User-Agent': 'Node.js',
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };
            
            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode !== 200 && res.statusCode !== 201) {
                        reject(new Error(`GitHub API returned ${res.statusCode}: ${responseData}`));
                        return;
                    }
                    
                    try {
                        const json = JSON.parse(responseData);
                        const fileUrl = json.content.html_url;
                        
                        console.log(`   ✅ Uploaded: ${SUMMARY_FILE_PATH}`);
                        console.log(`   URL: ${fileUrl}`);
                        
                        resolve({
                            fileUrl,
                            sha: json.content.sha
                        });
                    } catch (e) {
                        reject(new Error(`Failed to parse GitHub response: ${e.message}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }
}

module.exports = SectionSummaryStorage;

