# Gyandeep Deployment Guide

This guide covers production deployment, database setup, and CORS configuration for the Gyandeep platform.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Health Check](#health-check)
5. [CORS Configuration](#cors-configuration)
6. [Deployment Options](#deployment-options)
7. [Post-Deployment Verification](#post-deployment-verification)

---

## Prerequisites

- Node.js 18+
- MongoDB Atlas cluster (or self-hosted MongoDB)
- npm or yarn
- Git

---

## Environment Setup

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Required Variables

Fill in these **required** variables in `.env`:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gyandeep

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your_64_char_random_string
JWT_REFRESH_SECRET=your_64_char_random_string

# CORS (your production domain)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## Database Setup

### Initial Setup (First Time)

```bash
# 1. Install dependencies
npm install

# 2. Push Prisma schema to database
npm run db:push

# 3. Seed database with initial data
npm run db:seed
```

### Available Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:push` | Push schema changes to database |
| `npm run db:seed` | Run seed script to populate sample data |
| `npm run db:studio` | Open Prisma Studio for data management |

### Migration Steps (Production)

```bash
# 1. Backup existing data (recommended)
mongodump --uri="your_connection_string" --out=backup_$(date +%Y%m%d)

# 2. Push schema changes
npm run db:push

# 3. Verify schema
npm run db:studio
```

### Seed Data Overview

The seed script creates:

- **1 Admin**: `admin@gyandeep.edu`
- **3 Teachers**: `john.smith@gyandeep.edu`, `sarah.johnson@gyandeep.edu`, `mike.wilson@gyandeep.edu`
- **8 Students**: Various student accounts linked to classes
- **3 Classes**: Class 9A, Class 10A, Class 11 Science
- **6 Subjects**: Math, Science, English, Physics, Chemistry, Computer Science
- **5 Timetable entries**: Sample weekly schedule
- **2 Class Sessions**: Active sessions with codes
- **1 Quiz**: Science quiz with 3 questions
- **Sample Data**: Attendance, grades, tickets, notifications

---

## Health Check

The `/api/health` endpoint is available on both servers:

### Development
```bash
curl http://localhost:3001/api/health
```

### Expected Response

```json
{
  "status": "ok",
  "db": "connected",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response (Database Disconnected)

```json
{
  "status": "error",
  "db": "disconnected",
  "error": "connection refused",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Use in Load Balancers

For AWS ALB or similar:
- **Path**: `/api/health`
- **Port**: `3001`
- **Expected Code**: `200`
- **Unhealthy Threshold**: 2 consecutive failures

---

## CORS Configuration

### Development

```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Production

```env
# Single domain
ALLOWED_ORIGINS=https://gyandeep.yourschool.edu

# Multiple domains (subdomains, www)
ALLOWED_ORIGINS=https://gyandeep.yourschool.edu,https://www.yourschool.edu,https://app.yourschool.edu

# Wildcard NOT recommended for production (security risk)
# ALLOWED_ORIGINS=*
```

### Common CORS Issues

**Error**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution**: Ensure your frontend domain is in `ALLOWED_ORIGINS`:

```env
# If frontend is at https://gyandeep.example.com
ALLOWED_ORIGINS=https://gyandeep.example.com
```

**Error**: `CORS policy: Credentials flag is true, but Access-Control-Allow-Credentials is not`

**Solution**: Both servers already set `credentials: true`. Verify your frontend sends requests with `withCredentials: true`.

---

## Deployment Options

### Option 1: Docker (Recommended)

```bash
# Build and start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Option 2: Traditional VPS/Server

```bash
# 1. Clone repository
git clone https://github.com/yourorg/gyandeep.git
cd gyandeep

# 2. Install dependencies
npm install

# 3. Build frontend
npm run build

# 4. Set environment variables
export NODE_ENV=production
export MONGODB_URI=your_connection_string
export JWT_SECRET=your_secret
export JWT_REFRESH_SECRET=your_refresh_secret
export ALLOWED_ORIGINS=https://yourdomain.com

# 5. Start production server
npm run start
```

### Option 3: PM2 (Production Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start server/production.js --name gyandeep-api

# Save PM2 config
pm2 save
pm2 startup

# Monitor
pm2 monit
pm2 logs gyandeep-api
```

### Option 4: Vercel (Serverless)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Note**: Vercel deployment requires `vercel.json` configuration for API routes.

---

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://yourdomain.com/api/health
```

### 2. CORS Test

```bash
# Test from different origin
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://yourdomain.com/api/auth/login -v
```

### 3. Database Connection

```bash
# Via Prisma Studio (if accessible)
npm run db:studio
```

### 4. API Test

```bash
# Login endpoint
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gyandeep.edu","password":"yourpassword"}'
```

---

## Troubleshooting

### Database Connection Failed

**Symptom**: Health check returns `db: disconnected`

**Solutions**:
1. Verify `MONGODB_URI` format
2. Check IP whitelist in MongoDB Atlas
3. Test connection: `mongosh "your_connection_string"`

### CORS Errors

**Symptom**: Browser console shows CORS errors

**Solutions**:
1. Verify `ALLOWED_ORIGINS` includes exact frontend URL
2. Check for trailing slashes (should not have)
3. Verify server restarted after env change

### JWT Authentication Failed

**Symptom**: 401 errors on protected routes

**Solutions**:
1. Verify `JWT_SECRET` is set
2. Check token expiry (15 minutes default)
3. Verify `Authorization: Bearer <token>` header format

---

## Security Checklist

- [ ] Changed default JWT secrets
- [ ] Restricted `ALLOWED_ORIGINS` to production domains only
- [ ] MongoDB Atlas IP whitelist configured
- [ ] Database credentials rotated
- [ ] `NODE_ENV=production` set
- [ ] SSL/TLS enabled (HTTPS)
- [ ] Rate limiting enabled (default: 100 req/15min)

---

## Support

For deployment issues:
1. Check server logs: `npm run server` or `pm2 logs`
2. Verify `.env` configuration
3. Test database connectivity
4. Review CORS headers in browser Network tab
