<div align="center">

# 🎧 Sonic Backend

High‑fidelity, production‑ready audio fingerprinting & identification service. Built with Node.js, TypeScript, Express, PostgreSQL & real DSP (FFT constellation maps) – packaged for local dev or containerized deployment. Sonic is a Shazam‑style open implementation for educational & experimental use.

![Tech](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript) ![Node](https://img.shields.io/badge/Node-18+-339933?logo=node.js) ![Postgres](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql) ![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma) ![FFmpeg](https://img.shields.io/badge/FFmpeg-enabled-007808) ![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## ⭐ Overview

This service ingests full‑length songs, generates compact acoustic fingerprints using a simplified Shazam‑style constellation algorithm, and later identifies short (5–10s) query clips by temporal alignment of matching hashes.

Key design goals:

| Goal | Strategy |
|------|----------|
| Accuracy | Peak picking + anchor→target hashing + time‑delta clustering |
| Speed | Batched DB lookups + reduced hash domain (quantization) |
| Scalability | Stateless API + relational storage with indexed hashes |
| Resilience | Graceful shutdown, retrying DB connect, defensive cleanup |
| Extensibility | Layered service architecture & typed contracts |

---

## ✨ Feature Highlights

- 🎵 Real FFT‑based fingerprint generation (Hann window + magnitude spectra)
- 🛰 Constellation map peak detection & anchor–target fan‑out hashing
- 🧬 Temporal alignment scoring (delta clustering + confidence weighting)
- 🗃 Batched BigInt hash persistence (Prisma + PostgreSQL indexes)
- 🚀 Async background song ingestion (202 Accepted) to keep API responsive
- 📦 Multi‑format audio intake (mp3, wav, flac, m4a, aac, ogg, webm) via FFmpeg
- 🛡 Robust upload filtering, size limits, temp file cleanup
- 📊 Stats & health endpoints (fingerprints, songs, query success rate)
- 🧱 Container‑ready (multi‑stage Docker build + Postgres service)
- 🛑 Graceful shutdown with DB disconnect & retry logic at startup
- 📝 OpenAPI 3.0 docs served at `/docs`

---

## 🧪 Algorithm Deep Dive

### 1. Preprocessing
- Resample / convert to mono @ 22,050 Hz
- Normalize via FFmpeg to 32‑bit float PCM (`pcm_f32le`)

### 2. Spectrogram Construction
- Sliding window FFT (size 4096, hop 1024) → ~75% overlap
- Apply Hann window to reduce spectral leakage
- Keep magnitude of first N/2 bins (symmetry)

### 3. Peak Picking (Constellation)
- Local maxima search in configurable neighborhood (size = 20)
- Amplitude floor filters noise (MIN_AMPLITUDE = 15)
- Retain strongest ≤ 10k peaks / track to cap memory

### 4. Anchor→Target Hashing
- For each anchor peak, pair with up to FANOUT (3) future peaks whose Δt ∈ [0.5s, 3.0s]
- Frequencies & Δt quantized to stabilize under noise
- 32‑bit rolling hash (bit‑mixed) → stored as BigInt

### 5. Query Matching
1. Generate query fingerprints identically
2. Batch DB lookup (IN clause) of matching hashValues
3. Compute timeDelta = songOffset − queryOffset per match
4. Histogram / cluster timeDeltas (bin width = 0.1s)
5. Pick densest cluster → alignedMatches & confidence = alignedMatches / totalMatches
6. Fuse confidence with query coverage to pick winner

### 6. Confidence Interpretation
| Confidence | Meaning |
|------------|---------|
| ≥ 0.6 | Strong match |
| 0.3–0.59 | Probable (consider user confirmation) |
| < 0.3 | Unreliable |

---

## 🗂 Layered Architecture

| Layer | Responsibility | Key Files |
|-------|----------------|-----------|
| Entry / HTTP | Express setup, middleware, error handling | `src/index.ts` |
| Routing | Maps endpoints to controllers | `routes/*.ts` |
| Controllers | Request orchestration / DTO shaping | `controllers/*.ts` |
| Services (Domain) | Fingerprinting, matching, persistence orchestration | `services/*.ts` |
| Infra Utilities | Logging, Prisma client, upload handling | `utils/*.ts`, `middleware/upload.middleware.ts` |
| Data Layer | Prisma schema & migrations | `prisma/schema.prisma` |

Sequence (Identify Flow):
Upload → Multer → Controller → ShazamService.identifySong → AudioFingerprinter.generateFingerprints → SongMatcher.identifySong → DatabaseService.findMatchingFingerprints → alignment scoring → response.

---

## 🔐 Data Model (Prisma)

| Model | Purpose | Notable Fields / Indexes |
|-------|---------|--------------------------|
| User | (Basic example entity) | `email` unique |
| Song | Track metadata + file linkage | `@@index([artist,title])` |
| Fingerprint | Core hash entries | `@@index([hashValue])`, `@@index([songId,timeOffset])` |
| UserQuery | Analytics (success, durations) | Optional `identifiedSongId` |

Retention / Scaling Notes:
- Fingerprints dominate row count: expect thousands per song.
- Hash index drives lookup; ensure adequate RAM for index cache.
- Consider partitioning or Bloom filters if dataset grows (>50M rows).

---

## 📑 API Reference (Summary)

| Method | Path | Purpose | Notes |
|--------|------|---------|-------|
| POST | `/api/add_song` | Queue new song for background processing | Returns 202 + processingId |
| POST | `/api/identify` | Identify an audio clip | Returns match info or not found |
| GET | `/api/stats` | System statistics | Aggregated counts & success rate |
| GET | `/api/health` | Liveness / DB connectivity | 200 or 503 |
| GET | `/api/users` | List users | Demo entity |
| POST | `/api/users` | Create user | Basic validation |

Full OpenAPI docs: visit `/docs` when running.

### Example: Identify Clip
```bash
curl -X POST http://localhost:3000/api/identify \
  -F "audio=@snippet.wav"
```

### Example: Song Ingestion (Async)
```bash
curl -X POST http://localhost:3000/api/add_song \
  -F "audio=@full_track.mp3" \
  -F "title=Adventure of a Lifetime" \
  -F "artist=Coldplay" \
  -F "album=A Head Full of Dreams"
```

Sample 202 Response:
```json
{
  "success": true,
  "message": "Song file received and queued for processing",
  "data": {
    "processingId": "song_1730000000000_x9ab12k",
    "title": "Adventure of a Lifetime",
    "artist": "Coldplay",
    "status": "processing"
  }
}
```

---

## 🧵 Background Processing Strategy

Ingestion endpoint responds immediately (202). Controller delegates heavy fingerprint generation & DB writes to an async task (`processSongAsync`). This prevents request timeouts & enables later extension to:
- Queue systems (BullMQ / SQS / Kafka)
- Progress tracking table
- Retry & dead-letter queues

At present progress polling is not implemented; success is implied once inserted.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15 (earlier 12+ likely fine)
- FFmpeg available on PATH (or use provided Docker image)
- pnpm (preferred) or npm

### Clone & Install
```bash
git clone <REPO_URL>
cd backend
pnpm install
```

### Environment
Create `.env` (example values):
```bash
DATABASE_URL="postgresql://shazam_user:shazam_password@localhost:5432/shazam_clone"
PORT=3000
NODE_ENV=development
```

### Database
```bash
pnpm prisma:migrate
pnpm prisma:generate
```

### Development Run
```bash
pnpm dev
```
Visit: http://localhost:3000/docs

### Production Build
```bash
pnpm build
pnpm start
```

### Docker (App + Postgres)
```bash
docker compose up -d --build
```
App: http://localhost:3000

---

## 🔧 Configuration Reference
| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | (none) | Postgres connection string |
| PORT | 3000 | HTTP port |
| NODE_ENV | development | Environment mode |
| MAX_FILE_SIZE | 50MB (code) | Upload limit (adjust in middleware) |
| SAMPLE_RATE | 22050 (code) | Resample rate used by algorithm |
| WINDOW_SIZE | 4096 (code) | FFT window size |
| HOP_LENGTH | 1024 (code) | Advance between windows |

Algorithm tuning lives in `AudioFingerprinter` constants; expose via env only if needed.

---

## 🧬 Internal Services Overview

| Service | Core Methods | Notes |
|---------|--------------|-------|
| `AudioFingerprinter` | `generateFingerprints`, `getAudioDuration` | Handles decoding, FFT pipeline, peak & hash creation |
| `SongMatcher` | `identifySong` | Performs batched hash lookup & temporal alignment |
| `DatabaseService` | `addSong`, `addFingerprints`, `findMatchingFingerprints`, `getStats` | Wraps Prisma with batching & logging |
| `ShazamService` | `addSong`, `identifySong`, `getStats`, `healthCheck` | Orchestrator combining subsystems |

---

## ⚙️ Bulk Processing Scripts
Located in `scripts/` (see dedicated README there). Highlights:
- Validate filenames & structure
- Batch fingerprint large libraries
- Concurrency control & resume via numbering

Key commands:
```bash
pnpm process-audio -- ./music --auto-confirm
pnpm bulk-fingerprint -- ./music --start-from 25
pnpm validate-audio -- ./music
```

---

## 📊 Stats & Observability
`/api/stats` aggregates:
- Song & fingerprint counts
- Successful vs total queries
- Average processing time

Enhancement ideas (not yet implemented):
- Prometheus metrics endpoint
- Structured JSON logs → ELK stack
- Cache layer (Redis) for hot fingerprint clusters

---

## 🔐 Security & Hardening (Future Roadmap)
- Auth (JWT / API keys) for ingestion endpoints
- Rate limiting (per IP on identify)
- Signed URL upload or pre‑processing sandbox
- Hash collision analytics & adaptive thresholds

---

## 🧪 Testing Strategy (Planned)
| Test Type | Scope |
|-----------|-------|
| Unit | Hash creation, delta clustering, peak detection |
| Integration | End‑to‑end add + identify cycle with small fixtures |
| Load | Concurrency behavior for identify route |

Add fixtures: short sine sweeps & synthetic multi‑tone mixes to validate deterministic fingerprints.

---

## 🚨 Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| FFmpeg error: Unknown encoder | Missing codecs | Install full FFmpeg build |
| 500 on /add_song | Unsupported file or no peaks | Check format & MIN_AMPLITUDE threshold |
| Slow identify (>2s) | Large DB / missing index | Ensure fingerprint indexes migrated |
| Memory spikes | Too many concurrent ingestions | Serialize or reduce FANOUT / window size |

---

## 🔄 Performance Tuning Levers
- Increase `FANOUT` → more recall, slower ingestion
- Adjust `MIN_AMPLITUDE` → higher value reduces noise & count
- Narrow `[MIN, MAX]_HASH_TIME_DELTA` → fewer candidate pairs
- Batch size in `addFingerprints` (currently 1000) → trade TPS vs memory
- Add Redis or in‑memory cache of popular hash buckets (future)

---

## 🧱 Extending The System
| Goal | Approach |
|------|----------|
| Streaming recognition | Process rolling buffers & emit partial matches |
| Mobile client | Send compressed PCM or pre-hashed segments |
| Multi‑tenant | Namespace hash space or prefix song IDs |
| Similarity search | Expand to spectral centroid / chroma features |

---

## 👐 Contributing
1. Fork & branch (`feat/<name>`)
2. Add or update tests for behavior changes
3. Run formatting / lint (if added later)
4. Open PR with clear description & perf notes

Ideas welcome via Issues (performance, accuracy, tooling).

---

## 📜 License
MIT – see root LICENSE (or add one if missing).

---

## 🙌 Acknowledgments
- Foundational concepts from Avery Wang's Shazam paper/patents (reimplemented from scratch)
- FFT courtesy of `fft-js`
- Media handling via `ffmpeg-static` + `fluent-ffmpeg`

---

### Quick Command Reference
```bash
pnpm dev                # Start dev server
pnpm build              # Compile TypeScript
pnpm start              # Run built server
pnpm prisma:migrate     # Apply migrations
pnpm prisma:studio      # Inspect DB
pnpm bulk-fingerprint -- ./songs
```

---

### Minimal Identify Script (Node ESM)
```js
import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

const form = new FormData();
form.append('audio', fs.createReadStream('clip.mp3'));
const res = await axios.post('http://localhost:3000/api/identify', form, { headers: form.getHeaders() });
console.log(res.data);
```

---

Happy hacking & enjoy exploring audio fingerprinting! 🎶
