FROM node:18-alpine

WORKDIR /app

# Install required system packages
RUN apk add --no-cache python3 py3-pip

# Copy package files
COPY package.json package-lock.json ./

# Install Node dependencies
RUN npm install --production

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Create data directories
RUN mkdir -p server/data server/storage python/data/faces

EXPOSE 3000 5001

# Start the application
CMD ["npm", "start"]
