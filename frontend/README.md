# NIAT Teachers – AI Voice Doubt Clarification Platform

An AI-powered teaching assistant for NIAT B.Tech students. Students can chat with or voice-call their faculty's AI clone to clear doubts in Programming, Web Development, Mathematics, Generative AI, Aptitude, and English.

## Project Structure

```
niat teachers/
├── frontend/          ← React + Vite SPA  →  deploy to Vercel
│   ├── src/
│   ├── public/
│   ├── vercel.json
│   └── package.json
│
├── backend/           ← Node.js HTTP API  →  deploy to Render
│   ├── server.js
│   ├── server-data/
│   ├── public/uploads/
│   ├── render.yaml
│   └── package.json
│
└── README.md
```

## Local Development

### Backend (runs on port 5000)

```bash
cd backend
cp .env.example .env      # fill in your values
npm install
npm run dev
```

### Frontend (runs on port 3000)

The frontend dev server includes an inline API plugin that mirrors the backend for local development — you can run just the frontend without starting the backend separately.

```bash
cd frontend
cp .env.example .env      # fill in your values
npm install
npm run dev
```

If you want to test against a live backend, set `VITE_API_BASE_URL=http://localhost:5000` in `frontend/.env`.

## Deployment

### Frontend → Vercel

1. Import the **`frontend/`** folder as the Vercel project root (set **Root Directory** to `frontend` in Vercel settings).
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add these **Environment Variables** in the Vercel dashboard:
   - `VITE_API_BASE_URL` → your Render backend URL (e.g. `https://niat-teachers-backend.onrender.com`)
   - `VITE_ELEVENLABS_API_KEY` → your ElevenLabs key
   - `VITE_ELEVENLABS_AGENT_ID` → your ElevenLabs agent ID
   - All `VITE_ELEVENLABS_VOICE_ID_*` variables

### Backend → Render

1. Connect the repo and set **Root Directory** to `backend`.
2. Build command: `npm install`
3. Start command: `npm start`
4. Add these **Environment Variables** in the Render dashboard:
   - `FRONTEND_URL` → your Vercel app URL (e.g. `https://niat-teachers.vercel.app`)
   - `ELEVENLABS_API_KEY` → your ElevenLabs key
   - `NODE_ENV` → `production`

The `backend/render.yaml` file configures this automatically — you can also use **Blueprint** deployment in Render by pointing it at this file.

## Utilities

### Generate Teacher Voice Samples

```bash
cd backend
node createTeacherAgent.js
```

This script calls the ElevenLabs TTS API to generate sample voice audio files for each teacher. It requires `ELEVENLABS_API_KEY` in `backend/.env`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS |
| Voice AI | ElevenLabs (TTS + Conversational Agent) |
| LLM | Pollinations (free) / Gemini / Groq / OpenAI |
| Backend | Node.js (native `http` module, no framework) |
| Database | JSON file (`backend/server-data/database.json`) |
| Frontend hosting | Vercel |
| Backend hosting | Render (free tier) |
