# Vercel Deployment Guide

## Overview
This project has been configured for deployment on Vercel with a unified frontend and backend architecture.

## Project Structure
```
juggernaut/
├── vercel.json                 # Vercel configuration
├── package.json               # Root dependencies
├── api/                       # Serverless functions
│   ├── health.js             # /health endpoint
│   ├── status.js             # /status endpoint
│   ├── test.js               # /test endpoint
│   ├── chat/
│   │   ├── start.js          # /api/chat/start
│   │   └── message.js        # /api/chat/message
│   ├── validate-email.js     # /api/validate-email
│   ├── trigger-daily-reports.js # /api/trigger-daily-reports
│   └── scheduler/
│       └── status.js         # /api/scheduler/status
├── frontend/                  # Static frontend files
│   ├── index.html
│   ├── email-collection.html
│   ├── css/
│   └── js/
└── backend/                   # Original Express app (referenced by serverless functions)
    ├── services/
    ├── utils/
    ├── middleware/
    └── config/
```

## Deployment Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy to Vercel
```bash
# From project root
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name: juggernaut (or your preferred name)
# - Directory: ./
```

### 4. Configure Environment Variables
In Vercel dashboard, go to Project Settings > Environment Variables and add:

```
OPENAI_API_KEY=your_openai_api_key_here
GUARDIAN_API_KEY=your_guardian_api_key_here
MAILGUN_API_KEY=your_mailgun_api_key_here
MAILGUN_DOMAIN=your_mailgun_domain_here
GITHUB_TOKEN=your_github_personal_access_token_here
API_KEY=mvp-api-key-2024
NODE_ENV=production
```

### 5. Redeploy with Environment Variables
```bash
vercel --prod
```

## URL Structure After Deployment

```
https://juggernaut-three.vercel.app/
├── / (frontend - index.html)
├── /email-collection (frontend - email-collection.html)
├── /css/* (static assets)
├── /js/* (static assets)
├── /health (API endpoint)
├── /status (API endpoint)
├── /test (API endpoint)
├── /api/chat/start (API endpoint)
├── /api/chat/message (API endpoint)
├── /api/validate-email (API endpoint)
├── /api/trigger-daily-reports (API endpoint)
└── /api/scheduler/status (API endpoint)
```

## Development vs Production

### Development
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- API calls: `http://localhost:8000/api/*`

### Production (Vercel)
- Frontend: `https://juggernaut-three.vercel.app/`
- Backend: `https://juggernaut-three.vercel.app/api/*`
- API calls: Same domain (no CORS issues)

## Key Benefits

1. **Single Domain**: No CORS issues between frontend and backend
2. **Unified Deployment**: One Vercel project handles everything
3. **Serverless Scaling**: Automatic scaling based on demand
4. **Global CDN**: Fast loading worldwide
5. **Automatic HTTPS**: SSL certificates handled automatically

## Monitoring and Logs

- **Vercel Dashboard**: View deployment status and logs
- **Function Logs**: Available in Vercel dashboard under Functions tab
- **Analytics**: Built-in analytics for performance monitoring

## Custom Domain (Optional)

1. Go to Vercel Dashboard > Project Settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate will be automatically provisioned

## Troubleshooting

### Common Issues

1. **Function Timeout**: Increase `maxDuration` in vercel.json
2. **Environment Variables**: Ensure all required variables are set
3. **CORS Issues**: Check that CORS headers are properly set in API functions
4. **Import Errors**: Verify relative paths in serverless functions

### Debug Commands

```bash
# Local development
vercel dev

# Check deployment status
vercel ls

# View function logs
vercel logs [function-name]
```

## Migration from Render

### Before (Render)
- Frontend: GitHub Pages
- Backend: Render.com
- API: `https://juggernaut-three.vercel.app`

### After (Vercel)
- Frontend + Backend: Vercel
- API: Same domain as frontend
- No CORS configuration needed

## GitHub Actions Integration

The project supports GitHub Actions for daily report generation. Update the webhook URL in your GitHub Actions to point to the new Vercel deployment:

```yaml
# In your GitHub Actions workflow
- name: Trigger Daily Reports
  run: |
    curl -X POST https://juggernaut-three.vercel.app/api/trigger-daily-reports \
      -H "Content-Type: application/json" \
      -d '{"triggered_by": "github-actions"}'
```
