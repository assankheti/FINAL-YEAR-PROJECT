# 🚀 Running Assan Kheti - Local Development Setup

## Quick Start (Separate Terminals)

### Prerequisites
- Python 3.11+ (for backend)
- Node.js 18+ & npm (for frontend)
- MongoDB 6.0 running locally or via Docker
- `.env` file configured in project root

---

## ✅ Setup Complete!

Your project has been set up with:
- ✅ Backend virtual environment created
- ✅ Backend dependencies installed (`requirements.txt`)
- ✅ Frontend dependencies installed (`npm install`)
- ✅ Helper scripts created (`RUN_BACKEND.sh`, `RUN_FRONTEND.sh`)

---

## 🔧 Running the Project

### Option 1: Using Shell Scripts (Recommended)

#### Terminal 1 - Backend:
```bash
./RUN_BACKEND.sh
```

#### Terminal 2 - Frontend:
```bash
./RUN_FRONTEND.sh
```

---

### Option 2: Manual Commands

#### Terminal 1 - Backend (FastAPI):
```bash
cd app-assankheti-backend
source venv/bin/activate
uvicorn src.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

#### Terminal 2 - Frontend (Expo):
```bash
cd app-assankheti-frontend
npm start
```

Expected output:
```
Expo Go requires a project ID to be set...
› Expo Go app...
› Web: http://localhost:8081
```

---

## 📋 Services Running

Once both servers are started, you'll have:

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Backend (FastAPI)** | 8000 | http://localhost:8000 | API server |
| **API Docs** | 8000 | http://localhost:8000/docs | Swagger UI |
| **Frontend (Expo)** | 8081 | http://localhost:8081 | Web app |
| **MongoDB** | 27017 | localhost:27017 | Database (if running) |

---

## 🗄️ Starting MongoDB (If Not Running)

### Option A: Docker (Recommended)
```bash
docker run -d -p 27017:27017 --name mongodb mongo:6.0
```

### Option B: Homebrew (macOS)
```bash
brew services start mongodb-community
```

### Option C: Manual (if installed locally)
```bash
mongod
```

---

## 📝 Environment Configuration

### Backend Configuration (`.env`)

Key variables for backend:
```dotenv
BACKEND_PORT=8000
MONGODB_LOCAL=mongodb://localhost:27017
MONGO_DB_NAME=dbasssankheti
STYTCH_PROJECT_ID=your_project_id
STYTCH_SECRET=your_secret
API_URL=http://192.168.1.25:8000
```

### Frontend Configuration (`.env`)

Key variables for frontend (read from `app.config.js`):
```dotenv
API_URL=http://192.168.1.25:8000
```

**Note**: Update `API_URL` in `.env` if you're running on a different machine/network.

---

## 🔗 API Testing

### Health Check
```bash
curl http://localhost:8000/health/db
```

Expected response:
```json
{
  "status": "ok",
  "database": "reachable"
}
```

### Send OTP (Test)
```bash
curl -X POST http://localhost:8000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+15005550006"}'
```

### View API Documentation
Open browser: **http://localhost:8000/docs**

---

## 🐛 Troubleshooting

### Backend Issues

**1. Port 8000 already in use:**
```bash
# Find process on port 8000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different port
uvicorn src.app.main:app --port 8001
```

**2. MongoDB connection error:**
```
pymongo.errors.ServerSelectionTimeoutError
```
Solution: Make sure MongoDB is running
```bash
docker run -d -p 27017:27017 mongo:6.0
```

**3. Virtual environment not activating:**
```bash
# Ensure you're in correct directory
cd app-assankheti-backend

# Try full path
source /Users/yaqoob/Desktop/FINAL-YEAR-PROJECT/app-assankheti-backend/venv/bin/activate
```

---

### Frontend Issues

**1. Port 8081 already in use:**
```bash
# Kill process on port 8081
lsof -i :8081
kill -9 <PID>
```

**2. npm modules not found:**
```bash
cd app-assankheti-frontend
rm -rf node_modules package-lock.json
npm install
```

**3. Expo connection issues:**
- Check that backend API URL is correct in `.env`
- For local testing, use `http://localhost:8000`
- For network testing, use `http://192.168.1.25:8000` (adjust IP)

---

## 📊 Development Workflow

### Making Changes

**Backend:**
- Edit files in `app-assankheti-backend/src/app/`
- Server automatically reloads with `--reload` flag
- Check FastAPI docs at http://localhost:8000/docs

**Frontend:**
- Edit files in `app-assankheti-frontend/app/`
- Hot reload works automatically
- Refresh browser to see changes

### Testing API Endpoints

Use any of these tools:
- **Swagger UI**: http://localhost:8000/docs
- **cURL**: `curl http://localhost:8000/api/v1/...`
- **Postman**: Import from Swagger docs
- **Thunder Client (VS Code)**: Built-in client

---

## 🔄 Working with Both Terminals Simultaneously

### Terminal Window Setup (macOS)

#### Setup 1: Side-by-side
1. Open 2 new terminal windows
2. Arrange side by side
3. Run backend in one, frontend in other
4. Switch between with ⌘+Tab

#### Setup 2: tmux (Advanced)
```bash
# Start tmux session
tmux new-session -d -s assan

# Create backend pane
tmux new-window -t assan -n backend
tmux send-keys -t assan:backend "./RUN_BACKEND.sh" Enter

# Create frontend pane
tmux new-window -t assan -n frontend
tmux send-keys -t assan:frontend "./RUN_FRONTEND.sh" Enter

# Attach to session
tmux attach -t assan
```

---

## 📈 Monitoring

### Backend Logs
- Watch terminal for FastAPI startup messages
- Check `INFO` logs for requests
- Look for `ERROR` or `WARNING` messages

### Frontend Logs
- Check browser console (F12)
- Watch terminal for Expo messages
- Network tab for API calls

### Database Logs
```bash
# Check MongoDB connection
mongo --eval "db.adminCommand('ping')"
```

---

## ✨ Next Steps

1. **Test OTP Flow**: Visit login page and test phone authentication
2. **Test Disease Detection**: Upload a rice leaf image
3. **Test Budget Calculator**: Calculate farm budget
4. **Check API Docs**: Explore all endpoints at `/docs`
5. **Monitor Requests**: Watch terminal logs for API calls

---

## 📞 Quick Commands Reference

```bash
# Start backend with specific port
uvicorn src.app.main:app --port 8001 --reload

# Start frontend without browser
npm start -- --no-open

# Stop all servers
pkill -f uvicorn
pkill -f expo

# Check Python version
python --version

# Check Node version
node --version

# Verify MongoDB
mongosh

# View active ports
lsof -i -P -n | grep LISTEN
```

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────┐
│         macOS Development Setup         │
├─────────────────────────────────────────┤
│                                         │
│  Terminal 1           Terminal 2        │
│  ┌─────────────┐      ┌──────────────┐ │
│  │  Backend    │      │  Frontend    │ │
│  │  (FastAPI)  │      │  (Expo)      │ │
│  │  :8000      │◄────►│  :8081       │ │
│  │  +reload    │      │  +hot reload │ │
│  └─────────────┘      └──────────────┘ │
│         │                    │          │
│         └────────┬───────────┘          │
│                  │                      │
│           ┌──────▼──────┐              │
│           │  MongoDB    │              │
│           │  :27017     │              │
│           └─────────────┘              │
└─────────────────────────────────────────┘
```

---

## 📚 Documentation Links

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Expo Router Docs](https://expo.dev/router)
- [Motor (Async MongoDB)](https://motor.readthedocs.io/)
- [Uvicorn Docs](https://www.uvicorn.org/)

---

**Last Updated**: April 3, 2026
**Status**: Ready for Development ✅
