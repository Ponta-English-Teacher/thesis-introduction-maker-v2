# Thesis Introduction Maker V2

A single-page educational web app that guides students through building a thesis introduction step-by-step, with AI assistance at each stage.

## Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React (Vite) |
| Backend  | Express |
| AI       | OpenAI gpt-4o via `/api/chat` |

The API key lives only on the server. The frontend never sees it.

## Project Structure

```
.
├── .env.local            ← your secrets (never committed)
├── .env.example          ← copy this to .env.local
├── package.json          ← root scripts (runs both servers)
├── server/
│   ├── index.js          ← Express server + /api/chat + /api/test
│   └── package.json
└── client/
    ├── index.html
    ├── vite.config.js    ← proxies /api/* to Express
    └── src/
        ├── main.jsx
        ├── App.jsx       ← full 7-stage workflow
        └── App.css
```

## Setup

```bash
# 1. Copy the example env file and add your key
cp .env.example .env.local
# edit .env.local and replace with your real key

# 2. Install all dependencies
npm run install:all

# 3. Start both servers
npm run dev
```

- Frontend: http://localhost:5173  
- Backend:  http://localhost:3001

## Workflow Stages

| # | Stage | AI Task |
|---|-------|---------|
| 1 | Topic Exploration | Generates tentative title + summary (or asks follow-up questions if topic is vague) |
| 2 | Main Idea | Organizes rough thoughts into a focused main idea statement |
| 3 | Method | Summarizes planned methods as a formal research declaration |
| 4 | Significance | Shapes the student's explanation into a purpose/significance statement |
| 5 | Generate Introduction | Combines all approved outputs into a complete academic introduction |
| 6 | Instructor Feedback | Captures instructor comments (no AI at this stage) |
| 7 | Revision | Rewrites the introduction based on instructor feedback |

## Features

- Progress indicator with stage navigation
- Per-stage AI output with Approve / Revise / Add more thoughts controls
- Approved outputs summary panel
- All work saved automatically to `localStorage`
- Export as JSON (full state) or HTML (formatted document)
- Reset with confirmation dialog

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Sends messages to OpenAI, returns AI response |
| GET  | `/api/test` | Returns `{"apiKeyLoaded": true/false}` for env verification |
