# GitHub Actions Setup Guide

This guide explains how to set up automated report generation using GitHub Actions with all settings stored securely in GitHub Secrets.

## Security Overview

**🔐 ALL SETTINGS STORED SECURELY**: Everything is stored in GitHub Secrets - no files with sensitive data in the repository.

## Setup Steps

### 1. Add All Settings to GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, then add these secrets:

#### **API Keys:**
- `OPENAI_API_KEY`: Your OpenAI API key
- `MAILGUN_API_KEY`: Your Mailgun API key  
- `MAILGUN_DOMAIN`: Your Mailgun domain
- `NEWS_API_KEY`: Your NewsAPI key (optional)
- `GITHUB_TOKEN`: Usually auto-provided

#### **Settings:**
- `TOPICS`: `["large language models","artificial general intelligence","AI safety","robotics AI"]`
- `EMAIL_RECIPIENTS`: `["akash.singh.0762@gmail.com"]`
- `WHATSAPP_NUMBERS`: `["+31647388314"]`
- `ENABLE_NEWS_SEARCH`: `false`
- `ENABLE_RESEARCH_SEARCH`: `true`
- `AUTO_EMAIL`: `true`
- `AUTO_SHARE`: `false`
- `SCHEDULE`: `daily`

### 2. Install Dependencies

```bash
npm install xml2js
```

### 3. Test the Setup

1. Go to your repository on GitHub
2. Navigate to Actions tab
3. Click on "AI News Agent Trigger"
4. Click "Run workflow" → "Run workflow"
5. Check the logs to ensure everything works

## How It Works

1. **Daily Schedule**: GitHub Actions runs automatically at 3 PM UTC daily
2. **Manual Trigger**: You can manually trigger reports anytime
3. **Secure**: All settings and API keys stored in GitHub Secrets
4. **No Files**: No settings files needed in the repository

## File Structure

```
juggernaut/
├── server/
│   ├── reportRunner.js      # Main runner script
│   ├── arxivAPI.js          # ArXiv paper fetching
│   ├── summaryGenerator.js  # OpenAI summary generation
│   └── githubUploader.js    # GitHub upload functionality
└── .github/workflows/
    └── daily-news-trigger.yml  # GitHub Actions workflow
```

## Troubleshooting

### Common Issues:

1. **"No topics configured in GitHub Secrets"**
   - Verify `TOPICS` secret is set correctly
   - Check the JSON format: `["topic1","topic2"]`

2. **"API key not found"**
   - Verify GitHub Secrets are set correctly
   - Check the secret names match exactly

3. **"Email sending failed"**
   - Verify Mailgun API key and domain in secrets
   - Check `EMAIL_RECIPIENTS` secret is set

4. **"GitHub upload failed"**
   - The `GITHUB_TOKEN` is usually auto-provided
   - Check repository permissions

### Debug Mode

To test locally (with your actual API keys):

```bash
# Set environment variables
export OPENAI_API_KEY="your-openai-key"
export MAILGUN_API_KEY="your-mailgun-key"
export MAILGUN_DOMAIN="your-mailgun-domain"
export TOPICS='["large language models","AI safety"]'
export EMAIL_RECIPIENTS='["your-email@example.com"]'
export ENABLE_RESEARCH_SEARCH="true"
export AUTO_EMAIL="true"

# Run the script
npm run generate-report
```

## Security Notes

- ✅ **All settings in GitHub Secrets** (encrypted)
- ✅ **No sensitive files in repository**
- ✅ **GitHub Actions run in isolated environment**
- ✅ **All API calls use environment variables**

## Cost Considerations

- **OpenAI**: ~$0.01-0.05 per report (depending on paper count)
- **Mailgun**: Free tier includes 5,000 emails/month
- **GitHub Actions**: 2,000 minutes/month free for public repos

## Customization

You can modify:
- Schedule timing in `.github/workflows/daily-news-trigger.yml`
- Report format in `server/githubUploader.js`
- Email template in `server/reportRunner.js`
- Paper count in `server/arxivAPI.js` 