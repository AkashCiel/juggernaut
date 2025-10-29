#!/usr/bin/env node

/**
 * Section Summary Generator CLI
 * 
 * Generates high-quality summaries for Guardian news sections.
 * These summaries are used to map user interests to relevant sections.
 * 
 * Usage:
 *   node backend/section_summaries/generate-section-summaries.js
 *     → Generate summaries for ALL sections (auto-detect from GitHub)
 * 
 *   node backend/section_summaries/generate-section-summaries.js technology
 *     → Generate summary for a single section
 * 
 *   node backend/section_summaries/generate-section-summaries.js technology science business
 *     → Generate summaries for specific sections
 * 
 * Environment Variables:
 *   GITHUB_TOKEN          - GitHub personal access token (required)
 *   OPENAI_API_KEY        - OpenAI API key (required)
 *   DISCORD_WEBHOOK_URL   - Discord webhook for notifications (optional)
 * 
 * Output:
 *   Uploads to: juggernaut-reports/backend/data/functional_section_summaries.json
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const generateSectionSummaries = require('./commands/generateSectionSummaries');

/**
 * Print usage information
 */
function printUsage() {
    console.log('Section Summary Generator');
    console.log('');
    console.log('Usage:');
    console.log('  node backend/section_summaries/generate-section-summaries.js');
    console.log('    → Generate summaries for ALL sections');
    console.log('');
    console.log('  node backend/section_summaries/generate-section-summaries.js technology');
    console.log('    → Generate summary for single section');
    console.log('');
    console.log('  node backend/section_summaries/generate-section-summaries.js tech science business');
    console.log('    → Generate summaries for specific sections');
    console.log('');
    console.log('Required Environment Variables:');
    console.log('  GITHUB_TOKEN       - GitHub personal access token');
    console.log('  OPENAI_API_KEY     - OpenAI API key');
    console.log('');
    console.log('Optional:');
    console.log('  DISCORD_WEBHOOK_URL - Discord webhook for notifications');
}

/**
 * Validate environment variables
 */
function validateEnvironment() {
    const missing = [];
    
    if (!process.env.GITHUB_TOKEN) {
        missing.push('GITHUB_TOKEN');
    }
    if (!process.env.OPENAI_API_KEY) {
        missing.push('OPENAI_API_KEY');
    }
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        console.error('');
        console.error('Please set these in backend/.env');
        return false;
    }
    
    return true;
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    
    // Handle help flag
    if (args.includes('--help') || args.includes('-h')) {
        printUsage();
        process.exit(0);
    }
    
    // Validate environment
    if (!validateEnvironment()) {
        process.exit(1);
    }
    
    try {
        if (args.length === 0) {
            // No args → generate all sections
            console.log('📋 Mode: Generate summaries for ALL sections (auto-detect)');
            console.log('');
            await generateSectionSummaries();
        } else {
            // Args provided → generate specific sections
            const sections = args;
            console.log(`📋 Mode: Generate summaries for specific sections`);
            console.log(`📋 Sections: ${sections.join(', ')}`);
            console.log('');
            await generateSectionSummaries({ sections });
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('');
        console.error('Fatal error:', error.message);
        if (process.env.NODE_ENV === 'development') {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Run
main();

