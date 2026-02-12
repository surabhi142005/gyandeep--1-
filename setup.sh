#!/bin/bash

# Gyandeep Web-Based Installation Script
# This script sets up everything needed for web-based deployment

set -e

echo "🚀 Gyandeep Web-Based Setup"
echo "================================"

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js 16+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION found"

# Check npm installation
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ npm $NPM_VERSION found"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo ""
    echo "🔐 Creating .env.local file..."
    
    read -p "Enter your Gemini API Key (get from https://aistudio.google.com/): " GEMINI_KEY
    
    if [ -z "$GEMINI_KEY" ]; then
        echo "❌ API Key is required!"
        exit 1
    fi
    
    cat > .env.local << EOF
GEMINI_API_KEY=$GEMINI_KEY
PORT=3000
NODE_ENV=production
EOF
    
    echo "✅ .env.local created"
else
    echo "✅ .env.local already exists"
fi

# Build project
echo ""
echo "🏗️  Building project..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎉 Gyandeep is ready to run!"
echo ""
echo "To start the server, run:"
echo "  npm start"
echo ""
echo "Then visit: http://localhost:3000"
echo ""
