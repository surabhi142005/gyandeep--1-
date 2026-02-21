# Docker Deployment Guide

This guide covers building and running Gyandeep in production using Docker and Docker Compose.

## Prerequisites

- Docker (version 20+)
- Docker Compose (version 2.0+)
- `.env` file with required secrets (see `.env.example`)

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
NODE_ENV=production
PORT=3001
WEBSOCKET_PORT=3002
SESSION_SECRET=your-strong-secret-here
JWT_SECRET=your-strong-jwt-secret-here
GEMINI_API_KEY=your-api-key-here
GOOGLE_CLIENT_ID=optional-if-using-oauth
GOOGLE_CLIENT_SECRET=optional-if-using-oauth
VITE_API_URL=http://your-domain.com:3001
```

**Security Note:** Never commit `.env` to version control. Use secret management in your CI/CD pipeline.

## Building and Running

### Single Command Startup

```bash
docker-compose up --build
```

This will:
1. Build the Docker image
2. Create and start containers
3. Run the database migration automatically
4. Start the backend server (port 3001) and websocket server (port 3002)

### Background Mode

```bash
docker-compose up -d --build
```

### View Logs

```bash
docker-compose logs -f
```

### Stop Services

```bash
docker-compose down
```

To also remove persisted data:

```bash
docker-compose down -v
```

## Exposed Ports

| Port | Service | Purpose |
|------|---------|---------|
| 3001 | Backend API | REST endpoints for auth, data |
| 3002 | WebSocket | Real-time updates (attendance, performance) |
| 5173 | Vite Dev Server | Frontend (when running in dev mode) |
| 5001 | Python Service | Face recognition (optional) |

## Data Persistence

By default, volumes persist:

- `./server/data/` — SQLite database, user data, config
- `./server/storage/` — Notes and uploaded files
- `./python/data/` — Face recognition cache

These are mounted from the host filesystem and will survive container restarts.

## Database Management

### Automatic Migration

The Docker entrypoint runs `node server/migrate-users-to-db.js` automatically on startup to migrate any legacy `users.json` into SQLite.

### Manual Migration

```bash
docker-compose exec gyandeep node server/migrate-users-to-db.js
```

### Database Shell

To inspect the SQLite database directly:

```bash
docker-compose exec gyandeep sqlite3 server/data/gyandeep.db
```

## Scaling to Production

### Using Docker Swarm or Kubernetes

For multi-node deployments, consider:

- **Persistent volumes** (NFS, EBS, etc.) for shared data across replicas
- **Environment-specific overrides** (separate `docker-compose.prod.yml`)
- **Reverse proxy** (nginx, Traefik) for load balancing and SSL termination
- **Backup strategies** for the SQLite database

### Example Production Deployment with nginx

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - gyandeep

  gyandeep:
    build:
      context: .
      target: production
    environment:
      - NODE_ENV=production
      - PORT=3001
      - WEBSOCKET_PORT=3002
    volumes:
      - /data/gyandeep/server:/app/server/data
      - /data/gyandeep/storage:/app/server/storage
    restart: always
```

Deploy with:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring and Logging

### Container Health

```bash
docker-compose ps
```

### Real-Time Logs

```bash
docker-compose logs -f gyandeep
```

### Persisting Logs to File

Use Docker log drivers to rotate and save logs:

```yaml
gyandeep:
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

## Troubleshooting

### Port Already in Use

If port 3001 or 3002 is already in use:

```bash
docker-compose down
# Or change port mappings in docker-compose.yml
```

### Database Locked

If you see "database is locked" errors, the SQLite database may have multiple writers. Ensure only one backend process is running:

```bash
ps aux | grep 'node server'
```

### Out of Memory

Increase Docker memory limits in `docker-compose.yml`:

```yaml
gyandeep:
  mem_limit: 2g
```

### WebSocket Connection Refused

Ensure port 3002 is open in your firewall and that the client connects to the correct websocket URL:

```typescript
const token = localStorage.getItem('gyandeep_token');
websocketService.connect(userId, userRole, token);
```

## Updating the Application

To pull the latest code and rebuild:

```bash
git pull
docker-compose up -d --build
```

## Backup and Recovery

### Backing Up Database

```bash
docker-compose exec -T gyandeep sqlite3 server/data/gyandeep.db ".dump" > backup.sql
```

### Restoring from Backup

```bash
docker-compose exec -T gyandeep sqlite3 server/data/gyandeep.db < backup.sql
```

## Security Best Practices

1. **Use strong secrets** — Generate 32+ character random strings for `SESSION_SECRET` and `JWT_SECRET`
2. **Rotate secrets regularly** — Use secret management systems (HashiCorp Vault, AWS Secrets Manager, etc.)
3. **Use SSL/TLS** — Proxy through nginx or Traefik with valid certificates
4. **Limit network access** — Run containers in isolated Docker networks; restrict port access with firewall rules
5. **Keep dependencies updated** — Run `npm audit fix` regularly
6. **Monitor logs** — Watch for failed login attempts, errors, and unusual patterns

## Support

For issues or questions, check:

- [README.md](./README.md)
- [API_KEY_SETUP.md](./API_KEY_SETUP.md)
- GitHub Issues / Discussions
