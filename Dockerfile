# Multi-stage Dockerfile for Gyandeep

# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies with --legacy-peer-deps to handle React 18/19 peer conflicts
# specifically for @react-three/drei and @react-three/fiber
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy built assets and necessary backend files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/api ./api
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public

# Create directories
RUN mkdir -p public/models server/data server/storage

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "server/index.js"]
