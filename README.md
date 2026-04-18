# Gyandeep - Educational Platform

A full-stack educational platform with authentication, class management, quizzes, gamification, and AI features.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js (local) / Vercel API (production)
- **Database**: MongoDB Atlas with Prisma ORM
- **Real-time**: WebSocket + SSE
- **Auth**: JWT with httpOnly cookies + Face recognition
- **AI**: Google Gemini

## Getting Started

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your values

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Environment Variables

### Required
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `JWT_REFRESH_SECRET` - Refresh token secret
- `ALLOWED_ORIGINS` - Comma-separated allowed origins

### Optional
- `GEMINI_API_KEY` - Google Gemini for AI features
- `RESEND_API_KEY` - Email service
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth
- `R2_*` - Cloudflare R2 storage
- `FACE_RECOGNITION_SERVICE_URL` - Face recognition service

## Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:seed` - Seed database with test data
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Prisma Studio

## Deployment

### Vercel
1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Docker
```bash
docker build -t gyandeep .
docker run -p 3001:3001 --env-file .env gyandeep
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
- AI analytics (Gemini)
- File storage
- Email notifications
- Real-time updates (WebSocket/SSE)