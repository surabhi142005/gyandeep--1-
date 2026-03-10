FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Copy server code
COPY server/ ./server/

# Create data directories
RUN mkdir -p server/data server/storage

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "index.js"]
