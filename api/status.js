const { validateEnvironment } = require('../backend/utils/errorHandler');
const { setupCors } = require('../backend/utils/corsMiddleware');

module.exports = async (req, res) => {
    // Handle CORS and preflight requests
    if (!setupCors(req, res)) {
        return; // Preflight handled, exit early
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const status = {
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 8000,
        openaiConfigured: !!(process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('placeholder')),
        mailgunConfigured: !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN && 
                             !process.env.MAILGUN_API_KEY.includes('placeholder') && 
                             !process.env.MAILGUN_DOMAIN.includes('placeholder')),
        githubConfigured: !!(process.env.GITHUB_TOKEN && !process.env.GITHUB_TOKEN.includes('placeholder')),
        demoMode: !validateEnvironment()
    };

    res.json(status);
};
