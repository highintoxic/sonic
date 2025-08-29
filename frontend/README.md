git clone <YOUR_GIT_URL>
## 🎼 Sonic Frontend

Modern React + TypeScript interface for the Sonic (Shazam‑style) audio fingerprinting backend. Provides upload, identification feedback, stats view, and a polished music‑themed UI (turntable & vinyl components) powered by Tailwind + shadcn/ui.

---
## ✨ Features
- Drag & drop / file picker audio upload
- Progress + toast notifications (custom toast system)
- Song identification result display (confidence, timing)
- Animated turntable & vinyl components for UX flair
- Stats page (hooks into `/api/stats`)
- Responsive navigation (floating + mobile adaptation)

---
## 🔧 Tech Stack
| Layer | Tool |
|-------|------|
| Build | Vite |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui primitives |
| State / Hooks | Custom hooks (`use-shazam`, `use-toast`, `use-mobile`) |
| API | Fetch wrapper in `lib/api-client.ts` & services layer |

Directory highlights:
```
src/
	components/ (UI + domain components)
	hooks/       (custom hooks abstraction)
	services/    (API service functions)
	pages/       (route-level views)
	lib/         (api client + utilities)
	config/      (API base config)
```

---
## 🚀 Quick Start
```bash
cd frontend
pnpm install
pnpm dev
```
Dev server: http://localhost:5173 (Vite default) or as configured.

Ensure the backend is running (default http://localhost:3000). API base is configured in `src/config/api.ts` – adjust if deploying.

---
## 🔌 API Integration Flow
1. User selects / drops audio file
2. Component invokes `shazam.service.ts` → multipart POST to `/api/identify`
3. Response normalized → toast + UI card update
4. Errors surface via toast system (network / validation)

Add Song (library ingestion) is typically performed through the backend admin / scripts; frontend focuses on identification UX.

---
## 🧱 Key Components
| Component | Purpose |
|-----------|---------|
| `FileUpload` | Handles file selection & triggers identification |
| `Turntable`, `VinylRecord` | Visual/animated elements |
| `FloatingNav` / `Navigation` | Responsive navigation controls |
| `ui/*` | shadcn-derived primitives (button, card, toast, tooltip) |

---
## 🛠 Configuration
Minimal environment reliance. To point at a different backend edit:
`src/config/api.ts` (baseURL). For production builds, you can inject via Vite env (`VITE_API_BASE_URL`).

Example `.env` in `frontend/`:
```
VITE_API_BASE_URL=http://localhost:3000/api
```

Consume with `import.meta.env.VITE_API_BASE_URL` inside the api client.

---
## 🧪 Testing (Suggested Roadmap)
- Component tests (FileUpload interaction)
- Hook tests for `use-shazam`
- Integration test mocking backend responses

---
## 🚢 Build & Deploy
```bash
pnpm build   # Produces dist/
```
Deploy `dist/` to any static host (Netlify, Vercel, S3, etc.) and set API base to deployed backend.

---
## 🐞 Troubleshooting
| Issue | Fix |
|-------|-----|
| 404s to API | Check base URL & CORS config on backend |
| CORS error | Ensure backend has `cors()` enabled (it does by default) |
| Empty response | Verify file field name is `audio` |
| Slow identify | Confirm fingerprints exist for queried song |

---
## 🤝 Contributing
UI improvements, accessibility passes, and test additions welcome. Keep components composable and colocate styles where logical.

---
## 📄 License
MIT (matches backend). See root repository license.

---
Enjoy building musical interfaces! 🎶
