# Gyandeep Dockerfile - Full Stack on Render

FROM node:22-alpine

WORKDIR /app

# Install build tools
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install --legacy-peer-deps

# Copy source files
COPY . .

# Install Vite for building
RUN npm install vite -D

# Build frontend
RUN npx vite build

# Copy server files
COPY server ./server

# Set production env
ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["node", "server/index.js"]
