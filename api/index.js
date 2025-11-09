// Vercel Serverless Function - Express App Entry Point
// This exports the Express app for Vercel serverless deployment
// The same Express app is used for both local development (backend/server.js) and Vercel (api/index.js)

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import middleware
const { generalLimiter, securityHeaders } = require('../backend/middleware/security');
const { logRequest } = require('../backend/utils/logger-vercel');
const { errorHandler } = require('../backend/utils/errorHandler');

// Import routes
const healthRoutes = require('../backend/routes/healthRoutes');
const chatRoutes = require('../backend/routes/chatRoutes');
const emailRoutes = require('../backend/routes/emailRoutes');
const feedbackRoutes = require('../backend/routes/feedbackRoutes');
const schedulerRoutes = require('../backend/routes/schedulerRoutes');

// Initialize Express app
const app = express();

// Security middleware
app.use(securityHeaders);

// CORS configuration - more permissive for Vercel
app.use(cors({
    origin: '*', // Allow all origins for Vercel deployment
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
app.use('/api/chat', chatRoutes);
app.use('/api', emailRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', schedulerRoutes);

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

// Export the Express app for Vercel serverless function
module.exports = app;

