# ASSAN KHETI — COMPLETE MASTER TECHNICAL AUDIT DOCUMENT

**Version:** 1.0 | **Date:** 2026-05-16 | **Auditor:** Senior Software Architect
**Branch Audited:** `fix/all_features` | **Project:** Final Year Project

---

## 1. EXECUTIVE SUMMARY

### What the Project Does

Assan Kheti ("Easy Farming" in Urdu) is a smart agricultural platform targeting Pakistani farmers and agricultural buyers. It solves the problem of disconnected rural farmers by providing them a single mobile application to:

- Detect crop diseases using AI/ML (TFLite + Roboflow)
- Buy/sell agricultural produce via a structured marketplace
- Calculate fertilizer, pesticide, irrigation, and budget requirements
- Get real-time mandi (market) prices via automated web scraping
- Communicate with buyers/sellers through a real-time Socket.IO chat
- Negotiate prices through an offer/counter-offer system
- Access community groups automatically segmented by crop type
- Get AI chatbot assistance in English and Urdu
- Receive agricultural advisory from an OpenAI-backed bilingual assistant

### Main Technologies

| Layer | Technology |
|---|---|
| Mobile App | React Native 0.81.5 + Expo SDK 53 |
| Navigation | Expo Router 6.0.17 (file-based routing) |
| Real-time | Socket.IO (client + server) |
| Backend | Python FastAPI 0.104 + Uvicorn |
| Database | MongoDB (Motor async driver) |
| Auth | Stytch OTP (phone number) + PyJWT |
| AI/ML | TensorFlow 2.16.2, OpenAI GPT-3.5-turbo, Roboflow |
| Scraping | BeautifulSoup4 (KissanGhar, Punjab Govt) |
| Containers | Docker + Docker Compose |
| Language | English + Urdu (bilingual throughout) |

### Overall Architecture

```
+------------------------------------------------------------------+
|                       ASSAN KHETI SYSTEM                         |
|                                                                  |
|  +------------------+          +----------------------------+   |
|  |  EXPO MOBILE APP |<-------->|   FASTAPI BACKEND          |   |
|  |  React Native    |  REST +  |   + Socket.IO Gateway      |   |
|  |  Expo Router     |  Socket  |   Port 8000                |   |
|  |  Port 8081       |          +------------+---------------+   |
|  +------------------+                       |                   |
|                                             |                   |
|          +----------------------------------+                   |
|          |                                  |                   |
|  +-------+------+  +----------+  +----------+---------------+  |
|  |   MongoDB    |  |  Stytch  |  |  External APIs            |  |
|  |  27017       |  |  OTP SMS |  |  OpenAI GPT-3.5-turbo     |  |
|  |  23 Colls.   |  |  Auth    |  |  Roboflow (Disease AI)    |  |
|  +--------------+  +----------+  |  KissanGhar (Prices)      |  |
|                                  |  Punjab Govt Mandi        |  |
|                                  +---------------------------+  |
+------------------------------------------------------------------+
```

### Current Project Health

| Area | Status | Score |
|---|---|---|
| Core Feature Set | Implemented | 7/10 |
| Authentication | Working | 7/10 |
| Real-time Chat | Working | 8/10 |
| AI Features | Working | 7/10 |
| Security | **Critical Issues** | 2/10 |
| Test Coverage | Minimal | 2/10 |
| Documentation | Sparse | 3/10 |
| Production Readiness | **Not Ready** | 4/10 |

---

## 2. COMPLETE FOLDER STRUCTURE

```
FINAL-YEAR-PROJECT/
|-- docker-compose.yml                    # Orchestrates mongo + backend + frontend
|-- README.md
|-- TECHNICAL_AUDIT.md                    # This document
|
|-- app-assankheti-backend/               # Python FastAPI Backend
|   |-- DockerfileBackend                 # Python 3.11-slim image
|   |-- pyproject.toml                    # Poetry project config
|   |-- requirements.txt                  # 21 pip dependencies
|   |-- .env                              # SECRETS EXPOSED (see section 13)
|   |-- README.md
|   |-- uploads/                          # Static file storage (images)
|   |-- venv/                             # Local virtual environment
|   |-- tests/
|   |   |-- test_chatbot.py               # Chatbot unit tests
|   |   +-- test_community.py             # Community integration tests
|   |-- scripts/
|   |   |-- migrate_community.py          # DB migration script
|   |   +-- seed_community_demo.py        # Demo data seeder
|   +-- src/app/
|       |-- main.py                       # App entry: FastAPI + CORS + Socket.IO mount
|       |-- db/
|       |   +-- db_connection.py          # Motor async MongoDB client + 23 collections
|       |-- models/
|       |   |-- collections.py            # Collection name constants
|       |   +-- best_float32.tflite       # Offline TFLite disease model (rice, 10 classes)
|       |-- schemas/                       # Pydantic request/response models
|       |   |-- auth.py                   # OTP send/verify schemas
|       |   |-- auth_credentials.py       # Stored auth doc schema
|       |   |-- character.py              # Character/avatar selection
|       |   |-- community.py              # All community messaging schemas
|       |   |-- crop_selections.py        # Crop preference schemas
|       |   |-- deviceSettings.py         # Device/app settings
|       |   |-- fertilizer.py             # Fertilizer data schemas
|       |   |-- id_Mobile.py              # Mobile ID schemas
|       |   |-- languageVoice.py          # Language preference schemas
|       |   |-- pesticide.py              # Pesticide data schemas
|       |   |-- product.py                # Marketplace product schemas
|       |   |-- seed.py                   # Seed data schemas
|       |   +-- terms.py                  # T&C acceptance schema
|       |-- api/v1/endpoints/             # Route handlers (15 modules)
|       |   |-- auth.py                   # /api/v1/auth/* (OTP)
|       |   |-- deviceSettings.py         # /api/v1/user/* (onboarding)
|       |   |-- disease_api.py            # /api/v1/disease/*
|       |   |-- fertilizer_api.py         # /api/v1/fertilizer/*
|       |   |-- pesticide_api.py          # /api/v1/pesticide/*
|       |   |-- seed_api.py               # /api/v1/seed/*
|       |   |-- calculator.py             # /api/v1/calculator/*
|       |   |-- chatbot.py                # /api/v1/chatbot/* (913 lines)
|       |   |-- products.py               # /api/v1/products/*
|       |   |-- media.py                  # /api/v1/media/upload
|       |   |-- community_dm.py           # /api/v1/community/dm/*
|       |   |-- community_groups.py       # /api/v1/community/groups/*
|       |   |-- community_offers.py       # /api/v1/community/offers/*
|       |   |-- community_notifications.py # /api/v1/community/notifications/*
|       |   +-- community_presence.py     # /api/v1/community/presence/*
|       |-- services/
|       |   |-- security.py               # JWT create/verify + FastAPI deps
|       |   |-- stytch_client.py          # Stytch OTP SDK wrapper
|       |   |-- socket_gateway.py         # Socket.IO AsyncServer (547 lines)
|       |   |-- predictor.py              # Disease detection (Roboflow -> TFLite)
|       |   |-- community_helpers.py      # DM/notification helpers
|       |   |-- notifications.py          # Fire-and-forget notify service
|       |   |-- fertilizer_service.py     # Scrape + store fertilizers
|       |   |-- pesticide_service.py      # Scrape + store pesticides
|       |   |-- seed_service.py           # Scrape + store seeds
|       |   |-- calculator/
|       |   |   |-- fertilizer_logic.py   # NPK calculation engine
|       |   |   |-- pesticide_logic.py    # Pesticide dosage calculator
|       |   |   |-- irrigation_logic.py   # Water requirement calculator
|       |   |   +-- budget_logic.py       # Profit/loss calculator
|       |   |-- scraper/
|       |   |   |-- fertilizer_scraper.py # KissanGhar fertilizer prices
|       |   |   |-- pesticide_scraper.py  # KissanGhar pesticide prices
|       |   |   |-- seed_scraper.py       # KissanGhar seed prices
|       |   |   +-- crop_price_scraper.py # Punjab Govt mandi prices (21 crops)
|       |   |-- pricing/                  # Price service layer
|       |   +-- data/
|       |       +-- quantities.py         # Crop/fert/pest lookup tables
|       +-- utils/
|           +-- logger.py                 # Standard Python logging config
|
+-- app-assankheti-frontend/              # React Native Expo App
    |-- package.json                      # 40+ dependencies
    |-- app.config.js                     # Expo config (plugins, icons, API URL)
    |-- tsconfig.json                     # TypeScript strict mode, @/* alias
    |-- eslint.config.js                  # Linting rules
    |-- expo-env.d.ts                     # Expo type declarations
    |-- DockerfileFrontend                # Frontend container
    |-- app/                              # Expo Router file-based routes (40+ screens)
    |   |-- _layout.tsx                   # Root layout (Theme + Language + RouteGuard)
    |   |-- index.tsx                     # Redirect to /splash
    |   |-- splash.tsx                    # Bootstrap screen
    |   |-- terms-and-conditions.tsx      # Onboarding step 1
    |   |-- language-selection.tsx        # Onboarding step 2
    |   |-- user-type-selection.tsx       # Onboarding step 3 (role picker)
    |   |-- characteristics.tsx           # Avatar/characteristic picker
    |   |-- crop-selection.tsx            # Farmer crop picker
    |   |-- login.tsx                     # Phone number entry
    |   |-- verify-otp.tsx                # OTP code entry
    |   |-- farmer-dashboard.tsx          # Farmer main hub
    |   |-- community-dashboard.tsx       # Buyer/community main hub
    |   |-- farmer-products.tsx           # Farmer product list
    |   |-- add-product.tsx               # Create/edit product form
    |   |-- disease-detection.tsx         # AI disease scanner
    |   |-- crop-recommendations.tsx      # Crop advisory screen
    |   |-- smart-budget.tsx              # Budget calculator screen
    |   |-- farmer-orders.tsx             # Orders received by farmer
    |   |-- farmer-notifications.tsx      # Farmer notifications
    |   |-- farmer-settings.tsx           # Farmer settings screen
    |   |-- farmer-profile-edit.tsx       # Farmer profile editor
    |   |-- user-orders.tsx               # Orders placed by buyer
    |   |-- user-notifications.tsx        # Buyer notifications
    |   |-- privacy-policy.tsx            # Legal page
    |   |-- help-center.tsx               # Support page
    |   |-- settings.tsx                  # Settings redirect by role
    |   |-- community-settings.tsx        # Community user settings
    |   |-- auth/
    |   |   |-- login.tsx                 # Alt login route
    |   |   +-- register.tsx              # Registration route
    |   |-- community/
    |   |   |-- inbox.tsx                 # DM + Group list
    |   |   |-- chat/[conversationId].tsx  # DM chat screen
    |   |   |-- group/[groupId].tsx       # Group chat screen
    |   |   |-- group/[groupId]/members.tsx # Group members
    |   |   |-- blocked-users.tsx         # Blocked users list
    |   |   |-- business.tsx              # Business community view
    |   |   +-- user.tsx                  # User community view
    |   |-- farmer/
    |   |   |-- community.tsx             # Farmer community access
    |   |   +-- select-crop.tsx           # Crop selection alt route
    |   |-- product-buy/[productId].tsx   # Buy product screen
    |   |-- product/
    |   |   |-- details/[productId].tsx   # Product detail
    |   |   +-- upload.tsx                # Product upload
    |   |-- category-products/[category].tsx # Browse by category
    |   |-- product-actions/[productId].tsx  # Farmer product actions
    |   |-- order-details/[orderId].tsx   # Order detail
    |   +-- call/[contactId].tsx          # Voice call screen
    |-- components/                       # Reusable UI components
    |   |-- farmer-dashboard.tsx          # Farmer dashboard component (2,134 lines)
    |   |-- community-dashboard.tsx       # Community dashboard component (831 lines)
    |   |-- SettingsScreen.tsx            # Settings UI component (950 lines)
    |   |-- AppRouteGuard.tsx             # Client-side route protection
    |   +-- community/                    # Chat sub-components
    |-- contexts/
    |   +-- LanguageContext.tsx           # Language state + useT() + useLanguage()
    |-- hooks/
    |   |-- useSocket.ts                  # Socket.IO event listener hook
    |   |-- useChatMessages.ts            # DM message state (322 lines)
    |   |-- useGroupMessages.ts           # Group message state (236 lines)
    |   +-- useThemeColor.ts              # Light/dark theme hook
    |-- lib/
    |   |-- appFlow.ts                    # AppFlowState + navigation logic (238 lines)
    |   |-- authFetch.ts                  # Authenticated HTTP client (JWT + 401 handler)
    |   |-- socket.ts                     # Socket.IO singleton (67 lines)
    |   |-- deviceId.ts                   # UUID mobile_id generator + persister
    |   |-- uploadImage.ts                # Image upload to backend
    |   |-- productsApi.ts                # Product CRUD API calls
    |   +-- mobileNotifications.ts        # Expo push notifications
    |-- constants/
    |   +-- theme.ts                      # Colors, fonts, light/dark theme tokens
    |-- types/                            # TypeScript type definitions
    |-- config/
    |   +-- env.ts                        # API URL detection (dev/prod/emulator)
    |-- utils/                            # Shared utility functions
    +-- assets/                           # Images, icons, fonts (binary)
```

---

## 3. FRONTEND ARCHITECTURE

### 3.1 Expo / React Native Setup

The app uses **Expo SDK 53** with the **New Architecture** (Fabric/TurboModules) enabled. This is the modern React Native rendering pipeline offering significant performance improvements over the old bridge-based architecture. The React Compiler is also enabled, providing ahead-of-time optimization of render functions.

```js
// app.config.js (key flags)
newArchEnabled: true,        // Fabric renderer
experiments: {
  typedRoutes: true,         // Full TypeScript route safety
  reactCompiler: true        // Ahead-of-time render optimization
}
```

The entry point is Expo Router's automatic file-based routing system, which reads the `app/` directory and generates the navigator tree automatically.

### 3.2 Navigation Architecture

Expo Router uses **file-system routing** — every `.tsx` file in `app/` becomes a navigable route. The pattern mirrors Next.js's file-based routing concept.

**Stack Navigator** (`app/_layout.tsx`):
- Root layout wraps ALL screens in providers (Theme, Language)
- Declares every route as `<Stack.Screen>` with `headerShown: false`
- `AppRouteGuard` component watches route changes and enforces flow rules

**Dynamic Routes:**
```
app/community/chat/[conversationId].tsx  ->  /community/chat/:id
app/product-buy/[productId].tsx          ->  /product-buy/:id
app/community/group/[groupId].tsx        ->  /community/group/:id
app/call/[contactId].tsx                 ->  /call/:id
app/order-details/[orderId].tsx          ->  /order-details/:id
```

**Bottom Tab Navigation** (inside dashboards):
The farmer and community dashboards implement their own bottom tab bars internally using React Navigation's `createBottomTabNavigator`, nested inside the Expo Router stack. This means there are two navigation systems in play — the outer Expo Router stack and inner tab navigators per dashboard.

### 3.3 AppFlowState — The Central Routing Brain

`lib/appFlow.ts` defines the entire onboarding + auth state machine:

```typescript
AppFlowState = {
  termsAccepted: boolean        // Step 1
  languageSelected: boolean     // Step 2
  textLanguage: 'english' | 'urdu'
  voiceLanguage: 'english' | 'urdu'
  role: 'farmer' | 'businessman' | 'simple-user'  // Step 3
  selectedCrop: string | null   // Step 4 (farmers only)
  isAuthenticated: boolean      // JWT exists
}
```

All state is persisted to `AsyncStorage` using namespaced keys with version suffixes (`assanKheti.*.v1`). The `AppRouteGuard` reads this state on every navigation event and redirects if the user tries to skip steps.

### 3.4 Screens Inventory

| Screen | Path | Role | Purpose |
|---|---|---|---|
| Splash | `/splash` | All | Bootstrap + mobile_id generation |
| Terms | `/terms-and-conditions` | All | Legal acceptance (onboarding step 1) |
| Language | `/language-selection` | All | English/Urdu pick (step 2) |
| User Type | `/user-type-selection` | All | Role picker (step 3) |
| Characteristics | `/characteristics` | All | Avatar/character selection |
| Crop Selection | `/crop-selection` | Farmer | Crop preference (step 4) |
| Login | `/login` | All | Phone number entry |
| OTP Verify | `/verify-otp` | All | 6-digit code verification |
| Farmer Dashboard | `/farmer-dashboard` | Farmer | Main hub with tabs |
| Community Dashboard | `/community-dashboard` | Buyer/Biz | Product browse hub |
| Farmer Products | `/farmer-products` | Farmer | My listings management |
| Add/Edit Product | `/add-product` | Farmer | Create or update listing |
| Disease Detection | `/disease-detection` | Farmer | AI crop scanner |
| Crop Recommendations | `/crop-recommendations` | Farmer | Advisory screen |
| Smart Budget | `/smart-budget` | Farmer | Profit/loss calculator |
| Farmer Orders | `/farmer-orders` | Farmer | Incoming orders |
| Community Inbox | `/community/inbox` | All (auth) | DMs + Groups list |
| DM Chat | `/community/chat/[id]` | All (auth) | Direct messages |
| Group Chat | `/community/group/[id]` | All (auth) | Group messages |
| Product Buy | `/product-buy/[id]` | Buyer | Purchase flow |
| Category Browse | `/category-products/[cat]` | Buyer | Filter by category |
| User Orders | `/user-orders` | Buyer | My purchases |
| Settings | `/farmer-settings` or `/community-settings` | All | App settings |

### 3.5 Components

**Large Monolith Components (architectural smell):**
- `components/farmer-dashboard.tsx` — **2,134 lines**. Contains the entire farmer experience including home tab, marketplace tab, community tab, profile tab, all logic, all API calls. Must be split.
- `components/community-dashboard.tsx` — **831 lines**. Similar issue.
- `components/SettingsScreen.tsx` — **950 lines**. Settings logic for both roles in one file.

**Smaller, Focused Components:**
- `components/AppRouteGuard.tsx` — Route protection logic
- `components/community/` — Chat UI sub-components

### 3.6 Hooks

| Hook | File | Purpose |
|---|---|---|
| `useSocket` | `hooks/useSocket.ts` | Event listener registration on Socket.IO |
| `useChatMessages` | `hooks/useChatMessages.ts` | DM message state, send, markRead (322 lines) |
| `useGroupMessages` | `hooks/useGroupMessages.ts` | Group message state (236 lines) |
| `useThemeColor` | `hooks/useThemeColor.ts` | Returns correct color for light/dark mode |
| `useLanguage` | from LanguageContext | Returns textLanguage, voiceLanguage |
| `useT` | from LanguageContext | Returns bilingual translation function |

### 3.7 Language Context

```typescript
// contexts/LanguageContext.tsx

// How translations work:
const t = useT();
t({ english: 'Add Product', urdu: 'مصنوع شامل کریں' })
// Returns English or Urdu string based on textLanguage setting
```

The context:
1. Reads saved language from AsyncStorage on mount
2. Sets `hydrated: true` once loaded (prevents flash of wrong language)
3. Persists changes back to AsyncStorage immediately
4. Exposes `setTextLanguage()` and `setVoiceLanguage()` for settings screens

**No Redux/Zustand/Jotai.** State management is Context API only. The main shared state is language preference — everything else is local component state or AsyncStorage reads.

### 3.8 API Layer

All API calls flow through one of two functions:

**`authFetch`** (`lib/authFetch.ts`):
- Reads JWT from AsyncStorage (`auth.access_token`)
- Adds `Authorization: Bearer {token}` header to every request
- On 401 response: clears all `auth.*` keys, throws `SESSION_EXPIRED_ERROR`
- Prevents redirect loops with `_redirecting` flag

**Raw `fetch`** (unauthenticated endpoints):
- Used for onboarding, generate mobile_id
- Uses `API_BASE` from `config/env.ts`

**`config/env.ts` — Smart API URL detection:**
```
Priority order:
1. process.env.API_URL          (production env var)
2. Expo debugger manifest host  (Expo Go on physical device)
3. 10.0.2.2:8000                (Android emulator)
4. 127.0.0.1:8000               (iOS simulator)
5. localhost:8000               (web fallback)
```

### 3.9 Socket.IO Client Architecture

**`lib/socket.ts`** — Singleton socket instance:
```typescript
// Only one socket connection ever exists
// Lazy-initialized on first access
// Auth token attached at handshake
io(API_BASE, {
  auth: { token: storedToken },
  transports: ['polling', 'websocket']  // polling first, then upgrades to WS
})
```

**`hooks/useChatMessages.ts`** — Dual-mode messaging with fallback:
```
User sends message:
  1. Optimistic update (local state, temp ID, status='sending')
  2. Try Socket.IO emit('dm:send') with 5-second ACK timeout
  3. If ACK received: status='sent', replace temp ID with real ID
  4. If timeout: HTTP fallback -> POST /api/v1/community/dm/send
  5. If HTTP also fails: status='failed'
```

### 3.10 AsyncStorage Keys Map

```
Onboarding State:
  assanKheti.termsAccepted.v1      -> 'true' | not set
  assanKheti.languageSelected.v1   -> 'true' | not set
  assanKheti.textLanguage.v1       -> 'english' | 'urdu'
  assanKheti.voiceLanguage.v1      -> 'english' | 'urdu'
  assanKheti.role.v1               -> 'farmer' | 'businessman' | 'simple-user'
  assanKheti.selectedCrop.v1       -> crop name string | not set

Auth Session:
  auth.access_token                -> JWT string
  auth.token_type                  -> 'bearer'
  auth.user_id                     -> Stytch user ID
  auth.phone_number                -> E.164 phone
  auth.otp_method_id               -> Stytch method_id

Device:
  assan_kheti_mobile_id            -> UUID v4

Notifications:
  settings.pushNotifications       -> 'true' | 'false'
  assanKheti.sentMobileNotifications.v1 -> JSON set of sent notification IDs
```

### 3.11 Theme & UI System

```typescript
// constants/theme.ts
Colors = {
  light: { text, background, tint: '#0a7ea4', icon, tabIconDefault, tabIconSelected }
  dark:  { text, background, tint: '#fff', icon, tabIconDefault, tabIconSelected }
}

// App Brand Colors (inline in components, NOT centralized — smell):
Primary Green:  #0d5c4b (dark) / #10b981 (light)
Background:     #f7faf6 / #f5f1e8
Accent Amber:   #f59e0b
Error Red:      #ef4444
```

**Problem:** Brand colors are duplicated inline across 40+ screens rather than exported from `constants/theme.ts`. Changing the primary green requires editing dozens of files.

---

## 4. BACKEND ARCHITECTURE

### 4.1 Entry Point — `src/app/main.py`

```python
# FastAPI app creation
app = FastAPI(title="Assan Kheti Backend")

# CORS — allows everything (security issue — see section 13)
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)

# Socket.IO wraps FastAPI as the top-level ASGI app
sio_app = socketio.ASGIApp(sio, app)

# Static file serving for uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Background startup tasks (web scraping)
@app.on_event("startup")
async def startup():
    asyncio.create_task(scrape_all_on_startup())
    asyncio.create_task(schedule_periodic_scraping())  # every 24 hours
```

**Important:** `sio_app` (not `app`) must be passed to Uvicorn. If you run `uvicorn app.main:app`, Socket.IO will not work.

### 4.2 API Router Structure

```
/api/v1/
  auth/           -> auth.py               (OTP login)
  user/           -> deviceSettings.py     (onboarding)
  disease/        -> disease_api.py        (AI crop scanning)
  fertilizer/     -> fertilizer_api.py     (fertilizer catalog)
  pesticide/      -> pesticide_api.py      (pesticide catalog)
  seed/           -> seed_api.py           (seed catalog)
  calculator/     -> calculator.py         (smart calculators)
  chatbot/        -> chatbot.py            (AI chatbot, 913 lines)
  products/       -> products.py           (marketplace listings)
  media/          -> media.py              (image upload)
  community/
    dm/           -> community_dm.py       (direct messages)
    groups/       -> community_groups.py   (group chats)
    offers/       -> community_offers.py   (price negotiation)
    notifications/-> community_notifications.py
    presence/     -> community_presence.py

/health/db        -> health check
/uploads/         -> static file server for images
```

### 4.3 Authentication Dependency Chain

```python
# Used in protected endpoints as:
mobile_id: str = Depends(get_current_mobile_id)

# Internal chain:
get_current_mobile_id
  -> get_current_user(token = Depends(HTTPBearer()))
  -> verify_token(token.credentials)
  -> jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
  -> returns payload["mobile_id"]
```

### 4.4 Request Flow

```
Client Request
     |
     v
CORSMiddleware (allows all origins)
     |
     v
Socket.IO ASGIApp (intercepts WebSocket upgrade requests)
     |
     v
FastAPI Router (matches HTTP route)
     |
     v
Endpoint Function
     |
     v
Depends(get_current_mobile_id) [if protected endpoint]
     |
     v
Business Logic
     |
     v
MongoDB via Motor (async)
     |
     v
JSON Response
```

### 4.5 Background Tasks

```python
# Runs once on every startup:
async def scrape_all_on_startup():
    await scrape_and_store_fertilizers()
    await scrape_and_store_pesticides()
    await scrape_and_store_seeds()

# Then repeats every 24 hours:
async def schedule_periodic_scraping():
    while True:
        await asyncio.sleep(86400)
        await scrape_all_on_startup()
```

**Problem:** If the app restarts, the 24-hour timer resets. No distributed scheduling (Celery, APScheduler with persistence). Scraper errors are silently swallowed.

### 4.6 File Upload Architecture

```
POST /api/v1/media/upload
  -> Validates Content-Type (jpeg/png only)
  -> Validates file size (<= 5 MB)
  -> Generates UUID filename
  -> Writes to /app/uploads/community/ (Docker) or uploads/ (local)
  -> Returns { url: "/uploads/community/{uuid}.{ext}" }
  -> Files served as static files via /uploads/ mount
```

Files are served directly by FastAPI. In production, use a CDN or object storage (AWS S3, Cloudflare R2).

---

## 5. DATABASE ARCHITECTURE

### 5.1 MongoDB Collections (23 total)

**Onboarding & Settings:**

| Collection | Key Fields | Purpose |
|---|---|---|
| `mobile_devices` | mobile_id, created_at | Device registration |
| `terms_settings` | mobile_id, accepted, created_at | T&C tracking |
| `language_settings` | mobile_id, language, voice | Language preferences |
| `character_settings` | mobile_id, character_id | Role/avatar selection |
| `user_settings` | mobile_id, role, crop, language | Consolidated settings |
| `auth_credentials` | mobile_id, phone, user_id, is_active | JWT auth mapping |
| `crop_selections` | mobile_id, crops[] | Farmer crop preferences |

**Agricultural Data:**

| Collection | Key Fields | Purpose |
|---|---|---|
| `fertilizers` | name, price | Scraped fertilizer catalog |
| `pesticides` | name, price | Scraped pesticide catalog |
| `seeds` | name, price | Scraped seed catalog |
| `crop_prices` | crop_name, price, unit, source | Punjab mandi prices |
| `disease_scans` | mobile_id, disease, confidence, image_url | AI scan results |

**Marketplace:**

| Collection | Key Fields | Purpose |
|---|---|---|
| `product_listings` | farmer_id, name, category, price, unit, stock, images[], status | Products |

**Community:**

| Collection | Key Fields | Purpose |
|---|---|---|
| `community_groups` | group_id, name_en, name_ur, crop, member_count | Crop-based groups |
| `community_group_members` | group_id, mobile_id, joined_at | Group membership |
| `community_conversations` | conversation_id, participants[], context_type, context_ref | DM threads |
| `community_messages` | message_id, sender_id, body, message_type, payload, created_at | All messages |
| `community_notifications` | mobile_id, type, title_en, title_ur, body_en, body_ur, is_read | In-app alerts |
| `community_offers` | offer_id, buyer_id, seller_id, product_id, amount, status | Price offers |
| `community_presence` | mobile_id, status, last_active_at, socket_id | Online status |
| `community_blocks` | blocker_id, blocked_id, created_at | Block relationships |
| `chat_messages` | mobile_id, session_id, sender, text, created_at | AI chatbot history |
| `chat_sessions` | mobile_id, session_id, title, last_message, message_count | AI chatbot sessions |

### 5.2 Entity Relationship Diagram

```
mobile_devices (1) ------------------------------------------------- (1) auth_credentials
     |                                                                       | (user_id from Stytch)
     |-- (1) terms_settings
     |-- (1) language_settings
     |-- (1) character_settings
     |-- (1) user_settings
     |-- (1) disease_scans        (upserted per device)
     |-- (1) community_presence
     |-- (N) crop_selections
     |-- (N) community_group_members
     |          |
     |     community_groups (1) ---(N) community_group_members
     |
     |-- (N) community_conversations  (as participant)
     |          |
     |     community_messages (N)     (belong to conversation OR group)
     |          |
     |     community_offers (N)       (reference product_listings)
     |
     |-- (N) community_notifications
     |-- (N) community_blocks         (as blocker)
     |-- (N) product_listings          (farmer_id = mobile_id)
     |-- (N) chat_messages             (chatbot history)
     +-- (N) chat_sessions
```

### 5.3 Key Data Relationships

**Mobile ID is the Universal Primary Key.** There is no traditional `users` collection. The `mobile_id` (UUID stored on device) is used as the user identifier throughout the entire system.

**Consequences:**
- If a user uninstalls the app: new UUID generated, all history is lost
- No account recovery possible
- Multi-device use is impossible (phone + tablet = two different "users")
- The `auth_credentials` collection maps phone to mobile_id, but only as an auth artifact

**Product to Conversation Relationship:**
```
product_listings.product_id
    ^ referenced by
community_conversations.context_ref  (when context_type = 'product')
    ^ referenced by
community_offers.product_id
```

### 5.4 Missing Database Indexes

Defined indexes (products only):
```python
db.create_index([("farmer_id", -1), ("updated_at", -1)])
db.create_index([("category", 1), ("status", 1)])
```

**Missing critical indexes (will cause full collection scans):**
```python
# Must add immediately:
community_messages.create_index([("conversation_id", 1), ("created_at", -1)])
community_conversations.create_index([("participants", 1)])
auth_credentials.create_index([("mobile_id", 1)], unique=True)
community_blocks.create_index([("blocker_id", 1), ("blocked_id", 1)])
community_messages.create_index([("group_id", 1), ("created_at", -1)])
```

Every authenticated request triggers a full collection scan on `auth_credentials`. At 1,000 users this is acceptable. At 100,000 users this will cause severe latency.

---

## 6. AUTHENTICATION SYSTEM

### 6.1 Complete Login Flow

```
STEP 1: Phone Entry (/login)
  User enters phone number (+92xxxxxxxxxx)
  POST /api/v1/auth/send-otp/ { phone_number: "+92xxxxxxxxxx" }
  Backend:
    -> Validates E.164 format
    -> stytch_client.send_otp_sms(phone_number)
    -> Stytch sends SMS with 6-digit code
    -> Returns { method_id: "otp-sms-xxx", message: "OTP sent" }
  Frontend:
    -> Stores method_id in AsyncStorage (auth.otp_method_id)
    -> Navigates to /verify-otp

STEP 2: OTP Verification (/verify-otp)
  User enters 6-digit code
  POST /api/v1/auth/verify-otp/ { method_id, code }
  Backend:
    -> stytch_client.authenticate_otp(method_id, code)
    -> Stytch validates code (5-minute expiry)
    -> Gets Stytch user_id from response
    -> Upserts auth_credentials { mobile_id, phone, user_id, is_active, created_at }
    -> create_access_token({ sub: user_id, mobile_id, phone, auth_via: "stytch_otp" })
    -> Returns { access_token, token_type: "bearer", user_id }
  Frontend:
    -> Stores all auth.* keys in AsyncStorage
    -> Sets isAuthenticated = true in AppFlowState
    -> Navigates to role-appropriate dashboard

STEP 3: Subsequent Requests
  authFetch() reads auth.access_token
  -> Adds Authorization: Bearer {token} to every request
  Backend: get_current_mobile_id() decodes JWT
  -> Extracts mobile_id
  -> Uses mobile_id as user identifier for all queries
```

### 6.2 JWT Token Configuration

```python
# Token payload
{
  "sub": "user-xxx",           # Stytch user_id
  "exp": now + 720 minutes,    # 12 hours
  "mobile_id": "uuid-xxx",     # Device identifier
  "phone_number": "+92xxx",    # User's phone
  "auth_via": "stytch_otp"     # Auth method marker
}
```

**Bug:** Token expiry is hardcoded as `720` minutes in `security.py`. The `.env` variable `ACCESS_TOKEN_EXPIRE_MINUTES=30` is completely ignored.

### 6.3 Session Persistence & Expiry

Sessions persist indefinitely in AsyncStorage. There is **no refresh token mechanism**. When a 12-hour JWT expires:
- `authFetch()` receives a 401 response
- Clears all `auth.*` AsyncStorage keys
- Throws `SESSION_EXPIRED_ERROR`
- `AppRouteGuard` detects unauthenticated state and redirects to `/login`

### 6.4 Role-Based Access Gap

Role is stored in `AsyncStorage(assanKheti.role.v1)` and enforced only by `AppRouteGuard` on the frontend. **The backend does NOT validate the user's role on most endpoints.** A `simple-user` can call `POST /api/v1/products/` and create a listing.

---

## 7. NAVIGATION & ROUTING FLOW

### 7.1 Complete User Flow Map

```
APP LAUNCH
    |
    v
/splash  (bootstrap)
    | Reads AsyncStorage for AppFlowState
    |
    +--- [First Launch] -------------------------------------------------+
    |                                                                     |
    v                                                                     |
/terms-and-conditions                                                     |
    | POST /api/v1/user/accept-terms/                                     |
    | Sets: termsAccepted = true                                          |
    v                                                                     |
/language-selection                                                       |
    | POST /api/v1/user/language-voice/                                   |
    | Sets: languageSelected = true, textLanguage, voiceLanguage          |
    v                                                                     |
/user-type-selection                                                      |
    | POST /api/v1/user/character/                                        |
    | POST /api/v1/user/devicesetting/{mobile_id}                         |
    | Sets: role = 'farmer' | 'businessman' | 'simple-user'               |
    |                                                                     |
    +--- [role === 'farmer'] -----------------------------------------+  |
    |                                                                 |  |
    v                                                                 |  |
/crop-selection                                                       |  |
    | POST /api/v1/user/crop-selection/{mobile_id}                    |  |
    | Auto-joins community groups for selected crops                  |  |
    | Sets: selectedCrop                                              |  |
    v                                                                 |  |
    +----------------------------------------------------------------+  |
    |                                                                    |
    +--- [role !== 'farmer'] -------------------------------------------+
    v
/login
    | POST /api/v1/auth/send-otp/
    | Stores method_id
    v
/verify-otp
    | POST /api/v1/auth/verify-otp/
    | Receives JWT, stores auth.*
    | Sets: isAuthenticated = true
    |
    +--- [role === 'farmer'] -----------------------------------------+
    |                                                                 |
    v                                                                 |
/farmer-dashboard  [MAIN FARMER HUB]                                 |
    |                                                                 |
    +-- Tab: Home                                                     |
    |     Shows: Stats, Quick Actions, Recent Activity                |
    |     -> /add-product                                             |
    |     -> /farmer-products                                         |
    |     -> /disease-detection                                       |
    |     -> /smart-budget                                            |
    |     -> /crop-recommendations                                    |
    |                                                                 |
    +-- Tab: Marketplace                                              |
    |     Browse + buy from other farmers                             |
    |     -> /product-buy/[id]                                        |
    |     -> /community/chat/[id]                                     |
    |                                                                 |
    +-- Tab: Community                                                |
    |     -> /community/inbox                                         |
    |       -> /community/chat/[conversationId]                       |
    |       -> /community/group/[groupId]                             |
    |                                                                 |
    +-- Tab: Profile                                                  |
          -> /farmer-settings                                         |
          -> /farmer-profile-edit                                     |
          -> Logout                                                   |
                                                                      |
    +--- [role === 'businessman' or 'simple-user'] --------------------+
    v
/community-dashboard  [MAIN BUYER HUB]
    |
    +-- Browse: Products by category
    |     -> /category-products/[category]
    |       -> /product-buy/[id]
    |         -> POST /api/v1/community/dm/resolve  (open/create chat)
    |         -> /community/chat/[conversationId]
    |           -> Make Offer -> POST /api/v1/community/offers/create
    |
    +-- Tab: Community/Inbox
    |     -> /community/inbox
    |
    +-- Tab: Settings
          -> /community-settings
```

### 7.2 Dynamic Route Reference

```
/community/chat/[conversationId]     Opens a specific DM thread
/community/group/[groupId]           Opens a specific group chat
/community/group/[groupId]/members   Group member list
/product-buy/[productId]             Product purchase screen
/product/details/[productId]         Product detail view
/category-products/[category]        Browse by category
/product-actions/[productId]         Farmer product management
/order-details/[orderId]             Specific order details
/call/[contactId]                    Voice call screen (not fully implemented)
```

### 7.3 Route Guard Logic (`components/AppRouteGuard.tsx`)

```typescript
// Runs on every navigation event:
onRouteChange(path) {
  if (publicRoutes.includes(path)) return;       // Always allow

  if (!flowState.termsAccepted) {
    redirect('/terms-and-conditions');            // Must accept terms first
    return;
  }

  if (!flowState.languageSelected) {
    redirect('/language-selection');              // Must pick language
    return;
  }

  if (isFarmerRoute(path) && flowState.role !== 'farmer') {
    redirect('/community-dashboard');             // Non-farmers blocked
    return;
  }

  if (isCommunityRoute(path) && !flowState.isAuthenticated) {
    redirect('/login');                           // Must be logged in
    return;
  }
}
```

---

## 8. ROLE SYSTEM

### 8.1 Three Roles

| Role | Stored Value | Dashboard | Primary Use |
|---|---|---|---|
| Farmer | `'farmer'` | `/farmer-dashboard` | Sell produce, use AI tools |
| Business User | `'businessman'` | `/community-dashboard` | Buy produce, negotiate |
| Simple User | `'simple-user'` | `/community-dashboard` | Browse and buy |

### 8.2 Permission Matrix

| Feature | Farmer | Businessman | Simple User |
|---|---|---|---|
| View marketplace | Yes | Yes | Yes |
| Create product listing | Yes | No | No |
| Edit/delete own products | Yes | No | No |
| Place orders | Yes | Yes | Yes |
| Make price offers | Yes | Yes | Yes |
| Accept/reject offers (seller) | Yes | No | No |
| Disease detection | Yes | No | No |
| Budget calculator | Yes | No | No |
| Crop recommendations | Yes | No | No |
| Community groups | Yes | Yes | Yes |
| Direct messaging | Yes | Yes | Yes |
| AI Chatbot | Yes | Yes | Yes |

### 8.3 Role Enforcement Gap

**Frontend:** `AppRouteGuard` enforces routes based on `AsyncStorage` role value.
**Backend:** NO role check on product creation, disease prediction, or calculator endpoints.

A malicious user can:
1. Complete onboarding as `simple-user`
2. Get a valid JWT token
3. Call `POST /api/v1/products/` directly and create a product listing

**Required fix:** Add role claim to JWT payload and validate it via a FastAPI dependency on protected endpoints.

---

## 9. COMMUNITY SYSTEM

### 9.1 Group System

**Auto-enrollment on crop selection:**
```
User selects crop (e.g., "rice") at /crop-selection
    |
    v
POST /api/v1/user/crop-selection/{mobile_id}
    |
    v
Backend: for each selected crop:
    -> Find community_groups WHERE crop = selected_crop
    -> Insert community_group_members { group_id, mobile_id, joined_at }
    -> (Silently skips if no group exists for that crop)
```

**Group message flow:**
```
User opens /community/group/[groupId]
    |
    v
useGroupMessages hook fetches history:
    GET /api/v1/community/groups/{groupId}/messages
    -> Validates membership
    -> Returns paginated messages
    |
    v
Socket.IO joins room: 'group:{groupId}'
    |
    v
User sends message:
    emit('group:send', { group_id, body, client_message_id })
    |
    v
Server:
    -> Validates membership
    -> Inserts message to community_messages
    -> emits 'dm:sent' back to sender (ACK)
    -> emits 'group:received' to all room members (except sender)
```

### 9.2 Direct Message System

**Conversation resolution (before first DM):**
```
POST /api/v1/community/dm/resolve
{ sender_id: "A", recipient_id: "B", context_type: "product", context_ref: "product_id" }
    |
    v
Backend: Upsert conversation WHERE participants = sorted(["A", "B"])
    -> Race-safe: sorted participant list used as unique key
    -> Returns existing or new conversation_id
    |
    v
Frontend: Navigates to /community/chat/{conversation_id}
```

**Message deduplication:**
```python
await db.community_messages.update_one(
    {"sender_id": sender_id, "client_message_id": client_message_id},
    {"$setOnInsert": message_doc},
    upsert=True
)
```

### 9.3 Offer / Price Negotiation System

```
State Machine:
  pending -> accepted (seller only)
  pending -> rejected (seller only)
  pending -> expired  (buyer withdraws)

Flow:
  Buyer taps "Make Offer" on /product-buy/[id]
      |
      v
  POST /api/v1/community/offers/create
  { buyer_id, seller_id, product_id, amount, conversation_id }
      |
      v
  Backend:
      -> Creates offer (status: 'pending')
      -> Inserts system message in DM thread
      -> emits 'offer:status_changed' to seller's room
      -> Creates notification for seller
      |
      v
  Seller accepts: POST /api/v1/community/offers/{id}/accept
      -> Updates status to 'accepted'
      -> System message: "Offer accepted"
      -> Notifies buyer
```

### 9.4 Block System

```
POST /api/v1/community/dm/block { blocker_id: "A", blocked_id: "B" }
    |
    v
Inserts: community_blocks { blocker_id: "A", blocked_id: "B" }
    |
    v
Effect: is_blocked() checks BOTH directions bidirectionally
    A->B blocked: B cannot send messages to A
    B->A blocked: A cannot send messages to B (mutual enforcement)
```

---

## 10. API DOCUMENTATION

### 10.1 Authentication

```
POST /api/v1/auth/send-otp/
  Auth:     None
  Body:     { phone_number: string }  (E.164 format, e.g. "+923001234567")
  Response: { method_id: string, message: string }
  Errors:   400 (invalid format), 500 (Stytch error)

POST /api/v1/auth/verify-otp/
  Auth:     None
  Body:     { method_id: string, code: string }
  Response: { access_token: string, token_type: "bearer", user_id: string }
  Errors:   401 (invalid OTP), 500 (Stytch error)
```

### 10.2 Device Onboarding

```
POST /api/v1/user/generate/mobileid
  Body:     { mobile_id?: string }
  Response: { mobile_id: string, created: boolean }

POST /api/v1/user/accept-terms/
  Body:     { mobile_id: string }
  Response: { status: "success" }

POST /api/v1/user/language-voice/
  Body:     { mobile_id: string, language: "en"|"ur", voice: "en"|"ur" }
  Response: { status: "success" }

POST /api/v1/user/character/
  Body:     { mobile_id: string, character_id: string }
  Response: { status: "success" }

POST /api/v1/user/devicesetting/{mobile_id}
  Body:     { character_id, language, voice, ... }
  Response: FinalSettingsDB

GET /api/v1/user/devicesetting/{mobile_id}
  Response: FinalSettingsDB

POST /api/v1/user/crop-selection/{mobile_id}
  Body:     { crops: string[] }
  Response: { status: "success", groups_joined: number }
```

### 10.3 Products / Marketplace

```
POST /api/v1/products/
  Auth:     Bearer JWT
  Body:     {
              farmer_id: string, name: string,
              category: "grains"|"veggies"|"fruits"|"others",
              price: number, unit: "kg"|"g"|"bag"|"bundle"|"piece"|"dozen",
              stock: number, min_order?: string, delivery_area?: string,
              description?: string, images?: string[]  (max 5)
            }
  Response: ProductResponse

GET /api/v1/products/all?category=&status=
  Auth:     None
  Response: ProductResponse[]

GET /api/v1/products/farmer/{farmer_id}
  Auth:     None
  Response: ProductResponse[]

GET /api/v1/products/{product_id}
  Auth:     None
  Response: ProductResponse

PUT /api/v1/products/{product_id}
  Auth:     Bearer JWT
  Body:     Partial ProductCreate fields
  Response: ProductResponse

DELETE /api/v1/products/{product_id}
  Auth:     Bearer JWT
  Response: { status: "success" }
```

### 10.4 Community Direct Messages

```
POST /api/v1/community/dm/resolve
  Auth:     Bearer JWT
  Body:     { sender_id, recipient_id, context_type?, context_ref? }
  Response: { conversation_id: string }

GET /api/v1/community/dm/inbox/{mobile_id}
  Auth:     Bearer JWT
  Response: DMItem[]  (with unread_count per conversation)

GET /api/v1/community/dm/messages/{conversation_id}?limit=50&before=
  Auth:     Bearer JWT
  Response: ChatMessage[]

POST /api/v1/community/dm/send
  Auth:     Bearer JWT
  Body:     { sender_id, conversation_id?, body?, image_url?,
              message_type, client_message_id }
  Response: ChatMessage

POST /api/v1/community/dm/read
  Auth:     Bearer JWT
  Body:     { conversation_id, mobile_id }
  Response: { status: "ok" }

POST /api/v1/community/dm/block
  Auth:     Bearer JWT
  Body:     { blocker_id, blocked_id }
  Response: { status: "success" }
```

### 10.5 Community Groups

```
GET /api/v1/community/groups/list/{mobile_id}
  Auth:     Bearer JWT
  Response: GroupItem[]

GET /api/v1/community/groups/{group_id}/messages?limit=50
  Auth:     Bearer JWT (member only)
  Response: ChatMessage[]

POST /api/v1/community/groups/{group_id}/send
  Auth:     Bearer JWT (member only)
  Body:     { sender_id, body?, image_url?, message_type, client_message_id }
  Response: ChatMessage

POST /api/v1/community/groups/{group_id}/read
  Auth:     Bearer JWT
  Body:     { mobile_id }
  Response: { status: "ok" }
```

### 10.6 Offers

```
POST /api/v1/community/offers/create
  Auth:     Bearer JWT
  Body:     { buyer_id, seller_id, product_id, amount, conversation_id }
  Response: OfferOut

POST /api/v1/community/offers/{offer_id}/accept
  Auth:     Bearer JWT  (must be seller)
  Body:     { mobile_id }
  Response: OfferOut

POST /api/v1/community/offers/{offer_id}/reject
  Auth:     Bearer JWT  (must be seller)
  Body:     { mobile_id }
  Response: OfferOut

POST /api/v1/community/offers/{offer_id}/withdraw
  Auth:     Bearer JWT  (must be buyer)
  Body:     { mobile_id }
  Response: OfferOut
```

### 10.7 Disease Detection

```
POST /api/v1/disease/predict_disease
  Auth:     None  (bug — should require auth)
  Form:     { file: image, mobile_id: string, crop_name: string }
  Response: { disease: string, confidence: float,
              image_url: string, source: "roboflow"|"tflite" }

GET /api/v1/disease/last-scan/{mobile_id}
  Response: disease scan document

POST /api/v1/disease/treatment
  Body:     { disease_name: string }
  Response: { treatment: string }  (from OpenAI)
```

### 10.8 Smart Calculators

```
POST /api/v1/calculator/fertilizer
  Body:     { area: float, area_unit: "acre"|"kanal"|"marla", crop_type: string }
  Response: { nitrogen, phosphorus, potassium, urea_kg, dap_kg, mop_kg,
              suggested_fertilizers[] }

POST /api/v1/calculator/pesticide
  Body:     { area, area_unit, crop_type }
  Response: { pesticide_needed_ml }

POST /api/v1/calculator/irrigation
  Body:     { area, area_unit, crop_type }
  Response: { water_needed_liters }

POST /api/v1/calculator/budget
  Body:     { area, crop_type, seed_cost, fertilizer_cost, pesticide_cost,
              other_costs, expected_yield?, price_per_unit? }
  Response: { total_cost, expected_revenue, estimated_profit, breakdown{} }

GET /api/v1/calculator/prices/fertilizer
GET /api/v1/calculator/prices/pesticide
GET /api/v1/calculator/prices/seed
GET /api/v1/calculator/prices/crop
  Response: { prices: { name: price } }
```

### 10.9 AI Chatbot

```
POST /api/v1/chatbot/chat
  Body:     { message: string, mobile_id: string, session_id?: string }
  Response: { reply: string, session_id: string }

GET /api/v1/chatbot/sessions/{mobile_id}
  Response: ChatSession[]  (grouped by date)

GET /api/v1/chatbot/history/{mobile_id}/{session_id}
  Response: ChatMessage[]

DELETE /api/v1/chatbot/session/{mobile_id}/{session_id}
DELETE /api/v1/chatbot/history/{mobile_id}
```

---

## 11. ENVIRONMENT CONFIGURATION

### 11.1 Backend `.env` (Current — Security Issues)

```bash
# Server
BACKEND_PORT=8000

# MongoDB
MONGO_HOST=localhost
MONGO_PORT=27017
MONGODB_LOCAL=mongodb://localhost:27017
MONGO_DB_NAME=dbasssankheti

# JWT
SECRET_KEY=your-super-secret-key-change-in-production   # NOT CHANGED - CRITICAL BUG
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30    # IGNORED - code hardcodes 720 minutes

# Stytch OTP Auth
STYTCH_PROJECT_ID=project-test-e16e89ef-...   # EXPOSED IN REPO
STYTCH_SECRET=secret-test-fuULcunsB5Hp...     # EXPOSED IN REPO
STYTCH_ENVIRONMENT=test-mhtd

# Network
API_URL=http://192.168.1.25:8000   # HARDCODED LOCAL IP

# OpenAI
OPENAI_API_KEY=sk-vHJzwrvDv9C...  # EXPOSED IN REPO
```

### 11.2 Frontend Environment

```javascript
// app.config.js
extra: { apiUrl: process.env.API_URL ?? 'http://localhost:8000' }

// config/env.ts — Smart detection order:
1. process.env.API_URL          (production)
2. Expo manifest debugger host  (Expo Go dev server)
3. 10.0.2.2:8000               (Android emulator)
4. 127.0.0.1:8000              (iOS simulator)
5. localhost:8000              (web)
```

### 11.3 Hardcoded Values That Must Become Env Vars

| Location | Hardcoded Value | Risk |
|---|---|---|
| `predictor.py` | Roboflow API key | API abuse, billing |
| `security.py` | Token expiry `720` | Ignores config |
| `scraper/*.py` | KissanGhar URLs | Fragile if site changes |
| `chatbot.py` | System prompt string | Cannot update without redeploy |
| `product-buy` screen | Platform fee `0.02`, delivery fee `150` | Business logic in UI |

---

## 12. DOCKER & DEPLOYMENT

### 12.1 Docker Compose Architecture

```yaml
# Three containers in assan-kheti-net network:

mongo:
  image: mongo:6.0
  ports:   27017:27017
  volumes: mongo_data:/data/db

backend:
  build:   ./app-assankheti-backend (DockerfileBackend)
  ports:   8000:8000
  volumes:
    - ./src:/app/src           (live reload in dev)
    - community_uploads:/app/uploads
  env_file: .env
  environment:
    MONGODB_LOCAL: "mongodb://mongo:27017"  (overrides .env for Docker network)
  depends_on: mongo

frontend:
  build:   ./app-assankheti-frontend (DockerfileFrontend)
  ports:   8081:8081
  build_args: API_URL=http://localhost:8000
  depends_on: backend
```

### 12.2 Backend Dockerfile Analysis

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ./src ./src
ENV PYTHONPATH=/app/src
EXPOSE 8000
CMD ["uvicorn", "app.main:sio_app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

**Issues:**
- `--reload` is a development-only flag — must be removed for production
- No `HEALTHCHECK` instruction in Dockerfile
- Runs as root user (security risk)
- TensorFlow 2.16.2 adds ~1.5-2 GB to image size
- No multi-stage build to separate build and runtime layers

### 12.3 Correct Local Run Commands

```bash
# Backend (correct command — note sio_app not app):
cd app-assankheti-backend
source venv/bin/activate
PYTHONPATH=./src uvicorn app.main:sio_app --reload --port 8000

# Frontend:
cd app-assankheti-frontend
npm install
npm start

# Full stack via Docker:
docker compose up --build
```

### 12.4 Production Deployment Gaps

| Requirement | Status |
|---|---|
| EAS Build config (`eas.json`) | Missing |
| Nginx reverse proxy | Missing |
| SSL/HTTPS termination | Missing |
| Log aggregation | Missing |
| MongoDB backup strategy | Missing |
| CDN for uploaded images | Missing |
| Environment separation (dev/staging/prod) | Missing |
| Health check monitoring | Missing |
| Rate limiting | Missing |

---

## 13. SECURITY AUDIT

### CRITICAL Vulnerabilities

**[CRITICAL-1] All API Secrets Committed to Repository**
- File: `app-assankheti-backend/.env`
- Exposed: OpenAI API key, Stytch project ID + secret, JWT signing secret
- Impact: Complete auth bypass, API billing abuse, full data breach possible
- Fix: Rotate ALL credentials immediately. Add `.env` to `.gitignore`. Purge from git history.

**[CRITICAL-2] JWT Secret Is Default Placeholder**
```
SECRET_KEY=your-super-secret-key-change-in-production
```
This string is used to sign ALL JSON Web Tokens. Anyone who reads the repo can forge valid tokens and impersonate any user.
- Fix: Generate with `python -c "import secrets; print(secrets.token_hex(32))"`

**[CRITICAL-3] CORS Allows All Origins**
```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True)
```
Using `allow_origins=["*"]` with `allow_credentials=True` is a CORS misconfiguration. Any website can make credentialed cross-origin requests.
- Fix: `allow_origins=["https://yourdomain.com"]`

**[CRITICAL-4] No Backend Role Enforcement**
Any authenticated user (regardless of role) can call farmer-only endpoints. Role is checked on the frontend only.
- Fix: Add `role` claim to JWT. Create `require_role("farmer")` FastAPI dependency. Apply to product, disease, and calculator endpoints.

### HIGH Vulnerabilities

**[HIGH-1] NoSQL Injection via Regex Search**
```python
{"name": {"$regex": query, "$options": "i"}}
# query comes directly from user input without sanitization
```
Malicious regex patterns can cause ReDoS (Denial of Service) or data leakage.
- Fix: Escape special regex characters, or use MongoDB's `$text` index with `$search`

**[HIGH-2] Roboflow API Key Hardcoded in Source Code**
```python
# predictor.py
api_key = "nKR7maxkLCNkzO6PCUa0"
```
Can be extracted by decompiling the APK or reading the repository.
- Fix: Move to environment variable `ROBOFLOW_API_KEY`

**[HIGH-3] No Rate Limiting on Any Endpoint**
- OTP endpoint: unlimited SMS spam (cost attack on Stytch billing)
- Chatbot: unlimited OpenAI API calls (cost attack)
- Disease endpoint: unlimited Roboflow inference calls
- Fix: Implement `slowapi` with per-IP and per-mobile-id limits

**[HIGH-4] Disease Detection Endpoint Has No Authentication**
```python
@router.post("/predict_disease")
async def predict_disease(file: UploadFile, mobile_id: str):
    # No auth dependency — anyone can call this
```

**[HIGH-5] File Upload MIME Type Check Is Spoofable**
Content-Type header is client-controlled. No file magic byte (file signature) validation is performed.
- Fix: Use `python-magic` to validate actual file headers

### MEDIUM Vulnerabilities

**[MEDIUM-1] PII Logged in Plaintext**
```python
logger.info(f"Sending OTP to phone number: {phone_number}")
```
Phone numbers appear in plain text in logs.
- Fix: `logger.info(f"Sending OTP to +**{phone_number[-4:]}")`

**[MEDIUM-2] No Token Revocation Mechanism**
JWTs cannot be invalidated on logout or account compromise.
- Fix: Maintain a token blacklist in Redis, or use short-lived tokens (15 min) with refresh tokens

**[MEDIUM-3] MongoDB Without TLS**
Connection: `mongodb://mongo:27017` — no encryption in transit.
- Fix: Use `mongodb+srv://...` with TLS for production deployments

**[MEDIUM-4] Static Upload Files Publicly Accessible**
Files at `/uploads/community/*.jpg` have no access control. Any URL is publicly accessible.
- Fix: Serve via signed URLs, or add an authorization middleware to the static file route

**[MEDIUM-5] Product Ownership Not Verified on Update/Delete**
```python
# products.py — PUT /{product_id}
# No check that farmer_id == current mobile_id
```
Any authenticated user can edit or delete any product.

### LOW Vulnerabilities

**[LOW-1] Mobile ID as User Identity**
Device-bound UUID means no account recovery and no multi-device support.

**[LOW-2] `email-validator` Dependency Unused**
Present in `requirements.txt`, never imported. Unnecessary attack surface.

**[LOW-3] Debug Health Endpoint Exposed**
`GET /health/db` exposes internal database connectivity status without authentication.

---

## 14. PERFORMANCE AUDIT

### Database Performance

**[PERF-1] Missing Critical Indexes**
Every authenticated request causes a full collection scan on `auth_credentials` (no index on `mobile_id`). Every message history fetch causes a full scan on `community_messages` (no index on `conversation_id`).

**[PERF-2] N+1 Query in Groups List**
The group list endpoint queries member counts in a loop (one query per group). Use MongoDB `$lookup` aggregation instead.

**[PERF-3] Unread Count Calculation**
For each DM conversation in the inbox, a separate `count()` query runs against `community_messages`. A user with 50 conversations triggers 50+ queries on page load. Denormalize `unread_count` on the conversation document and increment atomically with `$inc`.

**[PERF-4] Scraper Clears Collection Before Insert (Race Window)**
```python
await collection.delete_many({})   # Collection empty
await collection.insert_many(...)  # If this fails, stays empty
```
Any request between these two operations returns empty data.

**[PERF-5] TensorFlow Bloats Docker Image**
TensorFlow 2.16.2 adds ~1.5-2 GB. The TFLite model only needs `tflite-runtime` (~50 MB).

### Frontend Performance

**[PERF-6] 2,134-Line God Component**
`components/farmer-dashboard.tsx` re-renders the entire tree on any state change. No `React.memo`, `useMemo`, or `useCallback` visible. Split into focused sub-components.

**[PERF-7] No Image Caching**
Uses raw React Native `<Image>` component. Replace with `expo-image` for lazy loading, progressive rendering, and disk caching.

**[PERF-8] Socket.IO Polling-First Configuration**
```typescript
transports: ['polling', 'websocket']
```
Every mobile connection starts with HTTP long-polling then upgrades. Reverse to `['websocket', 'polling']` for mobile apps.

**[PERF-9] No API Pagination**
`GET /api/v1/products/all` returns up to 100 products at once. As the catalog grows, this becomes increasingly slow.

---

## 15. CODE QUALITY AUDIT

### Architecture Problems

**[ARCH-1] God Components**
`farmer-dashboard.tsx` (2,134 lines) contains 4 tabs, all API calls, all state, all business logic. Violates Single Responsibility Principle.

Recommended split:
```
farmer-dashboard/
  HomeTab.tsx
  MarketplaceTab.tsx
  CommunityTab.tsx
  ProfileTab.tsx
  hooks/useFarmerStats.ts
  hooks/useFarmerProducts.ts
```

**[ARCH-2] Dual Navigation System**
Expo Router (file-based stack) wraps React Navigation (bottom tabs) for dashboards. Should use Expo Router's native `(tabs)` directory instead.

**[ARCH-3] Role Enforcement Inconsistently Split**
Role enforcement exists in `AppRouteGuard` (client), some endpoints (backend), and missing from others. Needs a single centralized FastAPI dependency.

**[ARCH-4] No Dedicated API Client**
Every screen manually constructs `fetch(API_BASE + path, { headers })`. A shared `ApiClient` class would eliminate duplication and centralize error handling.

**[ARCH-5] Mobile ID Anti-Pattern**
Device UUID as user identity breaks multi-device support, account recovery, and GDPR compliance.

### Code Smells

**[SMELL-1] Demo Data Fallbacks Mask Errors**
Multiple screens show hardcoded demo products when the backend is offline. Users see fake data instead of an error message.

**[SMELL-2] `ACCESS_TOKEN_EXPIRE_MINUTES` Env Var Ignored**
```python
# security.py — hardcoded, ignores env var:
timedelta(minutes=720)
```

**[SMELL-3] Platform Fees Hardcoded in UI**
```typescript
const platformFee = subtotal * 0.02;  // 2% hardcoded in product-buy screen
const deliveryFee = 150;              // Rs. 150 hardcoded
```
These should come from a backend configuration endpoint.

**[SMELL-4] Scraper Atomic Safety**
Scrapers use delete-then-insert pattern. Use temp collection + rename for atomic replacement.

**[SMELL-5] Brand Colors Not Centralized**
Primary green `#0d5c4b` is duplicated inline across 40+ files instead of being exported from `constants/theme.ts`.

---

## 16. MISSING FEATURES

### Core Missing Features

| Feature | Impact |
|---|---|
| Account recovery (device loss, phone change) | Critical |
| Multi-device support | High |
| Real payment / escrow integration (UI mentions it, not built) | Critical |
| Order tracking with real status updates | High |
| Server-side push notification triggers | High |
| Product reviews and ratings | Medium |
| Seller profile pages | Medium |
| Server-side product search and filtering | High |
| Farmer earnings dashboard | Medium |
| Crop price alerts | Medium |
| Voice commands (voiceLanguage stored but unused) | Medium |
| Real offline mode | High |
| Admin panel | High |
| Content reporting / flagging | Medium |
| Business user verification | High |

### Missing Backend Validations

| Validation | Issue |
|---|---|
| Role check on product creation | Any user can create listings |
| Ownership check on product update/delete | Any user can modify any product |
| Seller cannot be buyer on same product | User can offer on their own product |
| OTP retry throttle | Unlimited retries allowed |
| Maximum message length | No character limit on chat |
| Maximum active listings per farmer | No limit defined |

---

## 17. BUG DETECTION

### Confirmed Bugs

**[BUG-1] JWT Expiry Config Ignored**
`.env` has `ACCESS_TOKEN_EXPIRE_MINUTES=30` but `security.py` hardcodes `timedelta(minutes=720)`.

**[BUG-2] Wrong Uvicorn Module Name**
README and common usage instruct `app.main:app`. The correct module is `app.main:sio_app`. Using `:app` breaks all Socket.IO real-time features silently.

**[BUG-3] Product Ownership Not Validated**
`PUT /api/v1/products/{id}` and `DELETE /api/v1/products/{id}` do not verify that the requesting user is the farmer who owns the product.

**[BUG-4] Offer Withdrawal Lacks Actor Validation**
```python
# community_offers.py — withdraw endpoint
# Seller accept: validates seller_id == mobile_id (correct)
# Offer withdraw: no validation that mobile_id == buyer_id (BUG)
```
Any authenticated user can withdraw any pending offer.

**[BUG-5] Scraper Race Condition**
```python
await collection.delete_many({})   # Collection empty at this point
await collection.insert_many(...)  # Concurrent requests see empty collection
```

**[BUG-6] Voice Call Screen Non-Functional**
`/call/[contactId]` route is declared and accessible but has no WebRTC, Agora, or Twilio integration. The screen cannot place real calls.

**[BUG-7] `voiceLanguage` Setting Dead Code**
Voice language preference is collected, stored in AsyncStorage, and sent to the backend. No text-to-speech or voice feature uses it anywhere in the codebase.

**[BUG-8] Terminal Copy-Paste Fails with Comment Characters**
Inline `#` comments on separate lines in multi-line shell commands cause `zsh: command not found: #`. Documentation must provide clean commands.

---

## 18. RECOMMENDED ARCHITECTURE IMPROVEMENTS

### 18.1 Backend Structure

```
src/app/
|-- core/
|   |-- config.py           (Pydantic Settings — centralize all env vars)
|   |-- security.py         (JWT create/verify)
|   +-- dependencies.py     (all FastAPI Depends() definitions in one place)
|
|-- domain/
|   |-- auth/
|   |   |-- router.py
|   |   |-- service.py
|   |   +-- schemas.py
|   |-- marketplace/
|   |   |-- router.py
|   |   |-- service.py
|   |   +-- schemas.py
|   |-- community/
|   |   |-- router.py
|   |   |-- service.py
|   |   +-- schemas.py
|   +-- agriculture/
|       |-- router.py
|       |-- disease_service.py
|       +-- calculator_service.py
|
|-- infrastructure/
|   |-- database/
|   |   |-- connection.py
|   |   +-- repositories/   (one repository class per domain)
|   |-- external/
|   |   |-- stytch.py
|   |   |-- openai_client.py
|   |   +-- roboflow.py
|   +-- storage/
|       +-- file_service.py
|
+-- realtime/
    +-- socket_gateway.py
```

**Add Missing Indexes:**
```python
await community_messages.create_index([("conversation_id", 1), ("created_at", -1)])
await community_conversations.create_index([("participants", 1)])
await auth_credentials.create_index([("mobile_id", 1)], unique=True)
await community_blocks.create_index([("blocker_id", 1), ("blocked_id", 1)])
await product_listings.create_index([("status", 1), ("category", 1), ("created_at", -1)])
```

**Add Rate Limiting:**
```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@router.post("/send-otp/")
@limiter.limit("5/minute")
async def send_otp(...): ...

@router.post("/chat")
@limiter.limit("30/minute")
async def chat(...): ...
```

**Add Backend Role Enforcement:**
```python
def require_role(required_role: str):
    async def _check(mobile_id: str = Depends(get_current_mobile_id)):
        user = await db.user_settings.find_one({"mobile_id": mobile_id})
        if not user or user.get("character") != required_role:
            raise HTTPException(403, "Insufficient permissions")
    return _check

@router.post("/products/")
async def create_product(_: None = Depends(require_role("farmer"))): ...
```

### 18.2 Frontend Structure

**Use Expo Router Tab Groups:**
```
app/
  (farmer)/
    _layout.tsx      (tab navigator for farmers)
    index.tsx        (home tab)
    marketplace.tsx  (marketplace tab)
    community.tsx    (community tab)
    profile.tsx      (profile tab)
  (community)/
    _layout.tsx      (tab navigator for buyers)
    index.tsx
    inbox.tsx
    settings.tsx
```

**Centralized API Client:**
```typescript
// lib/api/client.ts
class ApiClient {
  async get<T>(path: string): Promise<T>
  async post<T>(path: string, body: unknown): Promise<T>
  async put<T>(path: string, body: unknown): Promise<T>
  async delete(path: string): Promise<void>
}

// lib/api/products.ts
export const productsApi = {
  list: (category?: string) => client.get<ProductResponse[]>(`/products/all`),
  create: (data: ProductCreate) => client.post<ProductResponse>('/products/', data),
  update: (id: string, data: Partial<ProductCreate>) => client.put(`/products/${id}`, data),
  delete: (id: string) => client.delete(`/products/${id}`),
}
```

**Centralize Brand Colors:**
```typescript
// constants/theme.ts (extend existing file)
export const AppColors = {
  brand: {
    primary:     '#0d5c4b',
    primaryLight:'#10b981',
    background:  '#f7faf6',
    cream:       '#f5f1e8',
    accent:      '#f59e0b',
    error:       '#ef4444',
    success:     '#10b981',
  }
}
```

### 18.3 User Identity Architecture

Replace the device UUID-only system:

```
Current:
  device_uuid -> all user data  (device-bound, no recovery)

Recommended:
  phone_number -> OTP -> account_id  (persistent, survives device change)
  device_uuid  -> session + presence only
  account_id   -> all user data, all history

Migration path:
  1. Add account_id field to auth_credentials (= Stytch user_id)
  2. Dual-write: save data by both mobile_id and account_id
  3. On re-login from new device: restore account_id linkage
  4. Gradually migrate queries to use account_id
```

---

## 19. PRODUCTION READINESS REPORT

### Scorecard

```
+-----------------------------------------------------+
|            PRODUCTION READINESS SCORECARD            |
+---------------------+-------------------------------+
| Frontend            | ##########....  5 / 10        |
| Backend             | ########......  4 / 10        |
| Security            | ####..........  2 / 10        |
| Infrastructure      | ####..........  2 / 10        |
| Testing             | ####..........  2 / 10        |
| Documentation       | ######........  3 / 10        |
+---------------------+-------------------------------+
| OVERALL SCORE       | #######.......  3.5 / 10      |
+---------------------+-------------------------------+

STATUS: NOT READY FOR PRODUCTION

REASON: Critical security vulnerabilities (all secrets exposed,
        no backend role enforcement, JWT secret is a placeholder)
        and missing production infrastructure (no CDN, no monitoring,
        no backups, no EAS Build pipeline, no rate limiting).
```

### Subscore Breakdown

**Frontend (5/10):**
- Core screens implemented and functional
- Bilingual support is consistent and well-designed
- God components hurt maintainability and performance
- No EAS Build configured for app store submission
- Demo data fallbacks mask real errors

**Backend (4/10):**
- Core API features are implemented
- Real-time chat with Socket.IO is well-designed
- AI integration (chatbot + disease) is functional
- Missing indexes will cause production performance collapse
- No role enforcement means any user can call any endpoint

**Security (2/10):**
- Placeholder JWT secret
- All third-party credentials committed to version control
- No rate limiting on any endpoint
- No input size limits on text fields
- CORS allows all origins

**Infrastructure (2/10):**
- Basic Docker Compose works for local dev
- No SSL/TLS
- No CDN for media files
- No backup strategy for MongoDB
- No monitoring, alerting, or log aggregation

### Priority Fix List (Before Any Public Launch)

```
PRIORITY 1 — Security (Do Immediately):
  1. Rotate OpenAI API key, Stytch credentials, generate real JWT secret
  2. Add .env to .gitignore, purge secrets from git history
  3. Fix CORS to whitelist specific origins
  4. Add rate limiting to OTP, chatbot, and disease endpoints

PRIORITY 2 — Correctness:
  5. Use sio_app (not app) in all uvicorn commands
  6. Remove --reload from production Dockerfile CMD
  7. Add product ownership validation on update/delete
  8. Fix offer withdrawal to validate buyer identity

PRIORITY 3 — Performance:
  9. Add missing MongoDB indexes (auth_credentials, community_messages)
  10. Implement pagination on product list and message history endpoints

PRIORITY 4 — Features:
  11. Add backend role enforcement for farmer-only endpoints
  12. Replace TensorFlow with tflite-runtime to reduce image size
  13. Configure EAS Build for app store deployment
```

---

## 20. FINAL COMPLETE USER FLOW

### 20.1 Farmer User Flow

```
FIRST LAUNCH
|
+-- [Splash] -- Generates UUID mobile_id
|               POST /api/v1/user/generate/mobileid
|
+-- [Terms] --- POST /api/v1/user/accept-terms/
|               Sets: termsAccepted = true
|
+-- [Language] - POST /api/v1/user/language-voice/
|                Sets: English or Urdu preference
|
+-- [Role] ---- Chooses "Farmer"
|               POST /api/v1/user/character/
|               POST /api/v1/user/devicesetting/{mobile_id}
|
+-- [Crop] ---- Picks crops (Rice, Wheat, etc.)
|               POST /api/v1/user/crop-selection/{mobile_id}
|               Auto-joins crop-specific community groups
|
+-- [Login] --- Enters phone number
|               POST /api/v1/auth/send-otp/  -> Stytch sends SMS
|
+-- [OTP] ----- Enters 6-digit code
|               POST /api/v1/auth/verify-otp/  -> Receives JWT
|               Stores auth.* in AsyncStorage
|
+-- [FARMER DASHBOARD]
    |
    +-- HOME TAB
    |     Shows: Welcome message, stats, quick action buttons
    |     Actions: Add Product, View Products, Disease Scan,
    |              Smart Budget, Crop Recommendations
    |
    +-- MARKETPLACE TAB (Selling)
    |     View my listings:    GET /api/v1/products/farmer/{id}
    |     Add product:         POST /api/v1/media/upload
    |                          POST /api/v1/products/
    |     Edit product:        PUT /api/v1/products/{id}
    |     Delete product:      DELETE /api/v1/products/{id}
    |     Receive offer:       offer:status_changed socket event
    |       Accept offer:      POST /api/v1/community/offers/{id}/accept
    |       Reject offer:      POST /api/v1/community/offers/{id}/reject
    |
    +-- AI TOOLS
    |     Disease Scan:   POST /api/v1/disease/predict_disease
    |                     -> Returns disease + confidence
    |                     POST /api/v1/disease/treatment (OpenAI advice)
    |     Calculators:    POST /api/v1/calculator/fertilizer
    |                     POST /api/v1/calculator/budget
    |                     POST /api/v1/calculator/irrigation
    |     Market Prices:  GET /api/v1/calculator/prices/crop
    |     AI Chatbot:     POST /api/v1/chatbot/chat
    |
    +-- COMMUNITY TAB
    |     Inbox:      GET /api/v1/community/dm/inbox/{mobile_id}
    |     Groups:     GET /api/v1/community/groups/list/{mobile_id}
    |     DM Chat:    WebSocket dm:send / dm:received events
    |     Group Chat: WebSocket group:send / group:received events
    |
    +-- PROFILE TAB
          Edit Profile:   PATCH /api/v1/user/devicesetting/{mobile_id}
          Language:       POST /api/v1/user/language-voice/
          Logout:         Clears auth.* from AsyncStorage
```

### 20.2 Business User / Simple User Flow

```
FIRST LAUNCH (same onboarding — no crop selection step)
|
+-- [Splash -> Terms -> Language -> Role -> Login -> OTP]
|
+-- [COMMUNITY DASHBOARD]
    |
    +-- BROWSE PRODUCTS
    |     GET /api/v1/products/all?category=&status=active
    |     Filter by category: /category-products/[category]
    |     Search (client-side filter on loaded results)
    |
    +-- PRODUCT PURCHASE FLOW  (/product-buy/[productId])
    |     View: product details, farmer info, stock
    |     Calculate: subtotal + delivery fee + 2% platform fee
    |     Actions:
    |       Message farmer:
    |           POST /api/v1/community/dm/resolve
    |           Navigate to /community/chat/[id]
    |       Make offer:
    |           POST /api/v1/community/offers/create
    |           -> System message in DM thread
    |           -> Farmer receives notification
    |           -> Farmer accepts/rejects
    |           -> Buyer receives notification
    |       Place order:
    |           Navigate to /user-orders
    |
    +-- INBOX (/community/inbox)
    |     DM conversations with farmers (negotiation threads)
    |     Crop-specific group chats
    |     Offer status updates in real-time via Socket.IO
    |
    +-- SETTINGS
          Language toggle, notifications on/off,
          blocked users management, logout
```

### 20.3 Real-Time Communication Flow

```
SOCKET.IO EVENT FLOW
=====================

BUYER                    BACKEND                    FARMER
  |                         |                          |
  |-- Connect (JWT) ------->|                          |
  |                         | Joins room: user:{id}    |
  |                         |<-------- Connect (JWT) --|
  |                         | Joins room: user:{farmer_id}
  |                         | Joins room: group:{crop_id}
  |                         |                          |
  |-- dm:send ------------->|                          |
  |   { to: farmer_id,      |-- dm:sent -------------->| (ACK to sender)
  |     body: "Hello" }     |-- dm:received ---------->| (to farmer's room)
  |<-- dm:sent (ACK) -------|                          |
  |                         |                          |
  |-- offer:create (HTTP) ->|                          |
  |   { amount: 500 }       |-- notification:new ------>|
  |                         |-- offer:status_changed -->|
  |                         |                          |
  |                         |<-- offer:accept (HTTP) --|
  |<-- offer:status_changed -|                          |
  |<-- notification:new -----|                          |
  |                         |-- offer:status_changed -->| (ACK)
  |                         |                          |
  |-- presence:heartbeat -->|                          |
  |                         | Updates last_active_at   |
  |                         |-- presence:update ------->| (broadcast)
```

---

## APPENDIX: CHATBOT INTENT CLASSIFICATION FLOW

```
Incoming message
      |
      v
is_pure_greeting?
      | Yes -> bilingual greeting (first time) or "already greeted" response
      | No
      v
is_unsafe_dosage_request?  (overdose, double dose, kilo apply)
      | Yes -> safety warning, NO AI call
      | No
      v
is_out_of_scope?  (politics, movie, coding, sports, crypto)
      | Yes -> scope redirect, NO AI call
      | No
      v
is_unclear?  (< 2 chars, single word "help", "haan", "ok")
      | Yes -> clarification prompt, NO AI call
      | No
      v
Load conversation history (last 10 messages)
      |
      v
is_follow_up? AND has_farming_context_in_history?
      | Yes -> proceed with history
      | No  -> send as new question
      |
      v
Build system prompt (Pakistani farming context)
      |
      v
OpenAI gpt-3.5-turbo (max_tokens=420, temperature=0.4)
      |
      v
Clean output (remove emojis, markdown, cap at 900 chars / 8 lines)
      |
      v
Save to chat_messages + update chat_sessions
      |
      v
Return response to client
```

---

## APPENDIX: DISEASE DETECTION FALLBACK CHAIN

```
User uploads crop image
      |
      v
Try Roboflow API (primary — cloud, fast)
      |
      +-- Success -> return { disease, confidence, source: "roboflow" }
      |
      +-- Failure -> Try local TFLite model (offline fallback)
                         |
                         +-- confidence >= 30% -> return result
                         |
                         +-- confidence < 30%  -> return "Not identifiable"
```

**TFLite Rice Disease Classes (10):**
- Bacterial Leaf Blight
- Brown Spot
- Healthy Rice Leaf
- Leaf Blast
- Leaf Scald
- Narrow Brown Leaf Spot
- Neck Blast
- Rice Hispa
- Sheath Blight
- Tungro

---

*End of Assan Kheti — Complete Master Technical Audit Document v1.0*
*Generated: 2026-05-16*
