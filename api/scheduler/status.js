const { asyncHandler } = require('../../backend/utils/errorHandler');

module.exports = asyncHandler(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    res.json({
        success: true,
        data: {
            type: 'github-actions',
            schedule: 'Daily at 4 PM Amsterdam time',
            nextRun: 'Automatically managed by GitHub Actions',
            status: 'active'
        }
    });
});
