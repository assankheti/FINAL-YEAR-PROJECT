# 🌾 Assan Kheti — Smart Agriculture Platform

> **Empowering Pakistani farmers** with AI-powered crop disease detection, smart budget calculators, live market prices, and a seamless marketplace — all in one app.

<p align="center">
  <img src="app-assankheti-frontend/assets/images/logo-removebg.png" alt="Assan Kheti Logo" width="150" />
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Start with Docker](#quick-start-with-docker)
  - [Manual Setup (Without Docker)](#manual-setup-without-docker)
- [Environment Variables](#-environment-variables)
- [Backend API](#-backend-api)
- [Frontend Screens](#-frontend-screens)
- [Docker & Volumes](#-docker--volumes)
- [Contributing](#-contributing)

---

## 🌟 Overview

**Assan Kheti** (آسان کھیتی — Easy Farming) is a full-stack agriculture platform built for Pakistani farmers. It provides:

- 🔐 **Phone-based OTP Authentication** via Stytch
- 🌿 **AI-Powered Rice Disease Detection** using TensorFlow Lite (BrownSpot, Hispa, LeafBlast, Healthy)
- 📊 **Smart Budget Calculator** — fertilizer, pesticide, irrigation & profit estimation
- 💰 **Live Market Prices** — scraped in real-time for fertilizers, pesticides, seeds & crops
- 🛒 **Marketplace** — farmers list products, buyers browse & order
- 💬 **In-App Chat & Calling** — buyer-seller communication
- 🌐 **Bilingual Support** — English & Urdu (text + voice)

---

## 🛠 Tech Stack

| Layer        | Technology                                                    |
| ------------ | ------------------------------------------------------------- |
| **Frontend** | React Native (Expo SDK 54) · Expo Router · TypeScript         |
| **Backend**  | FastAPI · Python 3.11 · Uvicorn (ASGI)                        |
| **Database** | MongoDB 6.0 · Motor (async driver)                            |
| **Auth**     | Stytch (Phone OTP) · JWT (PyJWT)                              |
| **ML/AI**    | TensorFlow Lite · Pillow (image processing)                   |
| **Scraping** | BeautifulSoup4 · Requests                                     |
| **DevOps**   | Docker · Docker Compose · Named Volumes                       |

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Docker Compose                    │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │  Frontend    │  │  Backend    │  │  MongoDB 6.0 │ │
│  │  (Expo Web)  │  │  (FastAPI)  │  │              │ │
│  │  Port: 8081  │─▶│  Port: 8000 │─▶│  Port: 27017 │ │
│  └─────────────┘  └─────────────┘  └──────────────┘ │
│        │                 │                │          │
│   frontend_data     backend_data      mongo_data     │
│   (independent)     (independent)    (independent)   │
└──────────────────────────────────────────────────────┘
```

- All services communicate over a shared **bridge network** (`assan-kheti-net`)
- Each service has its own **independent Docker volume**
- The browser (frontend) calls the backend via `http://localhost:8000`

---

## 📁 Project Structure

```
FYP/
├── .env                          # All credentials (not committed)
├── .env.example                  # Template for .env
├── .gitignore                    # Ignores .env files
├── docker-compose.yml            # Orchestrates all services
│
├── app-assankheti-backend/       # 🐍 FastAPI Backend
│   ├── DockerfileBackend
│   ├── requirements.txt
│   └── src/app/
│       ├── main.py               # FastAPI app entry point
│       ├── api/v1/endpoints/
│       │   ├── auth.py           # OTP send & verify
│       │   ├── deviceSettings.py # Onboarding & user settings
│       │   ├── calculator.py     # Smart agriculture calculators
│       │   └── disease_api.py    # Rice disease detection
│       ├── db/
│       │   └── db_connection.py  # MongoDB connection (Motor)
│       ├── models/
│       │   └── collections.py    # Collection name constants
│       ├── services/
│       │   ├── stytch_client.py  # Stytch SDK wrapper
│       │   ├── security.py       # JWT create/verify
│       │   ├── disease_service.py# TFLite inference
│       │   ├── calculators/      # Fertilizer, pesticide, irrigation, budget
│       │   └── scrapers/         # Live market price scrapers
│       ├── data/
│       │   └── rice_disease_model.tflite
│       └── utils/
│           └── logger.py
│
├── app-assankheti-frontend/      # 📱 Expo / React Native Frontend
│   ├── DockerfileFrontend
│   ├── package.json
│   ├── app.config.js             # Expo config (reads .env)
│   ├── config/
│   │   └── env.ts                # Centralized API_BASE export
│   ├── app/                      # Expo Router screens
│   │   ├── _layout.tsx           # Root stack layout
│   │   ├── index.tsx             # Entry → redirects to splash
│   │   ├── splash.tsx            # Splash + device bootstrap
│   │   ├── terms-and-conditions.tsx
│   │   ├── language-selection.tsx
│   │   ├── user-type-selection.tsx
│   │   ├── crop-selection.tsx
│   │   ├── login.tsx             # Phone number input
│   │   ├── verify-otp.tsx        # OTP verification
│   │   ├── farmer-dashboard.tsx
│   │   ├── farmer-products.tsx
│   │   ├── farmer-orders.tsx
│   │   ├── disease-detection.tsx
│   │   ├── smart-budget.tsx
│   │   ├── crop-recommendations.tsx
│   │   └── ... (30 screens total)
│   ├── components/               # Reusable UI components
│   ├── contexts/
│   │   └── LanguageContext.tsx    # i18n (English/Urdu)
│   ├── hooks/                    # Custom hooks
│   ├── lib/
│   │   └── deviceId.ts           # Mobile ID generation
│   └── constants/
│       └── theme.ts              # Color & typography tokens
```

---

## 🚀 Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v4.0+)
- [Git](https://git-scm.com/)
- _(Optional for local dev)_ Node.js 20+, Python 3.11+

### Quick Start with Docker

**1. Clone the repositories**

```bash
mkdir FYP && cd FYP
git clone https://github.com/assankheti/app-assankheti-backend.git
git clone https://github.com/assankheti/app-assankheti-frontend.git
```

**2. Create the `.env` file**

```bash
cp .env.example .env
# Edit .env with your credentials
```

**3. Start all services**

```bash
docker compose up --build
```

**4. Access the app**

| Service        | URL                          |
| -------------- | ---------------------------- |
| Frontend       | http://localhost:8081         |
| Backend API    | http://localhost:8000         |
| API Docs       | http://localhost:8000/docs    |
| Health Check   | http://localhost:8000/health/db |
| MongoDB        | localhost:27017               |

**5. Stop all services**

```bash
docker compose down
```

**6. Stop and remove all data (volumes)**

```bash
docker compose down -v
```

### Manual Setup (Without Docker)

<details>
<summary><strong>Backend</strong></summary>

```bash
cd app-assankheti-backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp ../.env .env

# Start MongoDB locally (must be running on port 27017)

# Run the server
PYTHONPATH=src uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

</details>

<details>
<summary><strong>Frontend</strong></summary>

```bash
cd app-assankheti-frontend

# Install dependencies
npm install

# Create .env
echo "API_URL=http://localhost:8000" > .env

# Start Expo dev server
npx expo start --web
```

</details>

<details>
<summary><strong>MongoDB</strong></summary>

```bash
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0

# Verify
mongosh --eval "db.runCommand({ ping: 1 })"
```

</details>

---

## 🔐 Environment Variables

All credentials are stored in a **single `.env` file** at the project root. Docker Compose reads this file and injects variables into each service.

| Variable                      | Service   | Description                        |
| ----------------------------- | --------- | ---------------------------------- |
| `BACKEND_PORT`                | Backend   | Backend server port (default: 8000)|
| `MONGO_HOST`                  | MongoDB   | MongoDB hostname                   |
| `MONGO_PORT`                  | MongoDB   | MongoDB port (default: 27017)      |
| `MONGODB_LOCAL`               | Backend   | MongoDB connection string          |
| `MONGO_DB_NAME`               | Backend   | Database name                      |
| `APP_NAME`                    | Backend   | Application name                   |
| `SECRET_KEY`                  | Backend   | JWT signing secret                 |
| `ALGORITHM`                   | Backend   | JWT algorithm (HS256)              |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Backend   | JWT token TTL                      |
| `ADMIN_EMAIL`                 | Backend   | Admin contact email                |
| `STYTCH_PROJECT_ID`           | Backend   | Stytch project ID                  |
| `STYTCH_SECRET`               | Backend   | Stytch API secret                  |
| `STYTCH_ENVIRONMENT`          | Backend   | Stytch environment (test/live)     |
| `STYTCH_PROJECT_DOMAIN`       | Backend   | Stytch project domain URL          |
| `STYTCH_PROJECT_SLUG`         | Backend   | Stytch project slug                |
| `FRONTEND_PORT`               | Frontend  | Frontend server port (default: 8081)|
| `API_URL`                     | Frontend  | Backend API base URL               |

---

## 📡 Backend API

Base URL: `http://localhost:8000`

### Authentication (`/api/v1/auth`)

| Method | Endpoint          | Description                                    |
| ------ | ----------------- | ---------------------------------------------- |
| POST   | `/send-otp/`      | Send OTP to phone number via Stytch SMS        |
| POST   | `/verify-otp/`    | Verify OTP code, returns JWT access token      |

### Device Settings (`/api/v1/user`)

| Method | Endpoint                            | Description                              |
| ------ | ----------------------------------- | ---------------------------------------- |
| POST   | `/generate/mobileid`                | Bootstrap device, generate mobile_id     |
| POST   | `/accept-terms/`                    | Save terms & conditions acceptance       |
| POST   | `/language-voice/`                  | Save language & voice preference         |
| GET    | `/language-voice/{mobile_id}`       | Get saved language/voice settings        |
| POST   | `/character/`                       | Save user type (farmer/user/businessman) |
| POST   | `/devicesetting/{mobile_id}`        | Finalize all onboarding settings         |
| POST   | `/crop-selection/{mobile_id}`       | Save selected crops                      |

### Smart Agriculture Calculator (`/api/v1/calculator`)

| Method | Endpoint              | Description                                    |
| ------ | --------------------- | ---------------------------------------------- |
| POST   | `/fertilizer`         | Calculate fertilizer requirements              |
| POST   | `/pesticide`          | Calculate pesticide requirements               |
| POST   | `/irrigation`         | Calculate irrigation needs                     |
| POST   | `/budget`             | Full budget (seed + fertilizer + pesticide + yield + profit) |
| GET    | `/prices/fertilizer`  | Scrape live fertilizer market prices           |
| GET    | `/prices/pesticide`   | Scrape live pesticide market prices            |
| GET    | `/prices/seed`        | Scrape live seed market prices                 |
| GET    | `/prices/crop`        | Scrape live crop market prices                 |

### Disease Detection (`/api/v1/disease`)

| Method | Endpoint    | Description                                           |
| ------ | ----------- | ----------------------------------------------------- |
| POST   | `/predict`  | Upload rice leaf image → returns disease classification |

**Supported diseases:** BrownSpot · Hispa · LeafBlast · Healthy

### Health Check

| Method | Endpoint      | Description          |
| ------ | ------------- | -------------------- |
| GET    | `/health/db`  | Ping MongoDB         |
| GET    | `/`           | API welcome message  |

> 📝 **Interactive API docs** available at [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📱 Frontend Screens

### Onboarding Flow

```
Splash → Terms & Conditions → Language Selection → User Type → Crop Selection → Login → OTP Verify
```

| Screen                     | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `splash.tsx`               | Branding splash + device bootstrap               |
| `terms-and-conditions.tsx` | T&C acceptance                                   |
| `language-selection.tsx`   | English / Urdu picker (text + voice)             |
| `user-type-selection.tsx`  | Farmer / Simple User / Businessman               |
| `crop-selection.tsx`       | Select primary crop                              |
| `login.tsx`                | Phone number input → send OTP                    |
| `verify-otp.tsx`           | OTP verification → JWT stored → dashboard        |

### Farmer Dashboard

| Screen                     | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `farmer-dashboard.tsx`     | Main dashboard with tabs                         |
| `farmer-products.tsx`      | Active/sold/draft product listings               |
| `add-product.tsx`          | Add or edit a product (image, price, category)   |
| `farmer-orders.tsx`        | Order management with status filters             |
| `farmer-notifications.tsx` | Weather, price, scheme, pest alerts              |
| `farmer-settings.tsx`      | Toggle preferences, profile actions              |
| `farmer-profile-edit.tsx`  | Edit profile info & photo                        |

### Smart Agriculture Tools

| Screen                      | Description                                      |
| --------------------------- | ------------------------------------------------ |
| `smart-budget.tsx`          | Fertilizer/pesticide/seed/area → budget estimate |
| `crop-recommendations.tsx`  | AI-scored crop suggestions                       |
| `disease-detection.tsx`     | Camera/gallery → disease classification          |

### Marketplace & Communication

| Screen                                | Description                           |
| ------------------------------------- | ------------------------------------- |
| `community-dashboard.tsx`             | Buyer/businessman marketplace         |
| `category-products/[category].tsx`    | Browse products by category           |
| `product-buy/[productId].tsx`         | Product details & order placement     |
| `chat/[contactId].tsx`                | Buyer-seller messaging                |
| `call/[contactId].tsx`                | Voice call UI                         |
| `order-details/[orderId].tsx`         | Order info & status timeline          |

### Info & Settings

| Screen                      | Description                        |
| --------------------------- | ---------------------------------- |
| `privacy-policy.tsx`        | Privacy policy                     |
| `help-center.tsx`           | Searchable help categories         |
| `help-center/faqs.tsx`      | Expandable FAQ items               |
| `help-center/troubleshooting.tsx` | Common issues & solutions    |
| `community-settings.tsx`    | Consumer toggle preferences        |
| `user-notifications.tsx`    | Consumer notifications             |
| `user-orders.tsx`           | Consumer order list                |

---

## 🐳 Docker & Volumes

### Services

| Container               | Image            | Port  | Description              |
| ----------------------- | ---------------- | ----- | ------------------------ |
| `assan-kheti-database`  | `mongo:6.0`      | 27017 | MongoDB database         |
| `backend`               | Python 3.11 slim | 8000  | FastAPI backend          |
| `frontend`              | Node 20 slim     | 8081  | Expo web dev server      |

### Volumes

Each service has its own **independent** named volume:

| Volume                   | Mounted To              | Service  | Purpose                       |
| ------------------------ | ----------------------- | -------- | ----------------------------- |
| `mongo_data`             | `/data/db`              | MongoDB  | Database persistence          |
| `backend_data`           | `/app/shared_data`      | Backend  | Shared files, exports         |
| `frontend_node_modules`  | `/app/node_modules`     | Frontend | Cached npm dependencies       |

### Network

All services are on a single Docker bridge network: `assan-kheti-net`

### Useful Commands

```bash
# Start all services
docker compose up --build

# Start in detached mode (background)
docker compose up --build -d

# View logs
docker compose logs -f              # all services
docker compose logs -f backend      # backend only
docker compose logs -f frontend     # frontend only

# Restart a single service
docker compose restart backend

# Stop all services
docker compose down

# Stop & delete all volumes (reset data)
docker compose down -v

# Enter a running container
docker exec -it backend bash
docker exec -it assan-kheti-database mongosh
```

---

## 🤝 Contributing

1. Create a new branch from `stage`
2. Make your changes
3. Test with `docker compose up --build`
4. Push and open a Pull Request

---

<p align="center">
  Built with ❤️ for Pakistani farmers<br/>
  <strong>Assan Kheti</strong> — آسان کھیتی
</p>
#   F I N A L - Y E A R - P R O J E C T  
 