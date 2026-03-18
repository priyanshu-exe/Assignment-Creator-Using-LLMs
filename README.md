# Assignment Creator Using LLMs

AI-powered assessment creator with:

- Next.js frontend for assignment creation and viewing
- Express + TypeScript backend APIs
- WebSocket updates for generation progress
- MongoDB for persistence
- Redis + BullMQ for background job processing
- Groq LLM integration for question paper generation

## Project Structure

- `frontend/` - Next.js app (UI)
- `backend/` - Express API, workers, and WebSocket server
- `docker-compose.yml` - Local MongoDB + Redis services

## Prerequisites

See `REQUIREMENTS.md` for complete requirements.

## Quick Start

### 1. Install dependencies

From repository root, install each app's dependencies:

```bash
cd backend
npm install
cd ../frontend
npm install
```

### 2. Start MongoDB and Redis

From repository root:

```bash
docker compose up -d
```

### 3. Configure environment variables

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/assessment-creator
REDIS_URL=redis://localhost:6379
GROQ_API_KEY=your_groq_api_key_here
FRONTEND_URL=http://localhost:3000
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

### 4. Run backend

```bash
cd backend
npm run dev
```

### 5. Run frontend

In a second terminal:

```bash
cd frontend
npm run dev
```

Open http://localhost:3000.

## Available Scripts

### Backend

- `npm run dev` - Run backend in watch mode
- `npm run build` - Compile TypeScript to `dist/`
- `npm run start` - Run compiled backend

### Frontend

- `npm run dev` - Start Next.js dev server
- `npm run build` - Build frontend
- `npm run start` - Run production build
- `npm run lint` - Run ESLint

## API Endpoints (Backend)

- `GET /api/health`
- `POST /api/assignments`
- `GET /api/assignments`
- `GET /api/assignments/:id`
- `DELETE /api/assignments/:id`
- `POST /api/assignments/:id/regenerate`

## Troubleshooting

- If generation fails, verify `GROQ_API_KEY` in `backend/.env`.
- If queueing does not work, verify Redis is running on `6379`.
- If API calls fail from frontend, check `NEXT_PUBLIC_API_URL`.
