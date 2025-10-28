#!/usr/bin/env node

/**
 * Article Library Generator - Main CLI
 * 
 * Commands:
 *   submit    - Fetch articles & submit batch to OpenAI
 *   check     - Check batch processing status  
 *   complete  - Download results & build library
 * 
 * Usage:
 *   node generate-library.js submit --section technology --days 40
 *   node generate-library.js check
 *   node generate-library.js complete
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { logger, logFilePath } = require('./utils/logger');

// Import commands
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
  submit     Fetch articles and submit batch to OpenAI
  check      Check batch processing status
  complete   Download results and build library

Submit Options:
  --section <name>    Guardian section name (required)
  --days <number>     Days to look back (default: 40)

Examples:
  node generate-library.js submit --section technology --days 40
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
            case 'submit':
                if (!options.section) {
                    logger.error('--section is required for submit command');
                    printUsage();
                    process.exit(1);
                }
                
                result = await submit({
                    section: options.section,
                    days: parseInt(options.days) || 40
                });
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

