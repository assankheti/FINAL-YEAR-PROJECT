## 7. Project Completion Status

The project has progressed substantially against the original plan. The repository confirms a working full-stack solution with a React Native/Expo frontend, a FastAPI backend, MongoDB persistence, OTP authentication through Stytch, AI-assisted disease detection, calculator services, community messaging, marketplace payments with escrow, and bilingual English/Urdu support. A small number of items in the broader project brief were not explicitly verified in the inspected codebase and are marked accordingly as [VERIFY].

### Table 7.1: Project Completion Status

| Module Name | Status (Complete / Partially Implemented / Not Implemented) |
|---|---|
| Splash screen and app boot flow | Complete |
| Language selection and bilingual UI (English/Urdu) | Complete |
| Role-based onboarding (Farmer / Buyer / Admin [VERIFY]) | Complete |
| OTP authentication with Stytch | Complete |
| Device settings and onboarding persistence | Complete |
| Farmer dashboard and buyer-facing navigation | Complete |
| AI crop disease detection (online + offline fallback) | Complete |
| Disease result history and offline diagnosis | Complete |
| Crop recommendation engine | Complete |
| Smart budget planner | Complete |
| Fertilizer calculator | Complete |
| Irrigation calculator and weather-aware advisory | Complete |
| Product listings and marketplace browsing | Complete |
| Stripe checkout and escrow payment flow | Complete |
| Order tracking, refunds, and transaction history | Complete |
| Community chat, groups, inbox, and direct messaging | Complete |
| Community notifications and government scheme alerts | Complete |
| Accessibility voice guidance / TalkBack-style readout | Complete |
| Backend APIs and MongoDB collections | Complete |
| Deployment configuration and environment management | Complete |
| External integrations referenced in the brief (OpenWeatherMap / OneSignal / Whisper) [VERIFY] | Partially Implemented |
| Complete System | Complete |

Additional work completed beyond the original requirements includes accessibility voice guidance, per-screen speech highlighting, offline caching for selected screens, secure deep-link payment redirects, and a production-oriented Render configuration.

### Table 7.2: Objective(s)/Target(s) Status

| Target/Objective | Status (Completed / Partially Completed / Not Completed) | Reason(s) |
|---|---|---|
| Build a mobile-first smart agriculture assistant for farmers and buyers | Completed | The repository implements a complete mobile frontend and API backend for farming, shopping, messaging, and advisory workflows. |
| Provide bilingual English/Urdu onboarding and interface support | Completed | Language selection, persistent language settings, and Urdu/English UI strings are present across major screens. |
| Implement OTP-based authentication and secure user setup | Completed | Stytch OTP send/verify endpoints and the mobile login flow are implemented. |
| Support role-based onboarding and navigation | Completed | Farmer, buyer, and admin-oriented pathways are present in onboarding and routing logic. |
| Deliver AI crop disease detection with online and offline inference | Completed | The disease screen uses an online predictor with a TFLite fallback and supports saved diagnosis history. |
| Recommend crops using weather, soil, and market conditions | Completed | The crop recommendation screen combines weather, soil, and market data and caches results for reuse. |
| Provide a smart budget planner and fertilizer calculator | Completed | The budget screen and calculator APIs compute farm cost planning, fertilizer quantities, and expected profit. |
| Enable irrigation advisory and weather alerts | Completed | Irrigation logic exists in the backend and weather alert settings are present in device preferences and notifications. |
| Build a secure B2C marketplace with checkout and escrow | Completed | Product listings, buyer checkout, Stripe payment session creation, and escrow state handling are implemented. |
| Provide community communication and notification features | Completed | Community inbox, direct chat, groups, offers, and in-app notifications are implemented in the frontend and backend. |
| Add accessibility voice guidance and screen readout | Completed | Voice guidance, speech highlighting, and page-level readout are implemented across key screens. |
| Integrate the full proposed third-party stack exactly as stated in the brief (OpenWeatherMap / OneSignal / Whisper) [VERIFY] | Partially Completed | The repository confirms weather-related UI/logic, notifications, and voice guidance, but the exact SDK usage for OpenWeatherMap, OneSignal, and Whisper was not explicitly verified in the inspected codebase. |
| Number of Targets Completed | 11 | Eleven objectives are fully satisfied by verified code and configuration. |
| Number of Targets Partially Completed | 1 | One objective is only partially verified because some external SDK names from the brief were not found directly in the repository. |
| Number of Targets Not Completed | 0 | No major objective verified in the codebase is completely absent. |

## 8. Deployment/Installation Guide

This guide is based on the repository files that were inspected, including `README.md`, `.env.example`, `app-assankheti-backend/requirements.txt`, `app-assankheti-backend/requirements-render.txt`, `app-assankheti-backend/start.sh`, `app-assankheti-frontend/package.json`, `app-assankheti-frontend/app.config.js`, and `app-assankheti-frontend/config/env.ts`.

### 8.1 Prerequisites

Before installing the project, ensure the following tools and accounts are available:

1. **Node.js** 18+ and npm
2. **Python** 3.11
3. **MongoDB Atlas** account or a local MongoDB instance
4. **Stytch** project credentials for OTP login
5. **Stripe** secret, publishable, and webhook keys for payments and escrow
6. **Gemini API key** for chatbot/treatment advice features
7. **Stream Chat** credentials for messaging features
8. **Expo Go** on a mobile device, or Android Studio / Xcode for emulators
9. **Git** for cloning the repository

> The repository README references Docker Compose, but the top-level `docker-compose.yml` was not present in the inspected workspace [VERIFY]. Use the local installation steps below unless you restore that file.

### 8.2 Clone the Repository

1. Open a terminal.
2. Clone the repository.
3. Move into the project root.

```bash
git clone <your-repository-url>
cd FINAL-YEAR-PROJECT
```

### 8.3 Create and Configure Environment Files

The repository contains example environment files for local development and deployment.

#### Root environment file
Create a root `.env` file from `.env.example`:

```bash
cp .env.example .env
```

#### Frontend environment file
Create the frontend environment file from `app-assankheti-frontend/.env.example`:

```bash
cp app-assankheti-frontend/.env.example app-assankheti-frontend/.env
```

#### Render deployment values
If you plan to deploy the backend on Render, use `app-assankheti-backend/render.env.example` as the checklist for Render environment variables.

### 8.4 Required Environment Variables

#### Root / shared variables
| Variable | Purpose |
|---|---|
| `BACKEND_PORT` | Backend HTTP port for local runs. |
| `FRONTEND_PORT` | Frontend dev server port. |
| `MONGO_HOST` | MongoDB host for local container setups. |
| `MONGO_PORT` | MongoDB port for local container setups. |
| `MONGODB_LOCAL` | Local MongoDB connection string. |
| `MONGODB_URI` | MongoDB Atlas connection string used in deployment. |
| `MONGO_DB_NAME` | Database name used by the backend. |
| `APP_NAME` | Application name label. |
| `SECRET_KEY` | JWT/security secret used by backend services. |
| `ALGORITHM` | JWT algorithm setting. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry configuration. |
| `ADMIN_EMAIL` | Admin contact email. |
| `STYTCH_PROJECT_ID` | Stytch project identifier. |
| `STYTCH_SECRET` | Stytch secret key. |
| `STYTCH_ENV` | Stytch environment (`test` / `live`). |
| `STYTCH_ENVIRONMENT` | Alternate Stytch environment key used by code. |
| `STYTCH_PROJECT_DOMAIN` | Stytch project domain [VERIFY]. |
| `STYTCH_PROJECT_SLUG` | Stytch project slug [VERIFY]. |
| `USE_PRODUCTION_API` | Frontend flag to use production backend URL. |
| `PRODUCTION_API_URL` | Production backend URL. |
| `API_URL` | Local backend URL for Expo devices/emulators. |
| `GEMINI_API_KEY` | Gemini API key for chatbot/treatment advice. |
| `GEMINI_MODEL` | Gemini model name. |
| `STRIPE_PUBLISHABLE_KEY` | Stripe client-side key. |
| `STRIPE_SECRET_KEY` | Stripe server-side secret key. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret. |
| `STRIPE_ADMIN_MOBILE_IDS` | Admin mobile IDs allowed for payout/admin actions. |
| `PLATFORM_COMMISSION_RATE` | Marketplace commission percentage. |
| `PLATFORM_SERVICE_FEE_PKR` | Fixed service fee in PKR. |
| `FRONTEND_URL` | App URL used for payment and redirect links. |
| `STREAM_APP_ID` | Stream Chat app ID. |
| `STREAM_API_KEY` | Stream Chat public API key. |
| `STREAM_API_SECRET` | Stream Chat server secret. |
| `STREAM_ADMIN_MOBILE_IDS` | Admin mobile IDs for Stream Chat roles. |
| `ENABLE_OFFLINE_DISEASE_MODEL` | Enables local TFLite disease detection fallback. |
| `RUN_STARTUP_SCRAPERS` | Enables scraper execution on startup. |
| `RUN_PERIODIC_SCRAPERS` | Enables periodic scraper execution. |
| `UPLOAD_ROOT` | Upload storage path for deployment environments. |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | MongoDB connection timeout for deployment. |

#### Frontend-specific environment values
| Variable | Purpose |
|---|---|
| `API_URL` | Overrides the API base URL when running locally. |
| `PRODUCTION_API_URL` | Production backend URL for Expo builds. |
| `USE_PRODUCTION_API` | Forces the app to use the production backend. |
| `STREAM_API_KEY` | Stream Chat public key exposed to the app. |

### 8.5 Backend Installation and Run Steps

1. Change into the backend folder.
2. Create a Python virtual environment.
3. Activate the virtual environment.
4. Install backend dependencies.
5. Start the FastAPI server.

```bash
cd app-assankheti-backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=src uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Backend access points
- API root: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health/db`

### 8.6 Database Setup and Connection

1. Create a MongoDB Atlas cluster.
2. Create a database user with read/write permissions.
3. Allow your IP address in the Atlas network access list.
4. Copy the Atlas connection string into `MONGODB_URI`.
5. Set `MONGO_DB_NAME=dbasssankheti` or your preferred database name.
6. Start the backend and confirm the `/health/db` endpoint returns `{"status":"ok"}`.

If using a local MongoDB instance for development, set `MONGODB_LOCAL=mongodb://localhost:27017` and update the backend to use the local connection string as documented in the README.

### 8.7 ML Model Setup

The repository already includes the offline rice disease model file at `app-assankheti-backend/src/app/models/rice_disease_model.tflite`.

1. Verify that the file exists in the backend `models` folder.
2. Set `ENABLE_OFFLINE_DISEASE_MODEL=true` in the backend environment when you want local inference fallback.
3. Install the backend requirements exactly as listed in `requirements.txt` or `requirements-render.txt`.
4. Start the backend.
5. Test the disease endpoint from Swagger UI or the app.

The disease predictor is configured to try an online classification service first and then fall back to the offline TFLite model when enabled. The online API credentials were present in the inspected codebase [VERIFY]; move such credentials to environment variables before public release.

### 8.8 Frontend Installation and Run Steps

1. Change into the frontend folder.
2. Install JavaScript dependencies.
3. Start the Expo development server.
4. Open the app on a simulator or mobile device.

```bash
cd app-assankheti-frontend
npm install
npm run start
```

#### Emulator/device commands
```bash
npm run android
npm run ios
```

### 8.9 Connecting the Frontend to the Backend

The frontend reads its API configuration from `app-assankheti-frontend/config/env.ts` and the Expo configuration in `app-assankheti-frontend/app.config.js`.

- For **local phone testing**, set `API_URL` to your laptop’s LAN IP, for example `http://192.168.1.20:8000`.
- For **emulators**, `10.0.2.2` may be used on Android when needed.
- For **production builds**, set `USE_PRODUCTION_API=true` and `PRODUCTION_API_URL` to the deployed backend URL.

### 8.10 Render Deployment Steps

If you deploy the backend to Render, use the instructions implied by `render.yaml` and `app-assankheti-backend/start.sh`.

1. Create a new Render Web Service.
2. Point the root directory to `app-assankheti-backend`.
3. Set the Python version to `3.11.11`.
4. Use the build command from `render.yaml`:

```bash
pip install --upgrade pip && pip install -r requirements-render.txt
```

5. Use the start command from `start.sh`:

```bash
bash start.sh
```

6. Add all required secret environment variables in Render.
7. Confirm the service health at `/`.

### 8.11 How to Access the Running App

- **Local backend**: open `http://localhost:8000/docs`
- **Local frontend**: open the Expo QR code in Expo Go or the emulator window
- **Deployed backend**: use the Render service URL
- **Deployed mobile app**: build via Expo / EAS and point it to the production API URL

## 9. User Manual

This section explains how a new user operates the system after installation. The instructions are written in simple language so that farmers, buyers, and administrators can use the app independently.

### 9.1 User Roles

- **Farmer**: Uses crop tools, disease detection, smart budget, product listing, and order management.
- **Buyer**: Browses products, places orders, tracks payments, and contacts farmers.
- **Admin [VERIFY]**: Oversees system records, payouts, and backend management. A dedicated admin mobile screen was not clearly verified in the repository, so any report text about an admin app should be checked against your final build.

### 9.2 Sign Up and OTP Login

1. Open the app.
2. Select your language.
3. Choose your user role.
4. Enter your mobile number.
5. Tap the button to send the OTP.
6. Enter the OTP you receive by SMS.
7. Tap verify/login.
8. The system opens the correct dashboard for your role.

**What the app does:**
- It checks your number with Stytch OTP.
- It saves your role and language preferences.
- It opens the farmer or buyer experience automatically after login.

### 9.3 Switching Language (English / Urdu)

1. Open the language selection screen during first use or from settings.
2. Choose **English** or **Urdu**.
3. Confirm your choice.
4. The app saves the setting for future sessions.

**What the app does:**
- It changes the labels, buttons, and messages on the screen.
- It also updates voice guidance language to match your selection.
- Punjabi is not shown in the verified codebase [VERIFY].

### 9.4 Opening the Dashboard

1. After login, the app opens the dashboard for your role.
2. Use the bottom navigation bar to move between pages.
3. Use the dashboard cards to open major features quickly.

**Farmer dashboard shows:**
- Disease detection
- Crop recommendations
- Smart budget
- Product management
- Notifications and community tools

**Buyer dashboard shows:**
- Product browsing
- Orders
- Messages
- Payment flow

### 9.5 Capturing a Photo for Disease Detection

1. Open **Disease Detection**.
2. Allow camera and photo-library permission if the phone asks.
3. Take a clear photo of the affected leaf or crop.
4. You may also choose an image from the gallery.
5. Tap **Analyze**.
6. Wait for the result.
7. Read the disease name, confidence, and treatment instructions.

**What the app does:**
- It first tries the online prediction flow.
- If offline mode is enabled, it uses the local TFLite model stored in the app’s backend.
- It can identify rice diseases such as Brown Spot, Hispa, Sheath Blight, and other supported classes shown in the model labels.

### 9.6 Viewing Crop Recommendations

1. Open **Crop Recommendations**.
2. Allow location access if the phone asks.
3. Wait while the app calculates suitable crops.
4. Read the top recommendation and supporting explanation.
5. Scroll to compare other crop options.

**What the app does:**
- It reviews weather, soil, and market conditions.
- It stores a cached recommendation for offline viewing.
- It shows crop suitability scores and simple explanations.

### 9.7 Using Irrigation Alerts and Weather Alerts

1. Open the notifications or alerts section.
2. Read the weather warnings and irrigation reminders.
3. Follow the suggested actions, such as watering before heat or protecting crops before rain.

**What the app does:**
- It stores weather alert preferences in device settings.
- It shows reminders for rain, rising temperature, pest pressure, and irrigation care.
- It can alert farmers about important field conditions.

### 9.8 Using the Smart Budget Planner

1. Open **Smart Budget**.
2. Select your crop.
3. Choose the soil type.
4. Enter the land area.
5. Select fertilizers, pesticides, and seed types.
6. Enter any other costs.
7. Tap **Calculate Budget**.

**What the app does:**
- It estimates the total farming cost.
- It shows fertilizer, pesticide, seed, and other expense breakdowns.
- It gives a simple summary of expected budget and profit.

### 9.9 Using the Fertilizer Calculator

1. Open the budget/calculator section.
2. Select the crop and land area.
3. Choose the fertilizer from the available list.
4. Tap calculate.
5. Review the recommended amount.

**What the app does:**
- It calculates fertilizer needs per acre.
- It can also show fertilizer price references from the backend scraper.
- It helps farmers avoid underuse or overuse of fertilizers.

### 9.10 Offline Diagnosis

1. Open **Disease Detection** without an internet connection.
2. Make sure offline disease mode is enabled by the system configuration.
3. Upload a crop image.
4. Tap **Analyze**.
5. Read the result from the local model.

**What the app does:**
- It uses the offline TFLite model when the network is unavailable.
- It continues to return a crop health result instead of stopping the workflow.
- If the offline model is not enabled, the app tells the user that diagnosis is unavailable offline.

### 9.11 Government Scheme Notifications

1. Open **Notifications**.
2. Read alerts about government schemes, weather, prices, pests, and orders.
3. Tap a notification to view details.
4. Mark items as read after checking them.

**What the app does:**
- It keeps farmers informed about scheme updates such as subsidy or installment messages.
- It groups alerts so important items can be reviewed quickly.
- It keeps notification history available for later review.

### 9.12 Buying and Selling in the Marketplace with Escrow

#### For Farmers
1. Open **Add Product** or **Farmer Products**.
2. Enter product name, category, price, stock, and description.
3. Add product images.
4. Save the listing.
5. Watch for buyer orders and messages.

#### For Buyers
1. Open the marketplace or product list.
2. Open a product card.
3. Read the product details.
4. Select quantity.
5. Continue to checkout.
6. Complete the payment.
7. Track the order status in the orders page.

**What the app does:**
- It creates a Stripe checkout session.
- It records the order in the database.
- It holds payment in escrow until the order progresses according to the payment flow.
- It supports refunds and transaction history.

### 9.13 Communicating with Farmers or Buyers

1. Open community inbox or chat.
2. Select a conversation.
3. Type your message.
4. Send the message.

**What the app does:**
- It saves direct messages and group messages.
- It supports community channels and product-related chats.
- It can read out messages through voice guidance on supported screens.

### 9.14 Voice Guidance / Accessibility

1. Open **Accessibility Settings** from the settings screen.
2. Turn voice guidance on.
3. Select English or Urdu voice language.
4. Adjust speed or pitch if needed.
5. Tap the test button to hear a sample.

**What the app does:**
- It reads important screen text aloud.
- It highlights the element being spoken.
- It helps users navigate the app without needing to read every label.

## 10. References

The following references are formatted in IEEE style. Items marked [VERIFY] were not fully identified in the inspected repository and should be checked against your final thesis sources before submission.

[1] FastAPI, “FastAPI Documentation,” 2026. [Online]. Available: https://fastapi.tiangolo.com/. [Accessed: 9-Jun-2026].

[2] MongoDB, “MongoDB Manual,” 2026. [Online]. Available: https://www.mongodb.com/docs/manual/. [Accessed: 9-Jun-2026].

[3] MongoDB, “Motor Async Python Driver Documentation,” 2026. [Online]. Available: https://motor.readthedocs.io/. [Accessed: 9-Jun-2026].

[4] Expo, “Expo Documentation,” 2026. [Online]. Available: https://docs.expo.dev/. [Accessed: 9-Jun-2026].

[5] Expo, “Expo Router Documentation,” 2026. [Online]. Available: https://docs.expo.dev/router/introduction/. [Accessed: 9-Jun-2026].

[6] React Native, “React Native Documentation,” 2026. [Online]. Available: https://reactnative.dev/docs/getting-started. [Accessed: 9-Jun-2026].

[7] Expo, “Expo Speech,” 2026. [Online]. Available: https://docs.expo.dev/versions/latest/sdk/speech/. [Accessed: 9-Jun-2026].

[8] Expo, “Expo Localization,” 2026. [Online]. Available: https://docs.expo.dev/versions/latest/sdk/localization/. [Accessed: 9-Jun-2026].

[9] Stytch, “Stytch OTP Authentication Documentation,” 2026. [Online]. Available: https://stytch.com/docs/. [Accessed: 9-Jun-2026].

[10] Stripe, “Stripe Documentation,” 2026. [Online]. Available: https://docs.stripe.com/. [Accessed: 9-Jun-2026].

[11] OpenWeather, “OpenWeather API Documentation,” 2026. [Online]. Available: https://openweathermap.org/api. [Accessed: 9-Jun-2026]. [VERIFY]

[12] Ultralytics, “Ultralytics YOLO Documentation,” 2026. [Online]. Available: https://docs.ultralytics.com/. [Accessed: 9-Jun-2026]. [VERIFY]

[13] OpenCV, “OpenCV Documentation,” 2026. [Online]. Available: https://docs.opencv.org/. [Accessed: 9-Jun-2026]. [VERIFY]

[14] TensorFlow, “TensorFlow Lite Guide,” 2026. [Online]. Available: https://www.tensorflow.org/lite. [Accessed: 9-Jun-2026].

[15] Stream, “Stream Chat Documentation,” 2026. [Online]. Available: https://getstream.io/chat/docs/. [Accessed: 9-Jun-2026].

[16] [VERIFY] Rice disease image dataset used to train the offline `.tflite` model. The exact dataset name and publication details were not visible in the repository.

[17] [VERIFY] CNN/transfer-learning paper used for rice disease classification. The exact paper title and authors were not visible in the repository.

[18] [VERIFY] Whisper / speech-recognition source. The inspected codebase uses on-device text-to-speech via `expo-speech`; no Whisper-based speech-to-text implementation was confirmed.

## 11. Project Summary Form

| Field | Details |
|---|---|
| Name of Project | Asaan Kheti (repository branding appears as "Assan Kheti" [VERIFY]) |
| Project Type | Mobile Application / AI-Based Smart Agriculture Platform |
| Department | Department of Computer Science / BSCS |
| Start Date | [FILL IN] |
| Completion Date | [FILL IN] |
| Supervisor / Team Leader | Supervisor: [FILL IN] / Team Leader: [FILL IN] |
| Team Members | Ahmad Naveed (L1F22BSCS0386); Waleed Ahmad (L1F22BSCS0387); Muhammad Yaqoob (L1F22BSCS0364) |
| Funding Agency (if any) / Amount of Funding (if any) | None (self-funded) |
| Assign SDGs to Project | **SDG 2 – Zero Hunger:** Supports better agricultural decisions and improved farm productivity. <br> **SDG 8 – Decent Work and Economic Growth:** Helps farmers earn more through direct market access and efficient planning. <br> **SDG 9 – Industry, Innovation and Infrastructure:** Applies mobile, AI, and cloud services to modernize agriculture. <br> **SDG 12 – Responsible Consumption and Production:** Encourages informed fertilizer use, budgeting, and farm resource planning. |
| Motivation of Project | Farming decisions in Pakistan are often made with incomplete information about crop health, weather, prices, and market demand. This project was motivated by the need to give farmers a practical digital assistant that combines diagnosis, planning, and trading in one mobile platform. The system aims to reduce guesswork, improve decision-making, and make agricultural support more accessible in English and Urdu. |
| Practical / Potential Application | The system can be used by farmers for crop disease detection, crop planning, budgeting, and direct product sales. Buyers can use it to find agricultural products and place secure orders. The platform can also support agricultural advisory use cases such as weather alerts, government scheme updates, and community knowledge sharing. |
| Abstract | Asaan Kheti is a mobile-based smart agriculture assistant designed to help farmers make faster and more informed decisions. The system combines bilingual English/Urdu onboarding, OTP authentication, AI crop disease detection, offline diagnosis support, crop recommendation, irrigation advisory, smart budgeting, fertilizer calculation, marketplace ordering, and community communication into a single platform. The backend is implemented with FastAPI and MongoDB, while the mobile client is built in React Native with Expo. The disease detection module supports both online inference and a local TensorFlow Lite fallback, enabling continued use when internet connectivity is limited. The marketplace includes order tracking and Stripe-based escrow payment handling, and the accessibility layer provides voice-guided navigation for supported screens. Overall, the project provides a practical digital tool for improving farm productivity, market access, and agricultural decision-making. |
| Key Technical Features | • React Native + Expo mobile application with role-based routing. <br> • FastAPI backend with modular REST APIs and MongoDB persistence. <br> • OTP login through Stytch and saved device settings. <br> • AI crop disease detection with online prediction and offline TFLite fallback. <br> • Crop recommendation engine using weather, soil, and market factors. <br> • Smart budget planner and fertilizer/irrigation calculators. <br> • Stripe checkout with escrow-oriented payment flow. <br> • Community chat, offers, notifications, and direct messaging. <br> • English/Urdu bilingual interface and voice guidance. |

### Checklist of Items to Resolve Before Submission

- [FILL IN] Supervisor name.
- [FILL IN] Project start date.
- [FILL IN] Project completion date.
- [VERIFY] Whether you want the brand name written as “Asaan Kheti” or “Assan Kheti” everywhere.
- [VERIFY] Exact third-party integrations if your final report must explicitly mention OpenWeatherMap, OneSignal, or Whisper.
- [VERIFY] Exact dataset and paper citations used for the offline rice disease model.
- [VERIFY] Any final admin-screen details, because the inspected repository shows backend/admin routes but no dedicated admin mobile UI.
