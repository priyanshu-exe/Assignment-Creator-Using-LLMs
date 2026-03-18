# Requirements

This project is a full-stack TypeScript application (Next.js frontend + Express backend).

## Runtime Requirements

- Node.js 20.x or newer
- npm 10.x or newer
- MongoDB 6.x or newer (or Docker)
- Redis 7.x or newer (or Docker)
- Groq API key for AI question generation

## Optional but Recommended

- Docker Desktop (to run MongoDB and Redis using `docker-compose.yml`)
- Git

## Environment Variables

### Backend (`backend/.env`)

- `PORT` (default: `5000`)
- `MONGODB_URI` (default: `mongodb://localhost:27017/assessment-creator`)
- `REDIS_URL` (default: `redis://localhost:6379`)
- `GROQ_API_KEY` (required for generation)
- `FRONTEND_URL` (default: `http://localhost:3000`)

### Frontend (`frontend/.env.local`)

- `NEXT_PUBLIC_API_URL` (default: `http://localhost:5000/api`)
- `NEXT_PUBLIC_BACKEND_URL` (default: `http://localhost:5000`)

## Notes

- A Python `requirements.txt` file is not needed because this repository uses Node.js/TypeScript.
- If MongoDB and Redis are not installed locally, use Docker Compose from the repository root.
