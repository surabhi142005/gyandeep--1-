# Gyandeep Deployment Guide 🚀

Gyandeep is a comprehensive AI-powered smart classroom system designed for modern education. This guide covers deploying the application with real-time data, authentication, and database persistence in production.

## 🏛 Architecture Overview

Gyandeep uses a multi-layered, scalable architecture:

1. **Frontend (React + Vite)**: Responsive, high-performance UI served statically.
2. **Backend API (Node.js/Express)**: REST endpoints for auth, users, notes, classes, AI features.
3. **WebSocket Server (Socket.IO)**: Real-time updates (attendance, performance, blockchain, digital twin).
4. **SQLite Database**: Persistent storage (users, courses, notes, grades, audit logs).
5. **Face Recognition Engine** (Optional): Web-based or Python Flask microservice.
6. **Blockchain Layer** (Optional): Immutable attendance records and NFT certificates.

---

## 🛠 Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Docker & Docker Compose** (recommended for containerized deployment)
- **Python 3.9+** (only for advanced face recognition mode)
- **Hardware**: Minimum 1GB RAM (2GB recommended for AI features)
- **SQLite 3+** (included with most systems)

---

## 🚀 Quick Start

### Option A: Docker Compose (Recommended)

See [DEPLOYMENT_DOCKER.md](./DEPLOYMENT_DOCKER.md) for full Docker setup.

```bash
# 1. Create .env file
cp .env.example .env
# Edit .env with your secrets and API keys

# 2. Start all services
docker-compose up -d --build

# 3. Migrate users (auto-runs in Docker startup)
# Backend API: http://localhost:3001
# WebSocket: ws://localhost:3002
# Frontend: served at root
```

### Option B: Manual Node.js + npm

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env
# Edit .env with secrets and API keys

# 3. Build frontend
npm run build

# 4. Run database migration
node server/migrate-users-to-db.js

# 5. Start backend (development)
npm start

# 6. In another terminal, start websocket server
npm run websocket

# Frontend: http://localhost:5173 (dev)
# Backend API: http://localhost:3001
# WebSocket: ws://localhost:3002
```

---

## 🔐 Authentication & Security

### Authentication Flow

1. **Register** — User submits email/password
   - Backend hashes password with bcrypt
   - Stores user in SQLite database
   - Returns JWT token (valid 7 days)
   - Token stored in browser localStorage

2. **Login** — User authenticates with email/password
   - Backend verifies password hash
   - Signs JWT token
   - Client stores token locally

3. **API Access** — JWT required for protected endpoints
   ```
   Authorization: Bearer <token>
   ```

4. **Real-Time Updates** — WebSocket requires JWT in handshake
   ```javascript
   socket.connect('ws://localhost:3002', {
     auth: { token: localStorage.getItem('gyandeep_token') }
   });
   ```

### Environment Secrets

**Critical variables** (must be set in production):

```env
NODE_ENV=production
PORT=3001
WEBSOCKET_PORT=3002

# Strong secrets (generate 32+ random characters)
SESSION_SECRET=your-strong-session-secret
JWT_SECRET=your-strong-jwt-secret

GEMINI_API_KEY=your-google-genai-api-key
GOOGLE_CLIENT_ID=optional-oauth-client-id
GOOGLE_CLIENT_SECRET=optional-oauth-client-secret

VITE_API_URL=https://your-domain.com
```

**Never commit `.env` to version control.** Use secret management:

- GitHub Actions: Repository secrets
- Docker: Image registry secrets
- Self-hosted: Encrypted vaults (HashiCorp Vault, AWS Secrets Manager)

---

## 📊 Database

### Schema

SQLite database (`server/data/gyandeep.db`) includes tables for:

- **users** — User profiles, roles, preferences
- **otp** — One-time passwords for password resets
- **audit_logs** — System audit trail
- **classes** — Class configurations
- **question_bank** — Quiz questions
- **tags_presets** — Subject-specific tags

### Migration

Run on first startup to migrate legacy `users.json` to SQLite:

```bash
node server/migrate-users-to-db.js
```

In Docker, this runs automatically.

### Backup & Recovery

```bash
# Full backup
sqlite3 server/data/gyandeep.db ".dump" > backup.sql

# Restore
sqlite3 server/data/gyandeep.db < backup.sql

# Or use filesystem backups
rsync -av server/data/ /backup/gyandeep-data/
```

---

## 🌐 Production Configuration

### Reverse Proxy (nginx)

```nginx
upstream api {
  server localhost:3001;
}

upstream websocket {
  server localhost:3002;
}

server {
  listen 443 ssl http2;
  server_name your-domain.com;

  ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

  # API endpoints
  location /api/ {
    proxy_pass http://api;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # WebSocket (real-time)
  location /socket.io/ {
    proxy_pass http://websocket;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  # Frontend
  location / {
    root /path/to/gyandeep/dist;
    try_files $uri $uri/ /index.html;
  }
}
```

### Process Manager (PM2)

```bash
npm install -g pm2

pm2 start server/index.js --name "gyandeep-api"
pm2 start server/websocket-server.js --name "gyandeep-websocket"
pm2 save
pm2 startup
```

### Firewall Rules

Allow:

- Port 80 (HTTP, redirect to HTTPS)
- Port 443 (HTTPS)
- Port 3001 (Backend, internal only if behind proxy)
- Port 3002 (WebSocket, internal only if behind proxy)

---

## 📈 Scaling

### Multi-Process Backend

Environment variable `NODE_ENV=production` enables clustering (optional).

### Multi-Instance WebSocket

For > 1000 concurrent users, use Redis adapter:

```bash
npm install socket.io-redis
```

Configure in `server/websocket-server.js`:

```javascript
import { createAdapter } from '@socket.io/redis-adapter';
io.adapter(createAdapter(pubClient, subClient));
```

### Load Balancing

Use nginx or AWS Load Balancer to distribute traffic across multiple app instances.

---

## 🔍 Monitoring & Logging

### Health Checks

```bash
# API health
curl http://localhost:3001/api/users

# WebSocket health
curl http://localhost:3002/health
```

### Logs

```bash
# Docker
docker-compose logs -f gyandeep

# PM2
pm2 logs

# File-based (configure in docker-compose.yml)
docker-compose exec gyandeep tail -f /var/log/gyandeep/app.log
```

### Metrics

Monitor:

- CPU usage
- Memory usage
- Database disk I/O
- WebSocket connection count
- API response times
- Error rates

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port already in use | Change port in `.env` or `docker-compose.yml` |
| Database locked | Ensure only one backend process; check file permissions |
| WebSocket fails | Verify port 3002 is open; check `Upgrade` header in proxy |
| Login fails | Check `JWT_SECRET` is consistent; clear localStorage |
| High memory usage | Profile with `node --inspect`; check for memory leaks |

---
*Made with ❤️ for educators and learners.*

