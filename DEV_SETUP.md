# Development Setup

## Quick Start

```bash
# Install dependencies
npm install
cd frontend && npm install

# Start both frontend and backend
npm run dev
```

## What it does

- **Backend**: Runs on `http://localhost:8000` with auto-restart on file changes
- **Frontend**: Runs on `http://localhost:3000` serving the chat interface
- **Chat API**: Available at `http://localhost:8000/api/chat/*`

## Available Scripts

- `npm run dev` - Start both frontend and backend
- `npm run dev:backend` - Start only backend
- `npm run dev:frontend` - Start only frontend

## Chat Interface

Open `http://localhost:3000` to access the chat interface.

The chat will automatically start a session and you can begin chatting immediately.
