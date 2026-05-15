# Assan Kheti — Working notes for Claude

Mobile-first smart agriculture platform for Pakistani farmers. React Native (Expo) frontend + FastAPI/MongoDB backend, dockerized as a 3-service stack.

## Repo layout

```
FINAL-YEAR-PROJECT/
├── docker-compose.yml          # mongo + backend + frontend on bridge net assan-kheti-net
├── .env                        # local-only; gitignored (verify nothing leaked to history)
├── app-assankheti-backend/
│   ├── DockerfileBackend
│   ├── requirements.txt
│   ├── src/app/
│   │   ├── main.py             # router registration, CORS open, scraper scheduler (24h)
│   │   ├── api/v1/endpoints/   # auth, chatbot, calculator, deviceSettings, disease_api,
│   │   │                       # fertilizer_api, pesticide_api, seed_api
│   │   ├── services/           # predictor (TFLite+Roboflow), security (JWT), stytch_client,
│   │   │                       # scrapers (KissanGhar), calculator logic
│   │   ├── schemas/            # Pydantic request/response models
│   │   ├── models/
│   │   │   ├── collections.py  # collection-name constants
│   │   │   └── best_float32.tflite  # 21 MB — do not add more model files in-tree
│   │   ├── db/db_connection.py # Motor async client, docker-vs-local host switch
│   │   └── utils/logger.py
│   └── tests/test_chatbot.py   # only chatbot has tests
└── app-assankheti-frontend/
    ├── DockerfileFrontend
    ├── app.config.js           # Expo SDK 54, expo-router 6, RN 0.81, react 19
    ├── config/env.ts           # API_BASE auto-resolved (Expo CLI → .env → platform fallback)
    ├── app/                    # 33+ Expo Router screens (file-based)
    ├── components/             # 18 reusable components
    ├── contexts/LanguageContext.tsx
    ├── hooks/                  # color-scheme, theme-color, is-mobile, toast
    └── lib/deviceId.ts         # mobile_id (UUID) + AsyncStorage
```

## Identity model

Almost everything keys off **`mobile_id`** (UUID generated client-side via `expo-crypto`, persisted to AsyncStorage). Auth/JWT exists (Stytch SMS OTP → HS256, 30-min) but most endpoints don't enforce it. When adding endpoints, default to `mobile_id` as the lookup key.

## Backend conventions

- **Routers**: each endpoint file defines `router = APIRouter()`; register in `main.py` with `app.include_router(router, prefix="/api/v1/<area>")`.
- **DB access**: Motor async only. Grab the singleton at module load: `db = get_database()`. Standard upsert pattern is `update_one({...}, {"$set": {...}, "$setOnInsert": {...}}, upsert=True)`.
- **Schemas**: Pydantic models in `schemas/<area>.py`, named `<Thing>Create` / `<Thing>DB`. Some legacy ones use lowercase first letter (`mobileid`, `cropSelectionCreate`) — match existing style in the file you're editing.
- **Errors**: Raise `HTTPException(status_code, detail)` for client errors. For external-service exceptions, parse status_code + downgrade 404→400 (see `auth._stytch_http_exception`). For DB writes inside flows that already produced a useful result, log+swallow (see `safe_save_chat_message`).
- **Logging**: `from app.utils.logger import logger`. Use structured key=value strings: `logger.info("chat_request mobile_id=%s session_id=%s", ...)`. `logger.exception(...)` inside `except`.
- **Datetime**: `datetime.utcnow()` (naive UTC). Use `parse_datetime()` in `chatbot.py` as the reference normalizer for mixed inputs (datetime / ISO string / "Z" suffix).
- **Background work**: `while True: await asyncio.sleep(...)` loop launched from `main.py` startup hook. No Celery/RQ.

## Frontend conventions

- **Routing**: Expo Router file-based. Drop a `.tsx` in `app/`. Dynamic routes use `[param].tsx`. All screens have hidden headers + animations disabled at navigator level — don't add screen transition animations.
- **API base**: Always import `API_BASE` from `config/env.ts`. Never hardcode URLs.
- **HTTP**: Plain `fetch(API_BASE + path, { method, headers, body })`. No axios, no react-query.
- **Storage**: AsyncStorage with versioned keys (`assanKheti.<thing>.v1`).
- **i18n**: Wrap user-facing strings with `const t = useT()` then `t({ english: "...", urdu: "..." })`. Don't ship English-only strings on visible screens. Roman Urdu is a third style used in chatbot replies but not generally a UI lang.
- **State**: Local `useState` for form state; AsyncStorage for persistence; Context for cross-cutting (Language, Theme). **No Redux, no Zustand**.
- **mobile_id**: Always read via `getOrCreateMobileId()` from `lib/deviceId.ts`.
- **Component pattern**: Some screen files are huge (`farmer-dashboard.tsx` ~85 KB). Pattern is one screen = one big self-contained file rather than many splits.

## Key endpoints (mounted under `/api/v1/`)

```
auth/         send-otp/, verify-otp/                                      → Stytch + JWT
user/         generate/mobileid, accept-terms/, language-voice/(+GET),
              character/, devicesetting/{mobile_id}, crop-selection/{mobile_id}
disease/      predict_disease (multipart), last-scan/{mobile_id}, model_status
calculator/   fertilizer, pesticide, irrigation, budget,
              prices/{fertilizer|pesticide|seed|crop}
chatbot/      chat (POST), sessions/{mobile_id} (GET), history/{mobile_id}/{session_id} (GET),
              history/{mobile_id} (GET+DELETE), session/{mobile_id}/{session_id} (DELETE)
fertilizer/   scrape-and-store, all, search          (same shape for pesticide/, seed/)
media/        upload (multipart, JWT-required, 5 MB cap)
community/
  dm/         send (POST), inbox/{mobile_id}, messages/{conversation_id},
              read (POST), block (POST), unblock (POST), blocks/{mobile_id}
  groups/     list/{mobile_id}, {group_id}, {group_id}/members,
              {group_id}/messages, {group_id}/send, {group_id}/read,
              {group_id}/leave, {group_id}/join, {group_id}/mute
  offers/     create (POST), {offer_id}/{accept|reject|withdraw},
              sent/{mobile_id}, received/{mobile_id}, {offer_id}
  notifications/{mobile_id}, notifications/read (POST)
  presence/{mobile_id}
health/db

# Static files: /uploads/* (mounted via StaticFiles, served from a docker volume)
```

## MongoDB collections (defined in `models/collections.py`)

Original: `mobile_devices`, `terms_settings`, `language_settings`, `character_settings`, `user_settings`, `crop_selections`, `auth_credentials`, `disease_scans`, `fertilizers`, `pesticides`, `seeds`, `crop_prices`, `chat_messages`, `chat_sessions`.

Community module (Pieces 1–13): `community_groups`, `community_group_members`, `community_conversations`, `community_messages`, `community_offers`, `community_blocks`, `community_presence`, `community_notifications`. All have indexes — see `scripts/migrate_community.py` for the full plan, including a backfill of `(mobile_id, session_id, created_at)` on `chat_messages` and `(mobile_id, updated_at desc)` on `chat_sessions`.

## Chatbot guardrails (the most complex module)

`endpoints/chatbot.py`, ~912 lines. The pipeline runs guardrails BEFORE any OpenAI call:

1. Validate `mobile_id` → 400 if empty
2. Load last 10 session messages
3. `detect_language_style` → urdu / roman_urdu / english
4. Empty/unclear → canned clarifier (not saved)
5. Save user message
6. `is_unsafe_request` → safety refusal (chemical-context AND overdose-keyword both required)
7. `is_out_of_scope_message` → scope refusal (sensitive-prompt-injection wins over farming bypass)
8. `is_pure_greeting` → first-time uses `message_type: "session_greeting"` tag, repeat gets a redirect
9. OpenAI gpt-3.5-turbo (`max_tokens=420`, `temperature=0.4`) with system prompt from line 209
10. `clean_reply` strips emojis/markdown, caps at 8 lines / 900 chars
11. Save AI reply, upsert `chat_sessions`

Substring matching means false positives are possible (`water` in `watermelon`). Keep that in mind when extending the keyword sets.

## Community module (Pieces 1–13)

Real-time messaging + marketplace. Built across 13 pieces — see
`community_chat_build_plan_v2.md` for the full architecture and per-piece notes,
and `docs/DEMO.md` for the 3-minute defense walkthrough.

- **Real-time gateway:** `services/socket_gateway.py` wraps the FastAPI app with
  `python-socketio`. Uvicorn must serve `app.main:sio_app` (NOT `app`) — see
  `DockerfileBackend`. Rooms: `user:<mobile_id>` (personal — DMs, presence,
  notifications) and `group:<group_id>` (one per group the user is in).
- **Event contract:** `dm:send/sent/received`, `group:send/received/read`,
  `presence:update/heartbeat`, `offer:received/status_changed`,
  `notification:new`, `error`. Client → server events have HTTP fallbacks at
  `/api/v1/community/...` that produce identical persisted state. Idempotency
  is enforced via a unique index on `(sender_id, client_message_id)`.
- **Auth:** community endpoints + socket handshake all require JWT
  (`get_current_mobile_id` dependency in `services/security.py`). `mobile_id`
  is still the lookup key inside endpoints.
- **Notifications:** `services/notifications.py` is the single insert + broadcast
  helper. Bilingual templates in `services/community_helpers.py`. Five types
  wired today: `dm`, `offer_received`, `offer_accepted`, `offer_rejected`,
  `group_added`.
- **Block model:** bidirectional check via `is_blocked()` enforced server-side
  on `dm:send` (socket + HTTP) and `offers/create`. Group sends use a cheaper
  client-side filter — backend still delivers, recipient hides.
- **Frontend hooks:** `hooks/useChatMessages.ts` (DMs) and
  `hooks/useGroupMessages.ts` (groups) own optimistic-render + ack-or-fallback.
  `hooks/useSocket.ts` wraps the singleton in `lib/socket.ts`.
- **Demo data:** `scripts/seed_community_demo.py` (idempotent) creates 3 farmers,
  2 buyers, the Rice group with 12 seeded messages, a pending DM offer, and a
  closed deal. `scripts/migrate_community.py` must run first to create indexes
  and the Rice group.
- **Tests:** `tests/test_community.py` is the canonical suite (39 tests covering
  conversation idempotency, blocks, offer state machine, auto-join hook, and
  socket auth). Run with `PYTHONPATH=src python -m pytest tests/ -v`.

## Common commands

```bash
# Docker (recommended)
docker compose up --build              # backend:8000, frontend-web:8081, mongo:27017
docker compose down -v                 # full reset including volumes

# Local backend
cd app-assankheti-backend
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=src uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Local frontend
cd app-assankheti-frontend
npm install
npm run start                          # or: npm run android / npm run ios

# Tests
cd app-assankheti-backend
PYTHONPATH=src python -m pytest tests/ -v
# Or just the community module suite
PYTHONPATH=src python -m pytest tests/test_community.py -v

# Migrate + seed demo data
PYTHONPATH=src python -m scripts.migrate_community
PYTHONPATH=src python -m scripts.seed_community_demo

# Lint
cd app-assankheti-frontend && npm run lint
```

## Known soft spots

- CORS is open to all origins (production hardening pending)
- TensorFlow 2.16.2 is pinned and fragile on macOS — prefer Docker on Mac
- Chatbot + community module are tested; calculators, scrapers, auth, disease still have no tests
- Many marketplace screens use mocked data (orders, product listings, chat/[contactId], call/[contactId])
- Chatbot guardrails are substring-based; jailbreaks via paraphrasing/multi-turn aren't specifically defended
- No rate limiting per `mobile_id`
- TFLite weight (~21 MB) committed in-tree — don't add more; use Git LFS if model storage grows
- `.env` is gitignored but appears tracked — verify no secrets leaked to git history

## Don't do

- Don't add screen transition animations (disabled at navigator level on purpose)
- Don't introduce Redux/Zustand/react-query/axios — stay with the existing stack
- Don't hardcode the API URL on the frontend; use `config/env.ts`
- Don't commit large model files; the existing TFLite is the exception, not the precedent
- Don't add fields to collections without updating both reads and the implicit-schema convention
- Don't bypass `clean_reply` when modifying chatbot output paths — it enforces the no-markdown contract
