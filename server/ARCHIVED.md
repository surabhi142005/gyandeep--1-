# Server Files — Archived

These server files are **no longer needed in production** after the migration to Supabase + Vercel serverless. They are kept in the repository for reference only.

## Replaced By

| File | Replaced By |
|------|------------|
| `index.js` | Supabase DB/Auth + Vercel `/api/*` functions |
| `production.js` | Vercel static hosting + serverless |
| `websocket-server.js` | Supabase Realtime |
| `database.js` | Supabase PostgreSQL |
| `emailService.js` | Supabase Auth emails + Resend via `/api/email-notification` |
| `apis.js` | `/api/face-auth` serverless function |

## To Run Locally (Development Only)

If you need to run the legacy server for debugging:

```bash
cd server
npm install
node index.js
```

Requires `.env.local` in the project root with `GEMINI_API_KEY`, `JWT_SECRET`, etc.
