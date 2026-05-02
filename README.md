# Gyandeep — AI-Powered Smart Classroom

A full-stack educational platform that brings classrooms online: real-time class sessions, geofenced attendance with face recognition, AI-generated quizzes, gamified learning, centralised notes, analytics, and a built-in support workflow — all in one PWA.

> **Status:** active development · **Stack:** React 18 · TypeScript · Express · MongoDB · Prisma · Vite

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js (local) / Vercel API (production)
- **Database**: MongoDB Atlas with Prisma ORM
- **Real-time**: WebSocket + SSE
- **Auth**: JWT with httpOnly cookies + Face recognition
- **AI**: Groq API (with OpenRouter fallback)

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

### Optional
- `GROQ_API_KEY` - Groq API for AI chatbot
- `OPENROUTER_API_KEY` - OpenRouter fallback for AI features
- `RESEND_API_KEY` - Email service
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth
- `R2_*` - Cloudflare R2 storage
- `FACE_RECOGNITION_SERVICE_URL` - Face recognition service

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

## ⚠️ Production Notes

### Seed Data Warning
The `prisma/seed.ts` creates test users with known passwords. **Before production:**
- Change default passwords in seed.ts
- Or delete test users after deployment
- Or create a production seed that doesn't include test users

### Security
- JWT_SECRET must be set in production
- Use strong, unique secrets
- Enable HTTPS in production
- Configure CORS properly

## Features

- User authentication (email/password, Google OAuth, Face)
- Class sessions with codes
- Real-time quiz system
- Attendance tracking with GPS
- Grade book
- Gamification (XP, coins, levels)
- Support tickets
- Notifications
- Announcements
- Timetable
- Notes (session + centralized)
- AI analytics (Groq)
- File storage
- Email notifications
- Real-time updates (WebSocket/SSE)
