const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import middleware
const { generalLimiter, securityHeaders } = require('./middleware/security');
const { logRequest } = require('./utils/logger-vercel');
const { errorHandler } = require('./utils/errorHandler');

// Import routes
const healthRoutes = require('./routes/healthRoutes');
const reportRoutes = require('./routes/reportRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(securityHeaders);

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? 'https://akashciel.github.io'
        : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::]:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(logRequest);

// Rate limiting
app.use(generalLimiter);

// Routes
app.use('/', healthRoutes);
app.use('/api', reportRoutes);
app.use('/api/chat', chatRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
    process.exit(0);
});

process.on('SIGINT', () => {
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 AI News Agent Backend running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 API endpoint: http://localhost:${PORT}/api/generate-report`);
    console.log(`🔍 Status check: http://localhost:${PORT}/status`);
});

module.exports = app; 