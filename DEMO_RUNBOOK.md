# Demo Runbook - Rural Assistant

## 1) Goal of Demo

Show a Hindi-first, voice-first rural agriculture assistant that:

- accepts voice questions,
- gives simple local agriculture advice,
- uses personalization (location, acre, crop),
- supports offline queue and auto-sync on reconnect.

## 2) Pre-Demo Checklist

- `.env` exists (copied from `.env.example`)
- Docker is running
- Ports `3000` and `8000` are free
- Browser permission for microphone is allowed
- Internet available for live weather/TTS demo (optional but recommended)

## 3) Start Services

```bash
docker compose up --build
```

Open:

- Frontend: `http://localhost:3000`
- API health: `http://localhost:8000/api/health`

## 4) Demo Story (Scripted Flow)

### Step A - Profile personalization

1. Open app and show pre-seeded profile.
2. Update fields:
   - Location: `देहरादून, उत्तराखंड`
   - Land size: `2`
   - Crop preference: `गेहूं`
3. Click `प्रोफ़ाइल सेव करें`.
4. Explain that recommendations now use this context.

### Step B - Voice query loop

1. Click `बोलकर पूछें` and ask:
   - `गेहूं की बुवाई कब करें?`
2. Show:
   - Hindi response card,
   - source list,
   - spoken output (TTS).

### Step C - Weather-aware response

Ask:

- `मौसम देखकर सिंचाई कब करें?`

Explain:

- advisory includes weather signal + irrigation guidance,
- falls back to cached/default weather if network fails.

### Step D - Offline resilience

1. Turn off internet.
2. Ask a query and save profile change.
3. Show offline fallback response + queue count increases.
4. Restore internet.
5. Show automatic sync message and reduced queue count.

## 5) Scripted Sample Queries

- `मेरे इलाके में कौन सी फसल सही रहेगी?`
- `गेहूं की बुवाई का सही समय क्या है?`
- `खाद की मात्रा कैसे तय करें?`
- `अगर कल बारिश हो तो सिंचाई कब करें?`
- `कम लागत में अच्छी पैदावार के लिए क्या करें?`

## 6) Fast Troubleshooting

- Mic not working: check browser permissions and reload tab.
- No TTS audio: verify browser sound; fallback browser TTS should still speak.
- Backend not reachable: check `docker compose logs backend`.
- Frontend not loading: check `docker compose logs frontend`.

## 7) Expected Talking Points

- Hindi-first and low-literacy friendly UI.
- Hybrid advisory engine (rules + retrieval + profile + weather context).
- Offline-first behavior with queue and reconnect sync.
- Local-first deploy, containerized for cloud portability.
