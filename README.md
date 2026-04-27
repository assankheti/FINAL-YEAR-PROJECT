# Assan Kheti - Smart Agriculture Assistant

Assan Kheti is a mobile-first smart farming platform built for farmers in Pakistan.
It combines AI assistance, crop disease detection, smart budgeting, market prices, and farmer workflows in one app.

This repository is a full-stack monorepo:
- `app-assankheti-frontend`: React Native (Expo) mobile app
- `app-assankheti-backend`: FastAPI + MongoDB backend APIs

---

## 1. What This Project Does

Assan Kheti helps farmers with practical, daily decisions:

- Crop disease detection (image upload/camera)
- AI farming chatbot (English, Urdu, Roman Urdu)
- Smart budget calculator (seed/fertilizer/pesticide/cost/profit)
- Market price support (fertilizer, pesticide, seed, crop)
- Crop recommendation support
- Device onboarding + language + character selection
- OTP authentication with Stytch
- Farmer dashboard, alerts, and marketplace-oriented UI flows

---

## 2. Core Features

### 2.1 AI Chatbot (Farming-Only Guardrails)

Backend chatbot endpoint is implemented at:
- `app-assankheti-backend/src/app/api/v1/endpoints/chatbot.py`

Behavior highlights:
- Responds only to farming/agriculture and Assan Kheti topics
- Polite refusal for out-of-scope prompts (politics, coding, movies, etc.)
- Supports English, Urdu, and Roman Urdu style
- Uses recent session history for follow-up questions
- Blocks unsafe pesticide/fertilizer overdose requests
- "Greet once per session" logic for greeting-only messages
- Saves and retrieves session/message history from MongoDB

### 2.2 Disease Detection

Backend endpoint:
- `POST /api/v1/disease/predict_disease`

Flow:
- User uploads crop leaf image
- API tries online model first (Roboflow)
- Falls back to offline local model path when available
- Stores latest scan by `mobile_id`

### 2.3 Smart Agriculture Calculators

Implemented at:
- `app-assankheti-backend/src/app/api/v1/endpoints/calculator.py`

Includes:
- Fertilizer calculator
- Pesticide calculator
- Irrigation calculator
- Budget estimator
- Price endpoints

### 2.4 Mobile Device Identity and Settings

Implemented at:
- `app-assankheti-backend/src/app/api/v1/endpoints/deviceSettings.py`

Supports:
- Mobile ID bootstrap
- Terms acceptance
- Language/voice settings
- Character selection
- Crop selection

---

## 3. Tech Stack

### Frontend
- React Native
- Expo SDK 54
- Expo Router
- TypeScript
- AsyncStorage
- Expo Image Picker, Expo Location, Expo Linear Gradient

### Backend
- FastAPI
- Python 3.11
- Uvicorn
- Motor + PyMongo
- MongoDB
- Stytch OTP
- OpenAI SDK (chat completion)
- TensorFlow (optional runtime fallback path)

### DevOps
- Docker + Docker Compose

---

## 4. Repository Structure

```text
FINAL-YEAR-PROJECT/
├── README.md
├── docker-compose.yml
├── app-assankheti-backend/
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── src/app/
│   │   ├── main.py
│   │   ├── api/v1/endpoints/
│   │   │   ├── auth.py
│   │   │   ├── chatbot.py
│   │   │   ├── calculator.py
│   │   │   ├── deviceSettings.py
│   │   │   ├── disease_api.py
│   │   │   ├── fertilizer_api.py
│   │   │   ├── pesticide_api.py
│   │   │   └── seed_api.py
│   │   ├── db/db_connection.py
│   │   ├── models/collections.py
│   │   └── services/
│   └── tests/test_chatbot.py
└── app-assankheti-frontend/
    ├── app/
    │   ├── _layout.tsx
    │   ├── farmer-dashboard.tsx
    │   ├── disease-detection.tsx
    │   ├── smart-budget.tsx
    │   ├── crop-recommendations.tsx
    │   └── ...
    ├── components/
    │   └── farmer-dashboard.tsx
    ├── config/env.ts
    ├── app.config.js
    └── package.json
```

---

## 5. API Overview

Base URL (local):
- `http://localhost:8000`

Swagger docs:
- `http://localhost:8000/docs`

Health check:
- `GET /health/db`

### Authentication
- `POST /api/v1/auth/send-otp/`
- `POST /api/v1/auth/verify-otp/`

### Device / User Settings
- `POST /api/v1/user/generate/mobileid`
- `POST /api/v1/user/accept-terms/`
- `POST /api/v1/user/language-voice/`
- `GET /api/v1/user/language-voice/{mobile_id}`
- `POST /api/v1/user/character/`
- `POST /api/v1/user/devicesetting/{mobile_id}`
- `POST /api/v1/user/crop-selection/{mobile_id}`

### Disease
- `POST /api/v1/disease/predict_disease`
- `GET /api/v1/disease/last-scan/{mobile_id}`
- `GET /api/v1/disease/model_status`

### Calculator + Prices
- `POST /api/v1/calculator/fertilizer`
- `POST /api/v1/calculator/pesticide`
- `POST /api/v1/calculator/irrigation`
- `POST /api/v1/calculator/budget`
- `GET /api/v1/calculator/prices/fertilizer`
- `GET /api/v1/calculator/prices/pesticide`
- `GET /api/v1/calculator/prices/seed`
- `GET /api/v1/calculator/prices/crop`

### Chatbot
- `POST /api/v1/chatbot/chat`
- `GET /api/v1/chatbot/sessions/{mobile_id}`
- `GET /api/v1/chatbot/history/{mobile_id}/{session_id}`
- `GET /api/v1/chatbot/history/{mobile_id}`
- `DELETE /api/v1/chatbot/session/{mobile_id}/{session_id}`
- `DELETE /api/v1/chatbot/history/{mobile_id}`

### Scraped Data APIs
- `POST /api/v1/fertilizer/scrape-and-store`
- `GET /api/v1/fertilizer/all`
- `GET /api/v1/fertilizer/search`
- `POST /api/v1/pesticide/scrape-and-store`
- `GET /api/v1/pesticide/all`
- `GET /api/v1/pesticide/search`
- `POST /api/v1/seed/scrape-and-store`
- `GET /api/v1/seed/all`
- `GET /api/v1/seed/search`

---

## 6. Database Collections

Defined in:
- `app-assankheti-backend/src/app/models/collections.py`

Main collections:
- `mobile_devices`
- `terms_settings`
- `language_settings`
- `character_settings`
- `user_settings`
- `crop_selections`
- `auth_credentials`
- `disease_scans`
- `fertilizers`
- `pesticides`
- `seeds`
- `crop_prices`
- `chat_messages`
- `chat_sessions` (used by chatbot endpoint)

---

## 7. Environment Variables

Create a root `.env` file (same level as `docker-compose.yml`) for Docker/local coordination.

Recommended variables:

```env
# Ports
BACKEND_PORT=8000
FRONTEND_PORT=8081
MONGO_PORT=27017

# Database
MONGO_DB_NAME=dbasssankheti
MONGODB_LOCAL=mongodb://localhost:27017

# Stytch OTP
STYTCH_PROJECT_ID=your_stytch_project_id
STYTCH_SECRET=your_stytch_secret
STYTCH_ENV=test

# Chatbot
OPENAI_API_KEY=your_openai_key
OPENAI_CHAT_MODEL=gpt-3.5-turbo

# Frontend API (for Expo)
# Use your machine LAN IP for physical Android device testing
API_URL=http://192.168.x.x:8000
```

Notes:
- In Docker backend service, compose overrides DB host to `mongodb://mongo:27017`.
- Frontend auto-detects host in `app-assankheti-frontend/config/env.ts` when possible.

---

## 8. Run with Docker (Recommended)

From project root:

```bash
docker compose up --build
```

Services:
- Backend: `http://localhost:8000`
- Frontend (web/dev): `http://localhost:8081`
- MongoDB: `localhost:27017`

Stop:

```bash
docker compose down
```

Remove volumes too:

```bash
docker compose down -v
```

---

## 9. Run Locally (Without Docker)

### 9.1 Backend

```bash
cd app-assankheti-backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Optional for tests
pip install pytest pytest-asyncio httpx

PYTHONPATH=src uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 9.2 Frontend

```bash
cd app-assankheti-frontend
npm install
npm run start
```

For Android:

```bash
npm run android
```

For iOS:

```bash
npm run ios
```

---

## 10. Testing and Quality Commands

### Backend chatbot tests

```bash
cd app-assankheti-backend
python -m pytest tests/test_chatbot.py -q
```

### Frontend lint

```bash
cd app-assankheti-frontend
npm run lint
```

---

## 11. Chatbot Session and History Behavior

Current design:
- Every chat is tied to a `mobile_id`
- Sessions are grouped by `session_id`
- User and assistant messages are both saved with `created_at`
- Session list is fetched from `/chatbot/sessions/{mobile_id}`
- Session messages are fetched from `/chatbot/history/{mobile_id}/{session_id}`

Expected UI behavior:
- Active chat shows current session messages
- Chat history modal should show all saved sessions
- Selecting a session should load chronological messages
- Empty history should show a friendly empty-state message

---

## 12. Troubleshooting

### 12.1 `TypeError: Network request failed` (Frontend)

Usually caused by API URL/network mismatch.

Checklist:
- Backend running and reachable on your machine
- Phone and dev machine on same Wi-Fi
- `API_URL` points to LAN IP (not localhost) for physical device
- Android cleartext is enabled (already configured)
- Firewall not blocking port `8000`

Quick check from browser on phone:
- `http://<your-lan-ip>:8000/docs`

### 12.2 `mongo:27017 nodename nor servname provided`

You are likely running backend locally but using Docker host name `mongo`.

Fix:
- Set `MONGODB_LOCAL=mongodb://localhost:27017` for local backend runs
- Keep `mongodb://mongo:27017` only inside Docker service network

### 12.3 TensorFlow import / dylib issues on macOS

If TensorFlow fails to load:
- Use Docker for a stable environment
- Or reinstall compatible TensorFlow build for your OS/CPU
- Disease endpoint still has safe fallback behavior if offline model is unavailable

### 12.4 Chatbot returns 500/Internal Server Error

Check:
- Backend logs for traceback
- MongoDB connectivity
- Missing env keys (`OPENAI_API_KEY`, Stytch config)
- Request body shape:
  - `message` (string)
  - `mobile_id` (string)
  - `session_id` (optional string)

---

## 13. Security Notes

- Do not commit `.env` files or secret keys
- Rotate any accidentally exposed API keys
- Chatbot guardrails should prevent disclosure of internal prompts and secrets
- Restrict CORS in production (currently wide open for development convenience)

---

## 14. Deployment Notes

Before production:
- Set strict CORS origins
- Use HTTPS and secure reverse proxy
- Move hardcoded model secrets to environment variables
- Add rate limiting and request logging controls
- Add CI for tests and linting

---

## 15. Contributing

1. Create a feature branch
2. Make focused changes
3. Run tests/lint
4. Open a pull request with clear screenshots/logs for UI or API changes

---

## 16. Contact and Ownership

Project: Assan Kheti - Final Year Project
Primary focus: practical AI-assisted farming support for Pakistan

If you want, I can also generate:
- A clean `README` for backend only
- A clean `README` for frontend only
- API request/response examples for every endpoint
- A full `CONTRIBUTING.md` and `SECURITY.md`
