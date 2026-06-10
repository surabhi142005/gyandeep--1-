# Gyandeep Dockerfile - Full Stack on Render
# Rebuild: 2026-05-04

FROM node:22-alpine

# Force rebuild
ARG CACHEBUST=1

WORKDIR /app

# Install build tools
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies with quieter, deterministic output
RUN npm ci --legacy-peer-deps --no-audit --no-fund --loglevel=error

# Copy source files
COPY . .

# Build frontend
RUN npx vite build

# Copy server files
COPY server ./server

# Set production env
ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["node", "server/index.js"]
