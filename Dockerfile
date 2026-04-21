# Gyandeep Dockerfile - Backend Only (Frontend on Vercel)

FROM node:22-alpine

WORKDIR /app

# Install build tools
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev --legacy-peer-deps

# Copy backend and lib folders
COPY server ./server
COPY lib ./lib
COPY prisma ./prisma

# Create directories
RUN mkdir -p server/data server/storage

# Set production env
ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["node", "server/index.js"]
