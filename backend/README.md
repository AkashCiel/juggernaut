# AI News Agent Backend

A secure, modular backend API for generating AI research reports with comprehensive security, validation, and error handling.

## 🚀 Features

- **Secure API**: Input validation, XSS protection, rate limiting
- **Modular Architecture**: Separated concerns with dedicated services
- **Structured Logging**: Winston-based logging with file rotation
- **Error Handling**: Centralized error management with proper categorization
- **Input Sanitization**: DOMPurify-based XSS protection
- **Rate Limiting**: Configurable rate limits per endpoint
- **Health Monitoring**: Comprehensive health checks and status endpoints

## 📁 Architecture

```
backend/
├── middleware/          # Express middleware
│   ├── validation.js   # Input validation rules
│   └── security.js     # Security middleware (rate limiting, auth)
├── routes/             # API route handlers
│   ├── healthRoutes.js # Health check endpoints
│   └── reportRoutes.js # Report generation endpoints
├── services/           # Business logic services
│   ├── arxivService.js # ArXiv API integration
│   ├── summaryService.js # OpenAI integration
│   ├── emailService.js # Mailgun integration
│   └── githubService.js # GitHub API integration
├── utils/              # Utility functions
│   ├── logger.js       # Structured logging
│   ├── errorHandler.js # Error handling utilities
│   └── sanitizer.js    # Input sanitization
├── logs/               # Log files (auto-created)
├── server.js           # Main application entry point
└── package.json        # Dependencies and scripts
```

## 🔧 Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your actual API keys
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

## 🔐 Security Features

### Input Validation
- **Express Validator**: Comprehensive request validation
- **Type Checking**: Automatic type conversion and validation
- **Size Limits**: Configurable limits on request sizes
- **Pattern Matching**: Regex validation for inputs

### XSS Protection
- **DOMPurify**: HTML sanitization for all user inputs
- **Content Security Policy**: Helmet.js security headers
- **Input Sanitization**: Automatic cleaning of all user data

### Rate Limiting
- **General Limiter**: 100 requests per 15 minutes
- **Report Generation**: 10 reports per hour
- **API Limiter**: 50 API calls per 15 minutes

### Authentication
- **API Key Authentication**: Simple API key validation
- **Optional Auth**: Configurable authentication per endpoint
- **Secure Headers**: HSTS, CSP, and other security headers

## 📊 API Endpoints

### Health & Status
- `GET /health` - Health check with detailed status
- `GET /test` - Simple connectivity test
- `GET /status` - Environment configuration status

### Report Generation
- `POST /api/generate-report` - Generate AI research report
- `POST /api/test/arxiv` - Test ArXiv service
- `POST /api/test/summary` - Test OpenAI summary service

## 🔍 Monitoring & Logging

### Log Levels
- **Error**: Application errors and exceptions
- **Warn**: Warning conditions and demo mode
- **Info**: General application flow
- **Debug**: Detailed debugging information

### Log Files
- `logs/error.log` - Error-level logs only
- `logs/combined.log` - All log levels
- Console output with colorized formatting

### Health Checks
- Service status monitoring
- Environment configuration validation
- Memory usage tracking
- Uptime monitoring

## 🛡️ Error Handling

### Error Categories
- **ValidationError**: Input validation failures
- **AuthenticationError**: Authentication/authorization issues
- **ExternalServiceError**: Third-party API failures
- **ConfigurationError**: Environment configuration issues
- **RateLimitError**: Rate limiting violations

### Error Responses
```json
{
  "error": "ValidationError",
  "message": "Invalid input provided",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/generate-report",
  "details": {
    "field": "topics",
    "service": "arxiv"
  }
}
```

## 🔧 Configuration

### Environment Variables
```bash
# Required API Keys
OPENAI_API_KEY=your_openai_api_key
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
GITHUB_TOKEN=your_github_token
GITHUB_BRANCH=main

# Security
API_KEY=mvp-api-key-2024

# Server Configuration
PORT=8000
NODE_ENV=development
LOG_LEVEL=info
```

### Rate Limiting Configuration
```javascript
// Customize in middleware/security.js
const reportGenerationLimiter = createRateLimiter(
    60 * 60 * 1000, // 1 hour window
    10,             // 10 requests per hour
    'Rate limit message'
);
```

## 🚀 Deployment

### Production Considerations
1. **Environment Variables**: Set all required API keys
2. **Log Level**: Set to 'info' or 'warn' for production
3. **CORS**: Configure allowed origins for your frontend
4. **Rate Limiting**: Adjust limits based on expected traffic
5. **Monitoring**: Set up log aggregation and monitoring

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8000
CMD ["npm", "start"]
```

## 🔍 Troubleshooting

### Common Issues

1. **Demo Mode Active**
   - Check environment variables are properly set
   - Verify API keys don't contain 'placeholder'

2. **Rate Limiting**
   - Check rate limit headers in responses
   - Adjust limits in security middleware

3. **Validation Errors**
   - Review request payload format
   - Check input sanitization rules

4. **External Service Errors**
   - Verify API keys are valid
   - Check service availability
   - Review error logs for details

### Debug Mode
```bash
LOG_LEVEL=debug npm start
```

## 📈 Performance

### Optimizations
- **Request Timeouts**: 30-second timeouts for external APIs
- **Input Sanitization**: Efficient DOMPurify usage
- **Memory Management**: Proper cleanup of large objects
- **Caching**: Future enhancement for API responses

### Monitoring
- Request duration logging
- Memory usage tracking
- Error rate monitoring
- API call statistics

## 🤝 Contributing

1. Follow the modular architecture
2. Add proper error handling
3. Include input validation
4. Update documentation
5. Add tests for new features

## 📄 License

ISC License - see package.json for details 