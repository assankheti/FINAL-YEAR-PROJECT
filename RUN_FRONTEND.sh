#!/bin/bash

# Frontend startup script for Assan Kheti
# This script starts the Expo development server

cd "$(dirname "$0")/app-assankheti-frontend"

echo "🚀 Starting Assan Kheti Frontend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Expo Server URL: http://localhost:8081"
echo "✓ Backend API: http://192.168.1.25:8000 (adjust in .env if needed)"
echo ""
echo "Starting Expo development server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start Expo development server
npm start

