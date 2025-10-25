const { asyncHandler } = require('../backend/utils/errorHandler');
const { logger } = require('../backend/utils/logger');

module.exports = asyncHandler(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { triggered_by } = req.body;
    
    logger.info('🚀 Daily reports triggered', { 
        triggered_by: triggered_by || 'manual',
        timestamp: new Date().toISOString()
    });
    
    try {
        // Import and use the scheduler service with the new flow
        const SchedulerService = require('../backend/services/schedulerService');
        const schedulerService = new SchedulerService();
        
        // Generate daily reports for all active users using the new curated news flow
        const results = await schedulerService.generateDailyReports();
        
        // Process results from the new flow
        const successfulReports = results.filter(r => r.success);
        const failedReports = results.filter(r => !r.success);
        const emailsSent = results.filter(r => r.emailSent).length;
        
        logger.info('✅ Daily reports generation completed', {
            usersProcessed: results.length,
            usersSucceeded: successfulReports.length,
            usersFailed: failedReports.length,
            emailsSent: emailsSent
        });
        
        res.json({
            success: true,
            message: `Processed ${results.length} users, sent ${emailsSent} emails`,
            data: {
                usersProcessed: results.length,
                usersSucceeded: successfulReports.length,
                usersFailed: failedReports.length,
                emailsSent: emailsSent,
                results: results,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('❌ Daily reports generation failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to generate daily reports',
            message: error.message
        });
    }
});
