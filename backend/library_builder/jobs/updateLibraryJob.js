#!/usr/bin/env node

/**
 * Automated Article Library Update Job
 * 
 * Discovers all sections with article libraries and updates them by:
 * 1. Fetching articles from Guardian (last N days)
 * 2. Submitting batch to OpenAI
 * 3. Polling until batch completes
 * 4. Completing and uploading to GitHub
 * 
 * Usage:
 *   node updateLibraryJob.js --days 2
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { exec } = require('child_process');
const { promisify } = require('util');
const https = require('https');
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

const execAsync = promisify(exec);

// Constants
const GITHUB_REPO_OWNER = 'AkashCiel';
const GITHUB_REPO_NAME = 'juggernaut-reports';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const ARTICLE_LIBRARY_PATH = 'backend/data/article-library';
const CHECK_INTERVAL_MS = 10000; // 10 seconds
const BATCH_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours because openAI promises to complete the batch in 24 hours
const DEFAULT_DAYS = 2;

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = { days: DEFAULT_DAYS };
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--days' && args[i + 1]) {
            options.days = parseInt(args[i + 1], 10);
            i++;
        }
    }
    
    return options;
}

/**
 * Discover sections from GitHub article library
 * @returns {Promise<string[]>} Array of section names
 */
async function discoverSectionsFromGitHub() {
    const githubToken = process.env.TOKEN_GITHUB;
    
    if (!githubToken) {
        throw new Error('TOKEN_GITHUB environment variable is required');
    }
    
    return new Promise((resolve, reject) => {
        const url = `/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${ARTICLE_LIBRARY_PATH}?ref=${GITHUB_BRANCH}`;
        
        const options = {
            hostname: 'api.github.com',
            path: url,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${githubToken}`,
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
                    const sections = files
                        .filter(file => file.type === 'file' && file.name.endsWith('.json'))
                        .map(file => file.name.replace('.json', ''))
                        .sort();
                    
                    logger.info(`📋 Discovered ${sections.length} sections from GitHub: ${sections.join(', ')}`);
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
 * Execute a library builder command
 * @param {string} command - Command to run (fetch, submit, check, complete)
 * @param {Object} options - Command options
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
async function runCommand(command, options = {}) {
    const scriptPath = path.join(__dirname, '../generate-library.js');
    let cmd = `node ${scriptPath} ${command}`;
    
    if (options.section) {
        cmd += ` --section ${options.section}`;
    }
    if (options.days) {
        cmd += ` --days ${options.days}`;
    }
    
    logger.debug(`Executing: ${cmd}`);
    
    try {
        const { stdout, stderr } = await execAsync(cmd, {
            cwd: path.join(__dirname, '..'),
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });
        
        return { stdout, stderr };
    } catch (error) {
        throw new Error(`Command failed: ${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`);
    }
}

/**
 * Check if batch is complete from check command output
 * @param {string} output - stdout from check command
 * @returns {boolean}
 */
function isBatchComplete(output) {
    return output.includes('✅ Batch processing complete!') || 
           output.includes("status: 'completed'") ||
           (output.includes('Status:') && output.match(/Status:\s*completed/i));
}

/**
 * Check if batch has failed
 * @param {string} output - stdout from check command
 * @returns {boolean}
 */
function isBatchFailed(output) {
    return output.includes('❌ Batch') || 
           output.includes('failed') ||
           output.includes('expired') ||
           output.includes('cancelled');
}

/**
 * Poll check command until batch completes
 * @param {number} timeoutMs - Maximum time to wait
 * @returns {Promise<boolean>} True if completed successfully, false if failed
 */
async function pollUntilComplete(timeoutMs = BATCH_TIMEOUT_MS) {
    const startTime = Date.now();
    let attempt = 0;
    
    while (Date.now() - startTime < timeoutMs) {
        attempt++;
        logger.info(`📊 Checking batch status (attempt ${attempt})...`);
        
        try {
            const { stdout } = await runCommand('check');
            
            if (isBatchComplete(stdout)) {
                logger.info('✅ Batch processing complete!');
                return true;
            }
            
            if (isBatchFailed(stdout)) {
                logger.error('❌ Batch processing failed');
                return false;
            }
            
            logger.info('⏳ Batch still processing, waiting 10 seconds...');
            await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
            
        } catch (error) {
            logger.error(`❌ Error checking batch status: ${error.message}`);
            // Continue polling despite errors (might be transient)
            await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
        }
    }
    
    logger.error(`⏱️ Batch did not complete within timeout (${timeoutMs / 1000 / 60} minutes)`);
    return false;
}

/**
 * Process a single section through the full workflow
 * @param {string} section - Section name
 * @param {number} days - Number of days to look back
 * @returns {Promise<{success: boolean, section: string, error?: string}>}
 */
async function processSection(section, days) {
    logger.section(`Processing Section: ${section}`);
    
    try {
        // Step 1: Fetch articles
        logger.subsection('Step 1: Fetching articles');
        await runCommand('fetch', { section, days });
        logger.info(`✅ Fetched articles for ${section}`);
        
        // Step 2: Submit batch
        logger.subsection('Step 2: Submitting batch to OpenAI');
        await runCommand('submit');
        logger.info(`✅ Submitted batch for ${section}`);
        
        // Step 3: Poll until complete
        logger.subsection('Step 3: Waiting for batch to complete');
        const completed = await pollUntilComplete();
        
        if (!completed) {
            throw new Error('Batch processing failed or timed out');
        }
        
        // Step 4: Complete and upload
        logger.subsection('Step 4: Completing and uploading to GitHub');
        await runCommand('complete');
        logger.info(`✅ Completed and uploaded ${section}`);
        
        return { success: true, section };
        
    } catch (error) {
        logger.error(`❌ Failed to process section ${section}: ${error.message}`);
        return { success: false, section, error: error.message };
    }
}

/**
 * Main job orchestrator
 * @param {number} days - Number of days to look back (default: 2)
 */
async function runJob(days = DEFAULT_DAYS) {
    logger.section('Article Library Update Job');
    logger.info(`Days to look back: ${days}`);
    logger.info(`Started at: ${new Date().toISOString()}`);
    
    const results = {
        total: 0,
        successful: 0,
        failed: 0,
        sections: []
    };
    
    try {
        // Discover sections
        logger.subsection('Discovering sections from GitHub');
        const sections = await discoverSectionsFromGitHub();
        
        if (sections.length === 0) {
            logger.warn('⚠️ No sections found in article library');
            return results;
        }
        
        results.total = sections.length;
        logger.info(`📋 Will process ${sections.length} sections`);
        
        // Process each section sequentially
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            logger.info(`\n📰 Processing section ${i + 1}/${sections.length}: ${section}`);
            
            const result = await processSection(section, days);
            results.sections.push(result);
            
            if (result.success) {
                results.successful++;
            } else {
                results.failed++;
            }
            
            // Small delay between sections to avoid rate limits
            if (i < sections.length - 1) {
                logger.info('⏸️ Waiting 5 seconds before next section...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        
        // Summary
        logger.section('Job Summary');
        logger.info(`Total sections: ${results.total}`);
        logger.info(`Successful: ${results.successful}`);
        logger.info(`Failed: ${results.failed}`);
        
        if (results.failed > 0) {
            logger.warn('Failed sections:');
            results.sections
                .filter(r => !r.success)
                .forEach(r => {
                    logger.warn(`  - ${r.section}: ${r.error}`);
                });
        }
        
        logger.info(`\n✅ Job completed at: ${new Date().toISOString()}`);
        
        return results;
        
    } catch (error) {
        logger.error(`❌ Job failed: ${error.message}`);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    const options = parseArgs();
    
    runJob(options.days)
        .then((results) => {
            process.exit(results.failed === 0 ? 0 : 1);
        })
        .catch((error) => {
            logger.error(`Fatal error: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { runJob, discoverSectionsFromGitHub, processSection };

