#!/bin/bash

# Backend startup script for Assan Kheti
# This script activates the virtual environment and starts the FastAPI server

BACKEND_DIR="$(dirname "$0")/app-assankheti-backend"
PROJECT_DIR="$(dirname "$0")"

# Load environment variables FIRST before changing directory
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(cat "$PROJECT_DIR/.env" | grep -v '^#' | grep -v '^$' | xargs)
fi

cd "$BACKEND_DIR"

echo "🚀 Starting Assan Kheti Backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Activate virtual environment
source venv/bin/activate

echo "✓ Virtual environment activated"
echo "✓ Python: $(python --version)"
echo "✓ API URL: http://localhost:8000"
echo "✓ Docs URL: http://localhost:8000/docs"
echo "✓ Stytch Project: $(echo $STYTCH_PROJECT_ID | cut -d- -f1-2)"
echo ""
echo "Starting FastAPI server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Set PYTHONPATH to src directory for proper module imports
export PYTHONPATH="${PWD}/src:$PYTHONPATH"

# Start Uvicorn server with reload enabled for development
uvicorn src.app.main:app --host 0.0.0.0 --port 8000 --reload

