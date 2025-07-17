#!/usr/bin/env node

/**
 * Daily Report Scheduler
 * 
 * This script generates daily reports for all registered users.
 * It replaces the old server/reportRunner.js functionality.
 * 
 * Usage:
 *   node scheduler.js                    # Generate reports for all eligible users
 *   node scheduler.js --user <email>     # Generate report for specific user
 *   node scheduler.js --status           # Show scheduler status
 */

const SchedulerService = require('./services/schedulerService');
const UserService = require('./services/userService');
const { logger } = require('./utils/logger');

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    try {
        const schedulerService = new SchedulerService();
        const userService = new UserService();
        
        switch (command) {
            case '--status':
                await showStatus(schedulerService);
                break;
                
            case '--user':
                const email = args[1];
                if (!email) {
                    console.error('❌ Please provide an email address: node scheduler.js --user <email>');
                    process.exit(1);
                }
                await generateUserReport(schedulerService, userService, email);
                break;
                
            case '--list-users':
                await listUsers(userService);
                break;
                
            default:
                // Default: generate daily reports for all eligible users
                await generateDailyReports(schedulerService);
                break;
        }
        
    } catch (error) {
        logger.error('❌ Scheduler failed:', error.message);
        process.exit(1);
    }
}

async function showStatus(schedulerService) {
    console.log('📊 Scheduler Status');
    console.log('==================');
    
    const status = await schedulerService.getStatus();
    
    console.log(`Total Active Users: ${status.totalActiveUsers}`);
    console.log(`Eligible for Today: ${status.eligibleForToday}`);
    console.log(`Last Run: ${status.lastRun}`);
    console.log(`Demo Mode: ${status.isDemoMode ? 'Yes' : 'No'}`);
    
    if (status.eligibleForToday > 0) {
        console.log('\n✅ Ready to generate daily reports');
    } else {
        console.log('\n⏸️ All users have already received today\'s report');
    }
}

async function generateDailyReports(schedulerService) {
    console.log('🚀 Starting daily report generation...');
    
    const results = await schedulerService.generateDailyReports();
    
    if (!results || results.length === 0) {
        console.log('✅ No eligible users for today\'s report');
        return;
    }
    
    console.log('\n📊 Report Generation Summary');
    console.log('============================');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    
    if (successful.length > 0) {
        console.log('\n✅ Successful Reports:');
        successful.forEach(result => {
            console.log(`  - ${result.email} (${result.userId})`);
            console.log(`    Papers: ${result.papersCount}, AI Summary: ${result.hasAISummary ? 'Yes' : 'No'}`);
            if (result.reportUrl) console.log(`    Report: ${result.reportUrl}`);
        });
    }
    
    if (failed.length > 0) {
        console.log('\n❌ Failed Reports:');
        failed.forEach(result => {
            console.log(`  - ${result.email} (${result.userId}): ${result.error}`);
        });
    }
}

async function generateUserReport(schedulerService, userService, email) {
    console.log(`📝 Generating report for user: ${email}`);
    
    const user = await userService.getUserById(userService.generateUserId(email));
    
    if (!user) {
        console.error(`❌ User not found: ${email}`);
        console.log('💡 Register the user first using the /api/register-user endpoint');
        process.exit(1);
    }
    
    if (!user.isActive) {
        console.error(`❌ User is inactive: ${email}`);
        process.exit(1);
    }
    
    const result = await schedulerService.generateUserReport(user);
    
    if (result.success) {
        console.log('✅ Report generated successfully!');
        console.log(`   Papers: ${result.papersCount}`);
        console.log(`   AI Summary: ${result.hasAISummary ? 'Yes' : 'No'}`);
        console.log(`   Duration: ${result.duration}ms`);
        if (result.reportUrl) console.log(`   Report: ${result.reportUrl}`);
    } else {
        console.error('❌ Report generation failed:', result.error);
        process.exit(1);
    }
}

async function listUsers(userService) {
    console.log('👥 Registered Users');
    console.log('==================');
    
    const users = await userService.getAllActiveUsers();
    
    if (users.length === 0) {
        console.log('No registered users found');
        return;
    }
    
    users.forEach(user => {
        console.log(`\n📧 ${user.email} (${user.userId})`);
        console.log(`   Topics: ${user.topics.join(', ')}`);
        console.log(`   Status: ${user.isActive ? 'Active' : 'Inactive'}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log(`   Last Report: ${user.lastReportDate || 'Never'}`);
    });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Run the scheduler
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = { main }; 