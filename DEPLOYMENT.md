# Deployment Guide

## Local Development (Recommended)

### 1) Configure env

```bash
copy .env.example .env
```

### 2) Start stack

```bash
docker compose up --build
```

### 3) Verify

- Frontend: `http://localhost:3000`
- Health: `http://localhost:8000/api/health`

## Production-like Local Run

Use the production compose file:

```bash
docker compose -f docker-compose.prod.yml up --build
```

## Render (Option)

Deploy backend and frontend as separate services using Docker.

### Backend service

- Root directory: `backend`
- Dockerfile path: `backend/Dockerfile`
- Port: `8000`
- Health check path: `/api/health`
- Environment variables: from `.env.example` (set required values)

### Frontend service

- Root directory: `frontend`
- Dockerfile path: `frontend/Dockerfile`
- Port: `3000`
- Set `NEXT_PUBLIC_API_BASE_URL` to backend public URL

## Railway (Option)

Create two services (backend/frontend) from same repo.

- Backend start command:
  - `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Frontend start command:
  - `npm run build && npm run start -- -p $PORT`

Set env variables in each service dashboard.

## Required Environment Variables

- `APP_ENV`
- `LOG_LEVEL`
- `CORS_ORIGINS`
- `SQLITE_DB_PATH`
- `ENABLE_OFFLINE_FALLBACK`
- `ENABLE_LIVE_WEATHER`
- `WEATHER_CACHE_TTL_MIN`
- `RATE_LIMIT_WINDOW_SEC`
- `RATE_LIMIT_MAX_REQUESTS`
- `NEXT_PUBLIC_API_BASE_URL`

Optional keys:

- `OPENAI_API_KEY`
- `HF_API_TOKEN`
- `GOOGLE_TTS_API_KEY`

## Security Notes for Production

- Restrict `CORS_ORIGINS` to your domain(s) only.
- Keep API keys in platform secret manager, not in git.
- Use HTTPS at ingress/load balancer.
- Monitor `/api/query` rate-limit responses (HTTP 429).

## Rollback Strategy

- Keep previous image tags.
- If regression occurs, redeploy prior known-good image.
- Validate with `/api/health` and one query before full traffic.
