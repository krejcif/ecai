#!/bin/bash

# EcommerceIQ - Start All Services
# This script starts both the API server and the Dashboard server

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 Starting EcommerceIQ Platform"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 18.0.0"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Set environment variables
export API_PORT=${API_PORT:-3000}
export DASHBOARD_PORT=${DASHBOARD_PORT:-3001}
export NODE_ENV=${NODE_ENV:-development}

echo "🔧 Configuration:"
echo "  API Server:       http://localhost:$API_PORT"
echo "  Dashboard:        http://localhost:$DASHBOARD_PORT"
echo "  Environment:      $NODE_ENV"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo "🚀 Starting services..."
echo ""

# Start API server in background
echo "  Starting API server on port $API_PORT..."
npm run dev &
API_PID=$!

# Wait a bit for API to start
sleep 3

# Start Dashboard server in background
echo "  Starting Dashboard on port $DASHBOARD_PORT..."
npm run dashboard:dev &
DASHBOARD_PID=$!

# Wait a bit for Dashboard to start
sleep 2

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ All services running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  📊 Dashboard:     http://localhost:$DASHBOARD_PORT"
echo "  🔌 API:           http://localhost:$API_PORT"
echo "  📚 API Docs:      http://localhost:$API_PORT/api/docs"
echo ""
echo "  Press Ctrl+C to stop all services"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Wait for all background jobs
wait
