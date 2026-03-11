# Gyandeep Architecture (Simplified)

## High-Level
- **Frontend**: React + Vite + TypeScript + Tailwind; consumes REST APIs; SSR/SPA deployable on Vercel/Netlify.
- **Backend**: Express handlers deployable as serverless functions; stateless; JWT/session middleware unchanged.
- **Database**: MongoDB Atlas only (collections in DATABASE_DESIGN.md); no SQLite/JSON fallbacks.
- **Storage**: S3/R2-compatible bucket for uploads (notes, session files). API stores URLs + extracted text only.
- **Messaging/Notifications**: Mongo-backed notifications; optional SSE/Redis for live updates.

## Core Flows Mapped to Entities
- User enrolls in Class → classId on `users`
- Teacher creates Class Session (with `classId`, `subjectId`, `teacherId`) → generates join `code`
- Session holds attendance, generates quizzes, holds centralized notes, and produces teacher insights
- Quiz → questions → attempts → answers → grade
- Tickets/Replies tie to users; may be assigned to admins/teachers
- Announcements and notes scoped to class

## Deployment Shape
- **Serverless**: Each route exported as a handler; cold-start safe (no global writes); DB connection cached per runtime.
- **CDN**: Frontend assets served from edge; API behind HTTPS; storage bucket publicly readable with signed URLs if needed.
- **Env**: `MONGODB_URI`, `BUCKET_URL/KEYS`, `JWT_SECRET`, `SESSION_SECRET`.

## Diagram (text)
USER → CLASS → CLASS_SESSION → { ATTENDANCE | QUIZ → QUIZ_QUESTION → QUIZ_ATTEMPT → ATTEMPT_ANSWER → GRADE }  
CLASS → { CENTRALIZED_NOTE, ANNOUNCEMENT, TIMETABLE_ENTRY }  
USER → { TICKET → TICKET_REPLY, TEACHER_INSIGHT, NOTIFICATION }

## Non-Functional
- Idempotency keys for at-least-once client retries.
- Index-first design to keep p95 latency low on serverless.
- All file operations abstracted to storage adapter; local fs only for temp buffers.
