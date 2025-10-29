#!/usr/bin/env node

/**
 * Article Library Generator - Main CLI
 * 
 * Commands:
 *   fetch     - Fetch articles & create batch file
 *   submit    - Submit batch to OpenAI
 *   check     - Check batch processing status  
 *   complete  - Download results & build library
 * 
 * Usage:
 *   node generate-library.js fetch --section technology --days 2
 *   node generate-library.js submit
 *   node generate-library.js check
 *   node generate-library.js complete
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { logger, logFilePath } = require('./utils/logger');

// Import commands
const fetch = require('./commands/fetch');
const submit = require('./commands/submit');
const check = require('./commands/check');
const complete = require('./commands/complete');

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        printUsage();
        process.exit(1);
    }
    
    const command = args[0];
    const options = {};
    
    // Parse options
    for (let i = 1; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].substring(2);
            const value = args[i + 1];
            options[key] = value;
            i++; // Skip next arg
        }
    }
    
    return { command, options };
}

function printUsage() {
    console.log(`
Article Library Generator

Usage:
  node generate-library.js <command> [options]

Commands:
  fetch      Fetch articles and create batch file (without submitting)
  submit     Submit fetched batch to OpenAI
  check      Check batch processing status
  complete   Download results and build library

Fetch Options:
  --section <name>    Guardian section name (required)
  --days <number>     Days to look back (default: 40)

Examples:
  node generate-library.js fetch --section technology --days 2
  node generate-library.js submit
  node generate-library.js check
  node generate-library.js complete

Log File:
  ${logFilePath}
`);
}

// Main execution
async function main() {
    const { command, options } = parseArgs();
    
    logger.info('='.repeat(80));
    logger.info('Article Library Generator');
    logger.info(`Command: ${command}`);
    logger.info(`Log file: ${logFilePath}`);
    logger.info('='.repeat(80));
    
    try {
        let result;
        
        switch (command) {
            case 'fetch':
                if (!options.section) {
                    logger.error('--section is required for fetch command');
                    printUsage();
                    process.exit(1);
                }
                
                result = await fetch({
                    section: options.section,
                    days: parseInt(options.days) || 40
                });
                break;
                
            case 'submit':
                result = await submit();
                break;
                
            case 'check':
                result = await check();
                break;
                
            case 'complete':
                result = await complete();
                break;
                
            default:
                logger.error(`Unknown command: ${command}`);
                printUsage();
                process.exit(1);
        }
        
        if (result && result.success) {
            logger.info('');
            logger.info('✅ Command completed successfully');
            process.exit(0);
        }
        
    } catch (error) {
        logger.error('');
        logger.error('❌ Command failed');
        logger.error(`Error: ${error.message}`);
        
        if (error.stack) {
            logger.debug('Stack trace:', error.stack);
        }
        
        logger.error('');
        logger.error(`Check log file for details: ${logFilePath}`);
        process.exit(1);
    }
}

// Run
main();

