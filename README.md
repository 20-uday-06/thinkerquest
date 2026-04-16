# Rural Assistant (ग्रामीण सहायक)

Voice-first, Hindi-first agriculture advisory prototype for low-literacy rural users.

Rural communities in India continue to face systemic challenges in accessing essential services such as healthcare, education, agricultural support, and government welfare schemes. These challenges arise due to limited infrastructure, low digital literacy, fragmented information channels, and language barriers. Existing digital solutions often fail to address the usability and accessibility constraints of rural populations. There is a need for intelligent, adaptive systems that bridge this gap by providing localized, context-aware assistance in a simple and accessible manner.

## This problem requires the development of an AI-powered platform that models rural service accessibility as an interactive and assistive system, where: 

### ->Users interact through low-barrier interfaces such as voice, regional languages, or minimal-text UI. 
### ->AI agents provide contextual recommendations for agriculture, healthcare, education, or government schemes. 
### ->The system adapts to user behavior, literacy level, and regional constraints. 
### ->Information is aggregated from multiple sources and delivered in a simplified, actionable format. 
### ->Offline or low-connectivity scenarios are handled efficiently.

The objective is to design an intelligent system that improves awareness, accessibility, and decision-making for rural users while remaining affordable and easy to use.
## Milestone 8 Status

This repository currently includes:

- Monorepo scaffold (`frontend` + `backend`)
- FastAPI backend base service with health endpoint
- SQLite-backed profile, advisory, and sync APIs
- Seeded demo profile and scripted Hindi query set
- Next.js mobile-first Hindi UI with live API integration
- Frontend offline queue skeleton with manual sync action
- Voice loop integration: browser mic STT + backend Hindi TTS + browser TTS fallback
- Curated Uttarakhand/North India agriculture KB in structured JSON
- Hybrid advisory engine: rules + lightweight retrieval + profile context
- Live weather connector with cached offline fallback
- Personalization-weighted retrieval ranking (location/crop/weather-aware)
- Offline queue conflict compaction with latest-profile-update-wins
- Automatic sync retry on connectivity restore (frontend reconnect listener)
- Backend hardening: security headers, gzip, rate-limited query endpoint
- Global JSON error handling with request trace id
- Complete demo runbook and deployment playbook
- Dockerized local run setup
- Environment-based configuration

## Project Structure

```
tinkerquest/
├── .env.example
├── .gitignore
├── DEMO_RUNBOOK.md
├── DEPLOYMENT.md
├── docker-compose.yml
├── docker-compose.prod.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py
│       ├── api/
│       │   ├── __init__.py
│       │   ├── health.py
│       │   ├── profile.py
│       │   ├── query.py
│       │   └── router.py
│       │   └── sync.py
│       └── core/
│           ├── __init__.py
│           ├── config.py
│           ├── errors.py
│           └── logging.py
│           └── middleware.py
│       ├── db/
│       │   ├── __init__.py
│       │   ├── base.py
│       │   ├── init_db.py
│       │   ├── models.py
│       │   └── session.py
│       ├── schemas/
│       │   ├── __init__.py
│       │   ├── profile.py
│       │   ├── query.py
│       │   └── sync.py
│       ├── seed/
│       │   ├── __init__.py
│       │   ├── demo_profile.py
│       │   └── demo_queries.json
│       └── services/
│           ├── __init__.py
│           ├── advisory_service.py
│           ├── kb_integrity.py
│           ├── knowledge_service.py
│           ├── profile_service.py
│           ├── sync_service.py
│           └── weather_service.py
│       └── knowledge_base/
│           ├── crop_calendar_uttarakhand.json
│           ├── crop_selection_north_india.json
│           ├── fertilizer_basics_north_india.json
│           └── weather_rules_general.json
└── frontend/
    ├── .dockerignore
    ├── Dockerfile
    ├── package.json
    ├── next.config.ts
    ├── next-env.d.ts
    ├── postcss.config.mjs
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── app/
        ├── globals.css
        ├── layout.tsx
        └── page.tsx
    └── lib/
        ├── api.ts
        ├── offline-queue.ts
        └── types.ts
```

## Quick Start (Local)

### 1) Configure environment

Copy `.env.example` to `.env` and update values if needed.

### 2) Run with Docker Compose

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/api/health`

### 3) Run without Docker (optional)

Backend:

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

See `.env.example` for all values.

Key toggles:

- `ENABLE_LLM`: Enables optional LLM response enhancement.
- `ENABLE_CLOUD_TTS`: Enables cloud Hindi TTS when online.
- `ENABLE_OFFLINE_FALLBACK`: Enables local/offline fallback path.

## API Endpoints (Milestone 2)

- `GET /api/health` - Service health
- `GET /api/profile` - Get current local profile (auto-creates demo profile if missing)
- `PUT /api/profile` - Update profile
    - Body: `{ "location": "देहरादून, उत्तराखंड", "land_size_acre": 2.0, "crop_preference": "गेहूं" }`
- `POST /api/query` - Get Hindi advisory response (rule/hybrid mode)
    - Body: `{ "text": "गेहूं की बुवाई कब करें?" }`
- `POST /api/sync` - Sync offline events (de-duplicates by `client_event_id`)
- `POST /api/voice/tts` - Hindi speech synthesis (`text` -> base64 audio)

## Frontend Features (Milestone 3)

- Loads and displays seeded profile from backend
- Allows profile edits (location, acre, crop preference)
- Sends advisory query and renders Hindi response cards
- Uses cached fallback advisory when backend is unreachable
- Queues offline profile/query events in local storage
- Sync button sends queued events to `/api/sync`

## Voice Pipeline (Milestone 4)

- Mic button starts browser voice recognition (`hi-IN`) and auto-submits recognized query.
- Query response is spoken using backend Hindi TTS (`/api/voice/tts`) when available.
- If cloud TTS fails/unavailable, browser speech synthesis is used as offline-friendly fallback.
- End-to-end conversational loop: voice input -> advisory generation -> spoken Hindi output.

## Knowledge + Hybrid Advisory (Milestone 5)

- Domain datasets are stored as structured JSON files in `backend/app/knowledge_base`.
- Retrieval uses lightweight token-overlap ranking to keep latency low for low-resource systems.
- Advisory generation combines:
    - deterministic intent rules (offline-safe),
    - top retrieved KB facts,
    - user profile context (location, acre, crop preference).
- Response remains simple conversational Hindi and agriculture-only.

## Weather + Personalization (Milestone 6)

- Live weather is fetched from Open-Meteo using location-based coordinates (Uttarakhand-focused mapping).
- Weather snapshots are cached in SQLite (`weather_snapshots`) and reused when internet is down.
- Weather-guided advice adds context such as rainfall/heat/cold-based irrigation tips.
- Retrieval ranking now boosts records matching user profile (location + crop preference) and weather signals.

New environment settings in `.env`:

- `ENABLE_LIVE_WEATHER=true|false`
- `WEATHER_CACHE_TTL_MIN=90`

## Offline Resilience (Milestone 7)

- Frontend queue compaction keeps only the latest `profile_update` event before sync.
- Reconnect auto-sync runs when network comes back (`online` browser event).
- Sync status now reports accepted/ignored events for better reliability feedback.
- Backend sync applies latest queued profile update to SQLite profile state.

## Production Hardening (Milestone 8)

- API middleware now adds request IDs, process-time header, and security headers.
- `/api/query` has lightweight per-client rate limiting to prevent abuse.
- GZip compression enabled for response efficiency.
- Standardized JSON error responses for validation and internal errors.
- Added operations docs:
    - `DEMO_RUNBOOK.md`
    - `DEPLOYMENT.md`

## Quick API Validation

After running backend on `localhost:8000`:

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/profile
curl -X POST http://localhost:8000/api/query -H "Content-Type: application/json" -d "{\"text\":\"गेहूं की बुवाई कब करें\"}"
```

## Next Milestone Preview

## Hackathon-Ready Outcome

The prototype is now feature-complete for the agreed scope and includes:

- Hindi-first, voice-first mobile UI
- hybrid agriculture advisory (rules + retrieval + weather + profile)
- offline queue and reconnect sync
- Docker local run and cloud-oriented deployment notes
