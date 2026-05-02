# Gyandeep — AI-Powered Smart Classroom

A full-stack educational platform that brings classrooms online: real-time class sessions, geofenced attendance with face recognition, AI-generated quizzes, gamified learning, centralised notes, analytics, and a built-in support workflow — all in one PWA.

> **Status:** active development · **Stack:** React 18 · TypeScript · Express · MongoDB · Prisma · Vite

---

## Table of contents

- [Highlights](#highlights)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [Project structure](#project-structure)
- [API surface](#api-surface)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Suggested improvements](#suggested-improvements)
- [Contributing](#contributing)

---

## Highlights

| Capability | What it does |
|---|---|
| **Multi-role accounts** | Student, Teacher, and Admin roles with RBAC across every route |
| **Authentication** | Email/password (bcrypt cost 12) · Google OAuth · Face login via `@vladmandic/face-api` |
| **Live class sessions** | 6-digit session codes, configurable expiry, auto-mark-absent on session end |
| **Smart attendance** | Geofencing (Haversine) + face verification (cosine similarity, 85% threshold) |
| **AI quizzes** | Gemini-generated quizzes with OpenAI/OpenRouter fallback, auto-grading, timer enforcement |
| **Gamification** | XP, coins, levels, streaks, badges, leaderboards |
| **Notes & grades** | Centralised note library with file storage (R2/S3/Cloudinary), grade book with trends |
| **Real-time** | WebSocket + SSE for live quizzes, attendance, leaderboards, presence, notifications |
| **Analytics** | Live class metrics, performance trends, teacher insights, admin dashboards |
| **PWA** | Offline-ready service worker, installable, runtime caching tuned per route |
| **Observability** | Sentry, Prometheus metrics, audit logs, structured logging |

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Browser (PWA)                               │
│  React 18 + TS · Vite · Tailwind · React Query · Framer · Three.js   │
│  ─ Auth · Dashboards · Realtime · Face API · Service Worker          │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  HTTPS  /  WebSocket  /  SSE
┌──────────────────────────▼───────────────────────────────────────────┐
│                    Express API  (server/index.js)                    │
│   29 route modules · JWT middleware · rate limiter · CSRF · CORS     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│   │  Auth    │  │ Sessions │  │  Quiz    │  │ Notes    │  …          │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
│   Services: WebSocket hub · cache · email · sentry · metrics         │
└────┬───────────────┬────────────────┬────────────────┬───────────────┘
     │               │                │                │
┌────▼────┐    ┌─────▼─────┐    ┌─────▼──────┐   ┌─────▼──────┐
│ MongoDB │    │   Redis   │    │  Gemini /  │   │  R2 / S3 / │
│ (Prisma)│    │ (Upstash) │    │  OpenAI    │   │ Cloudinary │
└─────────┘    └───────────┘    └────────────┘   └────────────┘
```

The codebase is organised around **29 route modules** (auth, sessions, quiz, attendance, notes, grades, analytics, admin, ai, tickets, …) sharing a single `apiRequest` client on the frontend (the largest hub in the dependency graph), with WebSocket and SSE for live state.

## Tech stack

**Frontend** — React 18 · TypeScript · Vite 6 · Tailwind CSS · React Query · Framer Motion · React Router 7 · Recharts · Three.js / R3F · Lucide · `@vladmandic/face-api` · `vite-plugin-pwa`

**Backend** — Node 18+ · Express 4 · WebSocket (`ws`) · `cookie-parser` · `cors` · Multer · `nodemailer` · Resend

**Data** — MongoDB Atlas · Prisma 5 (26 models) · Redis / Upstash · Cloudflare R2 / AWS S3 / Cloudinary

**AI / Auth** — Google Gemini · OpenAI / OpenRouter (fallback) · Google OAuth 2.0 · JWT (HS/RS) · bcrypt

**Tooling** — Vitest · Cypress · ESLint · TypeScript 5.8 · PM2 · Docker · Sentry · `prom-client`

## Quick start

**Prerequisites:** Node 18+, a MongoDB Atlas cluster, and (optional but recommended) Redis.

```bash
# 1. Clone and install
git clone https://github.com/surabhi142005/gyandeep--1-.git
cd gyandeep--1-
npm install

# 2. Configure
cp .env.example .env
# Edit .env — at minimum set MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET, ALLOWED_ORIGINS

# 3. Generate strong JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 4. Push schema and seed
npm run db:push
npm run db:seed

# 5. Run frontend + backend together
npm run dev:full
# Frontend: http://localhost:5173   API: http://localhost:3001
```

> **Tip:** `npm run dev` runs only the Vite frontend (faster iteration); use `npm run dev:full` to also start the Express API. To download face recognition models, run `bash scripts/download-face-models.sh`.

## Environment variables

The full reference is in [`.env.example`](./.env.example). Required vs optional:

| Required | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Token signing (≥ 32 random bytes) |
| `ALLOWED_ORIGINS` | Comma-separated CORS whitelist |

| Optional | Purpose |
|---|---|
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | AI quiz generation (Gemini primary, OpenAI/OpenRouter fallback) |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Transactional email |
| `R2_*` / `AWS_*` | Object storage (falls back to base64-in-DB if unset) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `FACE_RECOGNITION_SERVICE_URL` | Optional external Python face service |
| `REDIS_URL` / `UPSTASH_REDIS_REST_*` | Cache & session store (Upstash for Vercel) |
| `CSRF_SECRET`, `RATE_LIMIT_*` | CSRF + sliding-window rate limiting |
| `SENTRY_DSN`, `LOG_LEVEL` | Observability |

## Available scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server (frontend only) |
| `npm run dev:full` | Frontend + Express API concurrently |
| `npm run build` | Production build (PWA assets included) |
| `npm run start` | Run the production Express server |
| `npm run start:cluster` | PM2 cluster (`ecosystem.config.json`) |
| `npm run server` | Run only the Express API |
| `npm run lint` / `lint:fix` | ESLint over `.ts`/`.tsx` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` / `test:watch` / `test:coverage` | Vitest |
| `npm run test:security` | Security-focused suite |
| `npm run test:api` / `test:fullstack` | Smoke tests (`test-api.js`, `test-fullstack.js`) |
| `npm run db:push` / `db:seed` / `db:studio` | Prisma schema sync, seed, GUI |

## Project structure

```
.
├── App.tsx · index.tsx · types.ts        Root entry, top-level types
├── components/        63 React components — dashboards, realtime, UI kit
├── hooks/             24 custom hooks — auth, live sessions, presence, theming
├── services/          20 services — apiClient, realtime, gemini, face API loaders
├── lib/               ai · auth · db · email · faceRecognition · gamification · storage
├── providers/         React Query provider
├── styles/            Tailwind + design tokens
├── public/            PWA assets, face-api models, web workers
│
├── server/            Express API
│   ├── index.js                      app bootstrap
│   ├── routes/        (29 modules)   auth, sessions, quiz, attendance, …
│   ├── middleware/                   security, rate limit, error handling
│   ├── services/                     cache, sentry, websocket helpers
│   ├── db/            mongoAtlas.js  connection + helpers
│   ├── lib/           prisma client, utilities
│   ├── tests/         security, route tests
│   └── websocket.js                  realtime hub
│
├── prisma/            schema.prisma (26 models) + seed.ts
├── api/               Vercel serverless entry (api/index.ts)
├── cypress/           E2E tests
├── scripts/           ops: deploy, seed, monitoring, face-model download
├── config/            nginx, uptime monitoring
├── Dockerfile · docker-compose.yml · render.yaml · vercel.json
└── ecosystem.config.json              PM2 cluster config
```

## API surface

29 route modules under `/api`. The most-used:

| Module | Endpoint(s) | Notes |
|---|---|---|
| Auth | `POST /api/auth/{register,login,refresh,reset-password}` | JWT + httpOnly cookies; Google OAuth flow |
| Users | `GET/PUT /api/users/me`, `/api/users/:id` | Profile, preferences |
| Sessions | `POST /api/sessions/start`, `POST /api/sessions/:code` | 6-digit codes, geofence + face verify |
| Quiz | `POST /api/quiz/generate`, `POST /api/quiz/:id/submit` | Gemini → OpenAI fallback, auto-grade |
| Notes | `GET/POST /api/notes` | Multipart upload, async indexing |
| Grades | `GET/POST /api/grades` | Trends, weighted categories |
| Analytics | `GET /api/analytics/...` | Live class & teacher insights |
| Tickets | `GET/POST /api/tickets` | Threaded support |
| Admin | `GET /api/admin/stats` | Platform stats, audit logs |
| Face | `POST /api/face/{register,verify}` | Embedding-based recognition |
| Realtime | `WS /ws`, `GET /api/events` (SSE) | Live quizzes, attendance, leaderboards |

## Testing

- **Unit / integration:** Vitest — `npm test` (config: `vitest.config.ts`)
- **Security suite:** `npm run test:security` (auth, RBAC, input sanitisation)
- **End-to-end:** Cypress — see `cypress/`
- **Smoke:** `npm run test:api`, `npm run test:fullstack`

## Deployment

### Vercel
1. Import the repo in Vercel.
2. Set environment variables (don't forget `UPSTASH_REDIS_REST_URL/TOKEN` and `ALLOWED_ORIGINS`).
3. Deploys on push; serverless entry is `api/index.ts`.

### Docker
```bash
docker build -t gyandeep .
docker run -p 3001:3001 --env-file .env gyandeep
# or local dev with hot reload:
docker compose -f docker-compose.dev.yml up
```

### PM2 cluster
```bash
npm run build
npm run start:cluster   # uses ecosystem.config.json
```

### Render / VPS
- `render.yaml` is provided.
- `config/nginx.conf` for reverse proxy.
- `scripts/setup-monitoring.sh` for Prometheus/uptime.

## Security

- **Hashing:** bcrypt cost factor 12.
- **Tokens:** short-lived JWT access (15 min) + refresh (7 d) in httpOnly cookies.
- **Rate limiting:** sliding window per IP (`RATE_LIMIT_*`).
- **Input handling:** DOMPurify + schema validation; centralised sanitiser middleware.
- **CSRF:** opt-in via `CSRF_SECRET` for state-changing routes.
- **CORS:** strict `ALLOWED_ORIGINS` whitelist.
- **Audit log:** every admin action persisted to `AuditLog`.
- **Email enumeration:** generic error messages on auth failure.
- **Production seed warning:** `prisma/seed.ts` creates test users with known passwords. Replace, delete, or gate it before going live.

## Suggested improvements

Findings from a code-graph analysis of this repo (1,320 nodes / 2,251 edges across 144 communities) and a review of the current README & layout. Ordered roughly by impact:

1. **Trim repo bloat.** Several dev artefacts and one-off scripts are committed at the repo root and would be better in `scripts/` or `.gitignore`d:
   - `dev.err`, `err.tmp`, `out.tmp`, `mockapi.err`, `ir_log.txt`, `ir_log8.txt`, `CONVERSION_COMPLETE.txt`, `gyandeep.env`
   - Loose root scripts: `check-user.js`, `create-test-users.js`, `fix-users.js`, `list-users.js`, `update-existing.js`, `test-api.js`, `test-db-connection.js`, `test-fullstack.js`, `mock-server.cjs`, `setup.bat`, `setup.sh`
   - `gyandeep.env` is especially risky — anything resembling an env file should never be tracked.
2. **Generate the OpenAPI spec.** With 29 route modules, hand-written API tables drift fast. Adopt `zod-to-openapi` or `express-openapi` and auto-publish a `/docs` Swagger UI — kills the largest doc-rot risk in the codebase.
3. **Centralise the API client.** `services/dataService.ts::apiRequest` is the largest hub in the graph (degree 84). Consider migrating it to React Query mutations/queries (already a dependency) — gets you cache invalidation, retries, and devtools for free.
4. **Type-share between client and server.** The Prisma schema (26 models) and `types.ts` (~30 frontend types) describe overlapping shapes. Move shared types into a `shared/` folder and import on both sides; or generate frontend types from Prisma to eliminate drift.
5. **Add CI.** No `.github/workflows/` was detected. Add a workflow that runs `lint`, `typecheck`, `test`, and `test:security` on PRs. Wire Cypress E2E on a nightly schedule.
6. **Lock the seed in production.** `db:seed` and `db:seed:force` mass-mutate collections from a script run via `node -e`. Gate seed scripts on `NODE_ENV !== 'production'` at the script level, not just docs.
7. **Consolidate WebSocket layers.** The graph shows `RealtimeClient`, `SocketService`, and a separate `realtimeClient` service as three hubs (degrees 30, 25, …). Unifying them removes a class of subtle bugs around reconnect & message routing.
8. **Document the modules folder.** Move the excellent `MODULE_DESIGN.md` into `docs/architecture.md` and link from this README; today it lives at the root and is easy to miss.
9. **Service worker cache for `/api/users/me`.** Currently no runtime cache rule for the profile route — every navigation re-fetches. A short `NetworkFirst` (~30s) would cut perceived latency on PWA cold-starts.
10. **Add a `LICENSE` file.** No license file exists at the repo root, which technically makes the code "all rights reserved" by default. Pick MIT/Apache-2.0/etc. and commit.
11. **Stop tracking `dev-dist/`.** It's a build artefact regenerated by `vite-plugin-pwa` and should be `.gitignore`d.
12. **Pin Node version.** Add `.nvmrc` and `engines` in `package.json` so contributors don't hit subtle Node 18 vs 20 differences (e.g. `--experimental-strip-types` in the Prisma seed config).
13. **Image hygiene.** `Book to Lantern Logo for Gyandeep.png` lives at the repo root; move to `public/` and rename without spaces.
14. **Consider Prisma migrations over `db push`.** `db:push` is fine in dev, but for production a `prisma migrate deploy` flow gives you a paper trail and rollback story.
15. **Test coverage gates.** `vitest.config.ts` supports coverage; enforce a floor (e.g. 70% on `server/routes/`) in CI.

## Contributing

1. Fork → feature branch → PR against `main`.
2. Run `npm run lint && npm run typecheck && npm test` before pushing.
3. Keep PRs scoped — one concern per PR.
4. New routes need a test in `server/tests/` and an entry in the API table above.

---

_Built for classrooms. Powered by AI._
