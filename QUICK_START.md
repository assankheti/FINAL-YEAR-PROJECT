# 🎯 QUICK START GUIDE

## ✅ Setup Complete!

All environments are now configured and ready to run.

---

## 🚀 Ready to Go!

### Step 1: Start MongoDB
✅ **Already Running** on `localhost:27017`

Container: `assan-kheti-mongo`

To verify:
```bash
mongosh --eval "db.adminCommand('ping')"
```

---

### Step 2: Start Backend (Terminal 1)

Open a new terminal and run:

```bash
cd /Users/yaqoob/Desktop/FINAL-YEAR-PROJECT
./RUN_BACKEND.sh
```

**Or manually:**
```bash
cd app-assankheti-backend
source venv/bin/activate
uvicorn src.app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

**Access:**
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health/db

---

### Step 3: Start Frontend (Terminal 2)

Open another new terminal and run:

```bash
cd /Users/yaqoob/Desktop/FINAL-YEAR-PROJECT
./RUN_FRONTEND.sh
```

**Or manually:**
```bash
cd app-assankheti-frontend
npm start
```

**Expected Output:**
```
Expo Go requires a project ID...
To continue press w (open in web)
```

Press `w` to open in browser at `http://localhost:8081`

---

## 📋 What Was Installed

### Backend
✅ Python Virtual Environment: `app-assankheti-backend/venv/`
✅ All Python Dependencies:
- FastAPI 0.135.3
- Uvicorn 0.42.0
- Motor 3.7.1 (Async MongoDB)
- TensorFlow 2.19.0
- Stytch 14.3.0
- BeautifulSoup4 4.14.3
- And 30+ more packages

### Frontend
✅ Node Modules: `app-assankheti-frontend/node_modules/`
✅ All npm Dependencies:
- React 19.1.0
- React Native 0.81.5
- Expo 54.0.27
- Expo Router 6.0.17
- TypeScript 5.9.2
- And 918 more packages

### Database
✅ MongoDB 6.0 running in Docker container

### Helper Scripts
✅ `RUN_BACKEND.sh` - Start backend server
✅ `RUN_FRONTEND.sh` - Start frontend server

---

## 📊 System Overview

```
You (macOS)
│
├─── Terminal 1 ──► FastAPI Backend
│                   Port 8000
│                   ├─ /api/v1/auth
│                   ├─ /api/v1/disease
│                   ├─ /api/v1/calculator
│                   └─ /docs (Swagger)
│
├─── Terminal 2 ──► Expo Frontend
│                   Port 8081
│                   └─ http://localhost:8081
│
└─── MongoDB ──────► Database
                     Port 27017
                     Database: dbasssankheti
```

---

## 🔗 Useful URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Backend API | http://localhost:8000 | Main API endpoint |
| API Documentation | http://localhost:8000/docs | Swagger UI |
| Health Check | http://localhost:8000/health/db | DB connectivity |
| Frontend App | http://localhost:8081 | Web application |
| MongoDB | mongodb://localhost:27017 | Database |

---

## ⚡ Quick Commands

### Backend Commands

```bash
# Start backend
./RUN_BACKEND.sh

# Manual start
cd app-assankheti-backend
source venv/bin/activate
uvicorn src.app.main:app --reload

# Start on different port
uvicorn src.app.main:app --port 8001 --reload

# Check venv is active
which python
```

### Frontend Commands

```bash
# Start frontend
./RUN_FRONTEND.sh

# Manual start
cd app-assankheti-frontend
npm start

# Start without opening browser
npm start -- --no-open

# Reinstall dependencies
npm install
```

### Database Commands

```bash
# Check MongoDB status
mongosh --eval "db.adminCommand('ping')"

# View databases
mongosh --eval "db.adminCommand('listDatabases')"

# Connect to Assan Kheti database
mongosh dbasssankheti

# View all collections
mongosh dbasssankheti --eval "db.getCollectionNames()"
```

---

## 🔍 Verifying Everything Works

### 1. Test Backend API

```bash
curl http://localhost:8000/

# Expected response:
{
  "message": "Welcome to the Assan Kheti Backend API!",
  "version": "0.1.0",
  "docs": "/docs"
}
```

### 2. Test Database Connection

```bash
curl http://localhost:8000/health/db

# Expected response:
{
  "status": "ok",
  "database": "reachable"
}
```

### 3. Test OTP Endpoint

```bash
curl -X POST http://localhost:8000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+15005550006"}'
```

### 4. Test Frontend

Open browser at: http://localhost:8081

You should see the Assan Kheti splash screen loading.

---

## 🐛 If Something Doesn't Work

### Backend won't start

1. **Check Python venv:**
   ```bash
   cd app-assankheti-backend
   source venv/bin/activate
   python --version
   ```

2. **Port 8000 in use:**
   ```bash
   lsof -i :8000
   kill -9 <PID>
   ```

3. **MongoDB not connected:**
   ```bash
   docker ps  # Check container
   mongosh    # Test connection
   ```

### Frontend won't start

1. **Clear node modules:**
   ```bash
   cd app-assankheti-frontend
   rm -rf node_modules
   npm install
   ```

2. **Port 8081 in use:**
   ```bash
   lsof -i :8081
   kill -9 <PID>
   ```

### MongoDB issues

1. **Container stopped:**
   ```bash
   docker start assan-kheti-mongo
   ```

2. **Can't connect:**
   ```bash
   docker ps  # Verify running
   docker logs assan-kheti-mongo
   ```

---

## 📚 File Locations

```
/Users/yaqoob/Desktop/FINAL-YEAR-PROJECT/
│
├── RUN_BACKEND.sh                 ← Backend startup script
├── RUN_FRONTEND.sh                ← Frontend startup script
├── DEVELOPMENT_SETUP.md           ← Detailed setup guide
├── QUICK_START.md                 ← This file
│
├── app-assankheti-backend/
│   ├── venv/                      ← Python virtual environment ✅
│   ├── src/app/
│   │   ├── main.py               ← FastAPI entry point
│   │   ├── api/v1/endpoints/     ← API routes
│   │   ├── services/             ← Business logic
│   │   ├── models/               ← Data models
│   │   └── db/                   ← Database config
│   └── requirements.txt
│
├── app-assankheti-frontend/
│   ├── node_modules/             ← Dependencies ✅
│   ├── app/                      ← Routes (Expo Router)
│   ├── components/               ← React components
│   ├── config/                   ← Configuration
│   └── package.json
│
├── .env                          ← Environment variables
├── docker-compose.yml            ← Docker orchestration
└── README.md                     ← Project documentation
```

---

## 🎯 Next Steps

1. **Start Backend**: Run `./RUN_BACKEND.sh` in Terminal 1
2. **Start Frontend**: Run `./RUN_FRONTEND.sh` in Terminal 2
3. **Test APIs**: Visit http://localhost:8000/docs
4. **View Frontend**: Open http://localhost:8081
5. **Develop**: Make changes and watch hot-reload!

---

## 📞 Troubleshooting

For detailed troubleshooting, see: **DEVELOPMENT_SETUP.md**

---

## ✨ You're All Set!

Everything is configured and ready to go. Just run the two commands in separate terminals and you're ready to develop!

**Happy coding! 🎉**
