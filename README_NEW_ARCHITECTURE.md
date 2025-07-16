# AI News Agent - New Architecture

This document describes the new frontend/backend architecture that eliminates code duplication and provides a unified system.

## 🏗️ Architecture Overview

### **New Structure:**
```
juggernaut/
├── backend/           # NEW - Server-side API
│   ├── package.json
│   ├── server.js      # Express.js API server
│   ├── services/      # Business logic services
│   │   ├── arxivService.js
│   │   ├── summaryService.js
│   │   ├── emailService.js
│   │   └── githubService.js
│   └── env.example    # Environment variables template
├── frontend/          # NEW - Browser interface
│   ├── index.html
│   ├── assets/
│   │   ├── css/
│   │   └── js/
│   │       ├── apiClient.js    # NEW - Backend API client
│   │       ├── newsGenerator.js # UPDATED - Uses backend API
│   │       ├── emailSender.js  # UPDATED - Uses backend API
│   │       └── ...
├── assets/            # OLD - Keep for now
├── server/            # OLD - Keep for now
├── index.html         # OLD - Keep for now
└── .github/           # OLD - Keep for now
```

## 🚀 Getting Started

### **1. Backend Setup**

```bash
cd backend
npm install
cp env.example .env
# Edit .env with your API keys
npm start
```

**Required Environment Variables:**
- `OPENAI_API_KEY` - OpenAI API key for AI summaries
- `MAILGUN_API_KEY` - Mailgun API key for email sending
- `MAILGUN_DOMAIN` - Your Mailgun domain
- `GITHUB_TOKEN` - GitHub personal access token
- `PORT` - Server port (default: 8000)

### **2. Frontend Setup**

```bash
cd frontend
# Serve with any static file server
python3 -m http.server 3000
# or
npx serve .
```

**Frontend Configuration:**
- Open `http://localhost:3000`
- Go to Settings → Backend Configuration
- Set Backend URL to `http://localhost:8000`
- Add email recipients

## 🔧 Key Features

### **Unified Codebase:**
- ✅ **Single source of truth** for all business logic
- ✅ **Consistent email formatting** between manual and automated runs
- ✅ **50 papers** for both manual and automated runs
- ✅ **Rich email templates** with professional styling

### **Backend Services:**
- **ArXiv Service** - Fetches research papers (50 papers default)
- **Summary Service** - Generates AI summaries via OpenAI
- **Email Service** - Sends rich HTML emails via Mailgun
- **GitHub Service** - Uploads reports to GitHub Pages

### **Frontend Features:**
- **API Client** - Communicates with backend
- **Settings Management** - Backend URL, email recipients
- **Topic Management** - Research topic selection
- **Report Display** - Shows generated reports

## 📡 API Endpoints

### **Health Check:**
```
GET /health
```

### **Generate Report:**
```
POST /api/generate-report
{
  "topics": ["artificial intelligence", "machine learning"],
  "recipients": ["user@example.com"],
  "maxPapers": 50
}
```

### **Test Services:**
```
POST /api/test/arxiv
POST /api/test/summary
```

## 🔄 Migration Benefits

### **Before (Old Architecture):**
- ❌ **Code duplication** between manual and automated paths
- ❌ **Inconsistent email formatting** (rich vs basic)
- ❌ **Different paper limits** (15 vs 10)
- ❌ **Separate maintenance** for two codebases

### **After (New Architecture):**
- ✅ **Single codebase** for all functionality
- ✅ **Consistent rich email formatting**
- ✅ **Unified 50-paper limit**
- ✅ **Easy maintenance** and updates

## 🧪 Testing

### **Local Testing:**
1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && python3 -m http.server 3000`
3. Open `http://localhost:3000`
4. Configure backend URL in settings
5. Generate a report

### **Backend Testing:**
```bash
cd backend
curl http://localhost:8000/health
curl -X POST http://localhost:8000/api/test/arxiv \
  -H "Content-Type: application/json" \
  -d '{"topics": ["artificial intelligence"], "maxPapers": 5}'
```

## 🚀 Deployment

### **Backend (Render):**
- Deploy `backend/` folder to Render
- Set environment variables in Render dashboard
- Backend will be available at your Render URL

### **Frontend (GitHub Pages):**
- Deploy `frontend/` folder to GitHub Pages
- Update backend URL in frontend settings
- Frontend will be available at your GitHub Pages URL

### **GitHub Actions (Automated Runs):**
- Update workflow to call backend API instead of running server code
- Backend handles all the business logic

## 🔧 Configuration

### **Backend Environment:**
```bash
# backend/.env
OPENAI_API_KEY=sk-...
MAILGUN_API_KEY=key-...
MAILGUN_DOMAIN=your-domain.com
GITHUB_TOKEN=ghp_...
PORT=8000
```

### **Frontend Settings:**
- Backend URL: `http://localhost:8000` (local) or your Render URL (production)
- Email Recipients: List of email addresses to receive reports

## 📝 Next Steps

1. **Test locally** with both frontend and backend
2. **Deploy backend** to Render
3. **Deploy frontend** to GitHub Pages
4. **Update GitHub Actions** to use backend API
5. **Remove old code** once everything is working

## 🆘 Troubleshooting

### **Backend Connection Issues:**
- Check if backend is running on correct port
- Verify CORS settings in backend
- Check browser console for connection errors

### **Email Issues:**
- Verify Mailgun API key and domain
- Check email recipients are configured
- Review backend logs for email errors

### **Paper Fetching Issues:**
- Check ArXiv API is accessible
- Verify topics are valid search terms
- Review backend logs for API errors 