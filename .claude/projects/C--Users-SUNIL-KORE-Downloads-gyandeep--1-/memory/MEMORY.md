# Gyandeep Project Memory

## Project Overview
EduTech platform (React/TypeScript frontend + Node.js/Express backend).
Working directory: `C:/Users/SUNIL KORE/Downloads/gyandeep (1)/`

## Architecture (post-refactor)
- Frontend: React 18 + TypeScript + Vite, flat component structure (no src/)
- Backend: Node.js/Express, entry: `server/index.js` (thin router)
- DB: SQLite primary (`server/data/gyandeep.db`) + JSON fallback, PostgreSQL optional
- AI: Gemini 2.5 Flash/Pro via LLM adapter pattern

## Key File Paths
| File | Purpose |
|------|---------|
| `server/index.js` | Thin entry point, mounts all routes |
| `server/routes/auth.js` | Auth routes (register/login/OTP/reset) |
| `server/routes/quiz.js` | Quiz generation (cached, async) |
| `server/routes/attendance.js` | Attendance (Redis-buffered) |
| `server/routes/admin.js` | Admin-only routes |
| `server/routes/notes.js` | Notes upload + async indexing |
| `server/controllers/userStore.js` | Centralised user read/write (DB+file) |
| `server/middleware/requireAuth.js` | JWT Bearer auth |
| `server/middleware/rbac.js` | `ensureRole('teacher','admin')` |
| `server/middleware/rateLimiter.js` | Sliding-window rate limits |
| `server/middleware/validate.js` | Input sanitization + asyncRoute wrapper |
| `server/middleware/sanitizeResponse.js` | Strip sensitive fields from responses |
| `server/services/redisService.js` | Redis abstraction (session codes, OTP, attendance buffer, circuit breaker, quiz cache) |
| `server/services/llmService.js` | LLM adapter (GeminiAdapter, swappable) |
| `server/db/schema.sql` | PostgreSQL normalized schema |
| `server/db/pg.js` | PostgreSQL pool module |
| `hooks/useAuth.ts` | Auth state extracted from App.tsx |
| `hooks/useClassSession.ts` | Session/attendance state extracted from App.tsx |
| `hooks/usePerformance.ts` | XP/badges logic extracted from App.tsx |
| `App.tsx` | Thin root component using extracted hooks |

## Completed Improvements
1. PostgreSQL schema with pgvector, PostGIS, BRIN/GIST/Hash indexes, partitioned tables, materialized views
2. MVC structure: routes/ controllers/ middleware/ services/ db/
3. Redis service: session code TTL, OTP storage, attendance write buffer (5s batch), circuit breaker, quiz cache
4. Async AI pipeline: quiz generation via job queue, fire-and-forget notes indexing
5. RBAC: `ensureRole()` on all routes
6. Security: crypto.randomBytes for OTPs, bcrypt(12) rounds, email enumeration prevention, CORS lockdown, sensitive field stripping, server-side geofencing
7. LLM adapter pattern: swap Gemini → OpenAI/Local without touching routes
8. App.tsx refactored: 430 lines → uses useAuth, useClassSession, usePerformance hooks

## Security Fixes Applied
- `/api/users` now requires auth (was public)
- `/api/question-bank/add` now requires teacher/admin role (was unprotected)
- `/api/admin/override` now requires admin role (was unprotected)
- OTP/reset codes use `crypto.randomBytes` not `Math.random()`
- Password reset doesn't leak email existence (same response either way)
- All responses strip password/faceImage fields via `toPublicUser()`
- Students can only see their own tickets/notifications

## Environment Variables Needed
- `GEMINI_API_KEY` — AI features
- `JWT_SECRET` — JWT signing
- `SESSION_SECRET` — Express session
- `DATABASE_URL` — PostgreSQL (optional, falls back to SQLite)
- `REDIS_HOST` / `REDIS_PORT` — Redis (optional, falls back to in-process)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth (optional)
- `ALLOWED_ORIGINS` — comma-separated frontend URLs
