# Dockerfile for Gyandeep Backend (Render deployment)
# Frontend should be deployed separately to Vercel

FROM node:22-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev --legacy-peer-deps

# Copy backend files
COPY server ./server
COPY lib ./lib

# Create required directories
RUN mkdir -p server/data server/storage

# Set environment
ENV NODE_ENV=production

# Expose port - Render provides this via $PORT
EXPOSE $PORT

# Start server (reads PORT from environment - Render provides this)
CMD ["node", "server/index.js"]
