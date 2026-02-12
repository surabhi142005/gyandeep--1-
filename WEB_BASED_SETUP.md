# Gyandeep - Web-Based Setup Guide

## Overview

Gyandeep is now a **completely web-based application** that runs entirely in the browser and on Node.js. No desktop applications or Python installations are required.

## What Changed

### Before (Desktop-Based)
- ❌ Python backend required
- ❌ OpenCV dependencies
- ❌ Face recognition service on localhost:5001
- ❌ Complex system setup
- ❌ Limited deployment options

### Now (Web-Based)
- ✅ Pure Node.js backend
- ✅ No external dependencies
- ✅ All services in Express.js
- ✅ Simple setup (just `npm install`)
- ✅ Deploy anywhere (cloud-ready)

## Quick Start

### 1. Install Node.js
Download from https://nodejs.org/ (LTS version recommended)

### 2. Install Dependencies
```bash
cd gyandeep
npm install
```

### 3. Set up Environment
Create `.env.local` in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
NODE_ENV=production
```

Get your Gemini API key from: https://aistudio.google.com/

### 4. Build & Run
```bash
npm run build
npm start
```

Visit `http://localhost:3000` in your browser.

## Architecture

### Frontend (React)
- **Language**: TypeScript
- **Framework**: React 19
- **Build Tool**: Vite
- **Runs in**: Browser
- **Deployment**: Static files (dist/)

### Backend (Node.js)
- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Services**: API endpoints
- **Storage**: JSON files (easily migrated to databases)
- **Port**: 3000 (configurable)

## Services

### 1. Face Recognition (Web-Based)
**Endpoints:**
- `POST /api/face/register` - Register user's face
- `POST /api/auth/face` - Verify/authenticate face

**How it works:**
- Captures image from browser camera (getUserMedia API)
- Sends base64-encoded image to server
- Server performs image comparison
- Returns authentication result

**Key Features:**
- No Python/OpenCV needed
- Browser-based camera access
- Real-time validation
- Liveness detection support

### 2. Location Verification (Web-Based)
**Endpoint:**
- `POST /api/auth/location` - Verify user location

**How it works:**
- Gets GPS coordinates from browser (Geolocation API)
- Calculates distance using Haversine formula
- Verifies if within allowed radius
- Returns verification result

### 3. AI Services (Google Gemini)
**Endpoints:**
- `POST /api/quiz` - Generate quiz from notes
- `POST /api/chat` - AI chatbot with location awareness

**Features:**
- Structured JSON responses
- Thinking mode support (extended reasoning)
- Safety filters
- Grounding with Google Maps

### 4. Data Management
**Endpoints:**
- User management
- Class management
- Question bank
- Notes storage
- Attendance tracking

## File Structure

```
gyandeep/
├── src/
│   ├── App.tsx                 # Main app
│   ├── index.tsx              # Entry point
│   └── components/            # React components
├── server/
│   ├── production.js          # Main server (web-based)
│   ├── apis.js               # Web-based API handlers
│   └── data/
│       ├── users.json        # User data
│       ├── classes.json      # Class data
│       └── faces/            # Stored face images
├── services/
│   ├── authService.ts        # Auth API calls
│   ├── dataService.ts        # Data API calls
│   ├── geminiService.ts      # AI API calls
│   └── locationService.ts    # Location API calls
├── dist/                      # Built frontend (production)
├── package.json              # Dependencies
├── vite.config.ts           # Vite configuration
└── tsconfig.json            # TypeScript config
```

## Development vs Production

### Development Mode
```bash
npm run dev
# Runs Vite dev server on http://localhost:5173
# Backend server still runs on http://localhost:3000
```

### Production Mode
```bash
npm run build    # Build frontend to dist/
npm start        # Start server (serves dist/ + API)
# Both frontend and backend on http://localhost:3000
```

## Deployment Options

### Option 1: Vercel (Recommended)
Best for static hosting + serverless functions

```bash
npm install -g vercel
vercel login
vercel --prod
```

Set environment variables in Vercel dashboard.

### Option 2: Netlify
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

Note: For backend API, use Netlify Functions.

### Option 3: Self-Hosted (AWS EC2, Azure VM, DigitalOcean)
```bash
# On your server
npm install
npm run build
npm start
```

Set up nginx as reverse proxy (optional but recommended).

### Option 4: Docker
```bash
docker build -t gyandeep .
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key gyandeep
```

Deploy to Docker Hub, AWS ECS, Azure Container Instances, etc.

### Option 5: Railway, Render, Fly.io
These platforms support Node.js directly:
- Push code to GitHub
- Connect repository
- Set environment variables
- Deploy automatically

## Browser Requirements

- **Camera Access**: For face registration/authentication
  - Modern browsers (Chrome, Firefox, Safari, Edge)
  - HTTPS required (or localhost for development)

- **Geolocation**: For location-based attendance
  - GPS/Location services enabled
  - Browser permission granted

- **Storage**: For offline features
  - localStorage support
  - IndexedDB support (optional)

## API Reference

### Face Registration
```bash
curl -X POST http://localhost:3000/api/face/register \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJR..."
  }'
```

Response:
```json
{
  "ok": true,
  "message": "Face registered successfully",
  "user_id": "user123",
  "confidence": 0.95,
  "timestamp": "2026-02-12T10:30:00Z"
}
```

### Face Authentication
```bash
curl -X POST http://localhost:3000/api/auth/face \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJR..."
  }'
```

Response:
```json
{
  "authenticated": true,
  "confidence": 0.87,
  "threshold": 0.45,
  "message": "Face authentication successful"
}
```

### Location Verification
```bash
curl -X POST http://localhost:3000/api/auth/location \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 40.7128,
    "lng": -74.0060,
    "target_lat": 40.7130,
    "target_lng": -74.0061,
    "radius_m": 100
  }'
```

Response:
```json
{
  "authenticated": true,
  "distance_m": 15.5,
  "radius_m": 100,
  "message": "Location verified"
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| GEMINI_API_KEY | Yes | - | Google Gemini API key |
| PORT | No | 3000 | Server port |
| NODE_ENV | No | development | environment mode |
| GOOGLE_CLIENT_ID | No | - | For OAuth (optional) |
| GOOGLE_CLIENT_SECRET | No | - | For OAuth (optional) |

## Data Persistence

### JSON-Based (Default)
- Simple file storage
- Good for small deployments
- Files: `server/data/users.json`, etc.

### To Use a Database
The API is designed to work with any database. Update:

1. `services/dataService.ts` - Modify API calls
2. `server/production.js` - Connect to database
3. Add connection string to `.env.local`

Supported databases:
- PostgreSQL
- MongoDB
- MySQL
- Firebase
- Supabase

## Troubleshooting

### Issue: Camera not working
**Solution:**
- HTTPS required (or use localhost)
- Grant camera permissions in browser
- Check browser settings for camera access

### Issue: Location not detecting
**Solution:**
- Enable location services on device
- Grant location permission to browser
- Check GPS accuracy

### Issue: Face authentication failing
**Solution:**
- Ensure face is clearly visible
- Good lighting required
- Face should be centered in frame
- Re-register face if poor quality

### Issue: Port 3000 already in use
**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

### Issue: API key not found
**Solution:**
- Create `.env.local` file in root
- Add: `GEMINI_API_KEY=your_key`
- Restart server
- Don't commit `.env.local` to git (add to .gitignore)

## Performance Tips

1. **Use CDN** for static assets (Vercel, Cloudflare)
2. **Enable compression** (already in Express)
3. **Cache API responses** (add Redis)
4. **Use database** instead of JSON files for scale
5. **Monitor with**: Sentry, LogRocket, Datadog
6. **Load testing** with: k6, Artillery, Apache JMeter

## Security Best Practices

1. ✅ **Use HTTPS** in production
2. ✅ **Keep API key secure** (never expose in code)
3. ✅ **Validate all inputs** (already implemented)
4. ✅ **Use CORS** carefully (configured)
5. ✅ **Rate limiting** (implement Helmet.js)
6. ✅ **Authentication** (add JWT if needed)

## Next Steps

1. **Customize UI** - Modify components in `src/components/`
2. **Add database** - Replace JSON with SQL/NoSQL
3. **Deploy** - Choose your hosting platform
4. **Monitor** - Set up logging and analytics
5. **Scale** - Add caching, CDN, load balancer

## Support

For issues or questions:
- Check error logs: `npm start` with NODE_ENV=development
- Browser console: Press F12 and check Console tab
- Network tab: Check API response codes
- Read component TypeScript comments

---

**Gyandeep is now 100% web-based and ready to deploy! 🚀**
