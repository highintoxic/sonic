<div align="center">

# 🎧 Sonic (Shazam‑Style Audio Fingerprinting)

Full‑stack audio fingerprinting & song identification platform.

Backend: Node.js + TypeScript + PostgreSQL + FFmpeg DSP  •  Frontend: React + Vite + Tailwind + shadcn/ui

![Node](https://img.shields.io/badge/Node-18+-339933?logo=node.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript) ![Postgres](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql) ![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma) ![FFmpeg](https://img.shields.io/badge/FFmpeg-enabled-007808) ![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## 🗺 Overview
Sonic reimplements the core ideas of the classic Shazam approach (constellation map + anchor/target hash pairs + temporal alignment) to identify short audio clips against a library of fingerprinted songs.

| Layer | Description |
|-------|-------------|
| Backend | Ingestion (async), fingerprint generation, hash storage, identification, stats, health & OpenAPI docs |
| Frontend | Audio upload, identification UX, stats panel, animated turntable UI |
| Scripts | Bulk library ingestion & validation utilities |

---

## ✨ Key Features
- FFT‑based fingerprinting (22.05 kHz, Hann window, peak picking)
- Anchor→target fan‑out hashing with time delta quantization
- Temporal alignment & confidence scoring
- Batched DB writes & indexed hash lookups
- Async song ingestion (202 Accepted) to keep API responsive
- Multi‑format audio (mp3, wav, flac, m4a, aac, ogg, webm)
- OpenAPI 3 docs (`/docs`), stats & health endpoints
- Modern componentized frontend with toast notifications

---

## 🏗 Project Structure
```
backend/    # API + DSP + DB layer (detailed README inside)
frontend/   # React UI (detailed README inside)
```

Backend deep dive: `backend/README.md`
Frontend details: `frontend/README.md`

---

## 🚀 Quick Start (All Services)
### 1. Clone
```bash
git clone <REPO_URL>
cd "Shazam Clone"
```

### 2. Run via Docker (fastest)
```bash
cd backend
docker compose up -d --build
```
Backend API → http://localhost:3000 (docs at /docs)

### 3. Frontend
```bash
cd ../frontend
pnpm install
pnpm dev
```
Frontend → printed Vite URL (e.g. http://localhost:5173)

Ensure `VITE_API_BASE_URL` (or `src/config/api.ts`) points to `http://localhost:3000/api`.

---

## 🔌 Core API Endpoints (Summary)
| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/add_song | Queue a new song for background fingerprinting |
| POST | /api/identify | Identify an uploaded audio clip |
| GET  | /api/stats | System statistics (songs, fingerprints, success rate) |
| GET  | /api/health | Health / DB connectivity |
| GET  | /docs | OpenAPI UI |

Example Identify:
```bash
curl -X POST http://localhost:3000/api/identify \
	-F "audio=@snippet.wav"
```

---

## 🧬 Algorithm Snapshot
1. Decode & resample → mono float PCM
2. Sliding FFT (4096 / hop 1024) → magnitude spectrogram
3. Local maxima detection (neighborhood=20, amplitude threshold)
4. Anchor→target pairing (Δt 0.5–3.0s, fan‑out=3) → 32‑bit hash
5. Hash persistence (BigInt) with indexes
6. Query: generate fingerprints → hash lookup (batched) → time‑delta histogram → best alignment → confidence

Tuning constants live in `AudioFingerprinter`.

---

## ⚙️ Environment (Backend)
Create `backend/.env`:
```
DATABASE_URL=postgresql://shazam_user:shazam_password@localhost:5432/shazam_clone
PORT=3000
NODE_ENV=development
```
Migrate:
```bash
cd backend
pnpm prisma:migrate
```

Optional frontend env (`frontend/.env`):
```
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## 📦 Bulk Ingestion Scripts
Located in `backend/scripts/`:
| Script | Purpose |
|--------|---------|
| bulk-fingerprint.ts | Fingerprint many files (supports resume, concurrency) |
| validate-audio-files.ts | Filename pattern validation |
| process-audio-pipeline.ts | Combined validation + processing workflow |

Basic usage:
```bash
pnpm bulk-fingerprint -- ./music --start-from 10
```

See `backend/scripts/README.md` for full options.

---

## 🛠 Development Commands
Backend:
```bash
pnpm dev
pnpm build
pnpm start
pnpm prisma:studio
```
Frontend:
```bash
pnpm dev
pnpm build
```

---

## 🐞 Troubleshooting Quick Table
| Problem | Hint |
|---------|------|
| FFmpeg errors | Ensure binary present (or use Docker image) |
| Identify always fails | Confirm songs ingested; check fingerprint count |
| High latency | Examine DB indexes, hardware I/O, fingerprint volume |
| CORS/browser issues | Backend enables `cors()`; ensure correct base URL |

---

## 🧭 Roadmap Ideas
- Real queue / job progress tracking
- Redis cache for hot hash buckets
- Streaming (real‑time microphone) identification
- Auth + rate limiting tiers
- Prometheus / OpenTelemetry metrics

---

## 🤝 Contributing
PRs welcome: performance improvements, alternative fingerprint strategies, UI enhancements, tests.

1. Fork repo
2. Create feature branch
3. Add tests / docs
4. Open PR with clear rationale

---

## 📄 License
MIT – see repository license file.

---

## 🙌 Credits
Inspired by academic & patent literature on audio fingerprinting (Avery Wang). All code implemented from scratch using open libraries (FFT, FFmpeg wrappers).

---

For deeper details read `backend/README.md` & `frontend/README.md`.

Happy hacking! 🎶
