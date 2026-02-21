#!/bin/bash
# Quick deployment checklist for Gyandeep

echo "🚀 Gyandeep Deployment Checklist"
echo "================================"
echo ""

# 1. Environment check
echo "✓ Environment Configuration"
if [ -f ".env" ]; then
    echo "  ✓ .env file exists"
    if grep -q "JWT_SECRET" .env; then
        echo "  ✓ JWT_SECRET is set"
    else
        echo "  ✗ JWT_SECRET is missing"
    fi
    if grep -q "SESSION_SECRET" .env; then
        echo "  ✓ SESSION_SECRET is set"
    else
        echo "  ✗ SESSION_SECRET is missing"
    fi
else
    echo "  ✗ .env file not found. Copy from .env.example"
fi
echo ""

# 2. Dependencies
echo "✓ Dependencies"
if node -v > /dev/null 2>&1; then
    echo "  ✓ Node.js $(node -v)"
else
    echo "  ✗ Node.js not found"
fi
if npm -v > /dev/null 2>&1; then
    echo "  ✓ npm $(npm -v)"
else
    echo "  ✗ npm not found"
fi
if docker --version > /dev/null 2>&1; then
    echo "  ✓ Docker $(docker --version)"
else
    echo "  ℹ Docker not found (optional for containerized deployments)"
fi
echo ""

# 3. Build status
echo "✓ Build Status"
if [ -d "dist" ]; then
    echo "  ✓ Frontend built (dist folder exists)"
else
    echo "  ✗ Frontend not built. Run: npm run build"
fi
echo ""

# 4. Database
echo "✓ Database"
if [ -f "server/data/gyandeep.db" ]; then
    echo "  ✓ SQLite database exists"
    if which sqlite3 > /dev/null 2>&1; then
        USER_COUNT=$(sqlite3 server/data/gyandeep.db "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "error")
        if [ "$USER_COUNT" != "error" ]; then
            echo "  ✓ Database has $USER_COUNT users"
        fi
    fi
else
    echo "  ℹ Database not initialized. Will be created on first run"
fi
echo ""

# 5. Ports
echo "✓ Port Configuration"
echo "  Backend API: 3001"
echo "  WebSocket: 3002"
echo "  Frontend: 5173 (dev) or 80/443 (production)"
echo ""

# 6. Docker Compose
echo "✓ Docker Deployment"
if [ -f "docker-compose.yml" ]; then
    echo "  ✓ docker-compose.yml exists"
else
    echo "  ✗ docker-compose.yml not found"
fi
echo ""

echo "================================"
echo "✓ Deployment checklist complete!"
echo ""
echo "Next steps:"
echo "1. Ensure all ✓ items are green"
echo "2. Run: docker-compose up -d --build (recommended)"
echo "3. Or run: npm start (manual)"
echo "4. Test at http://localhost:3001/api/users"
