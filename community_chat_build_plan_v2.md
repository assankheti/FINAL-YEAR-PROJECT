# Assan Kheti — Community Chat & Marketplace Build Plan (v2)
## What We're Building

A real-time community and marketplace messaging layer for Assan Kheti so farmers and buyers can:

- **Direct message** each other about a specific product, group member, or price offer
- **Join a Rice group chat** auto-created during onboarding (Wheat / Tomato / Sugarcane / Cotton / Mango groups added later via DB insert — schema is crop-agnostic)
- **Share crop photos** in any conversation
- **Make structured price offers** with accept / reject buttons (counter-offers deferred to v2)
- **See online/offline status** for other users
- **Block** abusive users
- **Get in-app notifications** (bell + count) for new messages, offers, status changes

The current marketplace screens (`chat/[contactId].tsx`, product listings, orders) are mocked. This plan replaces the mocks with real persistence, real-time delivery, and a real negotiation flow — sized for an FYP team of three with a 6-week defense deadline.

### What's intentionally out of scope (mention as "Future Work" in defense)

Voice notes · Counter-offers · Push notifications (OneSignal / FCM) · Typing indicators · User-created groups · Region/district groups · Message search · End-to-end encryption · Real escrow / payments on accepted offers · Admin moderation tooling · Read receipts at message level (only conversation-level in v1)

---

## Architecture

```
FRONTEND          React Native (Expo SDK 54, expo-router)
                  - New screens under app/community/
                  - socket.io-client for real-time
                  - Reuses: AsyncStorage, useT(), mobile_id, lib/deviceId.ts
                  │
                  │ WebSocket (Socket.IO) ──── primary delivery
                  │ HTTP (existing FastAPI) ── inbox, history, send fallback
                  ▼
BACKEND           FastAPI + python-socketio
                  - New router: api/v1/endpoints/community*.py
                  - New socket gateway: services/socket_gateway.py
                  - JWT-required (community = marketplace boundary)
                  - Reuses: Motor async, parse_datetime(), structured logger
                  │
                  ▼
DATABASE          MongoDB 6 (existing dbasssankheti)
                  - 7 new collections + indexes
                  - Local docker volume for image uploads
                  │
                  ▼
EXTERNAL          None new. Stytch (existing) for auth handshake.
                  No SendGrid, no Twilio, no push services in v1.
```

### Why python-socketio (not raw FastAPI WebSockets)

| Capability | python-socketio | FastAPI native WS |
|---|---|---|
| Built-in rooms (group chat) | Yes | Build it yourself |
| RN client reconnection / backoff | Mature `socket.io-client` | Roll your own |
| Long-polling fallback | Automatic | Build it yourself |
| Auth handshake helper | Yes (`auth={"token": jwt}`) | Manual |
| Test client | `socketio.AsyncClient` | Manual |

Trade-off: one extra Python dependency (`python-socketio[asgi]`) and one JS dep (`socket.io-client`). Worth it.

---

## Key Design Decisions (don't re-litigate)

| Decision | Choice | Why |
|---|---|---|
| Real-time strategy | Socket.IO primary, HTTP fallback | Required by online/offline + presence. RN client handles reconnection. |
| Who can DM whom | Context-anchored only | DMs always start from product card, group member tap, or offer. No global user search. Halves the work, prevents spam. |
| Image storage | Local docker volume | Mounted in `docker-compose.yml`, served via FastAPI static. Zero new infra. GridFS/S3 = v2. |
| Group creation | Auto-joined Rice group only in v1 | Schema multi-crop ready. Other groups added via DB insert later. |
| Auth | JWT required on all community endpoints AND socket handshake | Community = marketplace boundary. `mobile_id` still primary key inside endpoints. |
| Schema isolation | New collections, do NOT extend `chat_messages` | Chatbot history (AI ↔ farmer) and community (farmer ↔ farmer) have different access patterns. |
| Notifications | In-app only (bell + count) | Push (OneSignal/FCM) is real work. Stays in v2. |
| Counter-offers | OUT of v1 | Cut for time. Buyer offers, seller accepts or rejects. |
| Voice notes | OUT of v1 | Cut for time. Permissions + recording + waveform UI is its own piece. |
| Block user | IN v1 | Examiners ask about safety/moderation for vulnerable user groups. |
| Read receipts | Conversation-level only | `last_read_at` per user. Per-message receipts are v2. |

---

## Socket.IO Event Contract

**This is the single most important section of the doc. Frontend and backend MUST build to this contract.**

### Connection

Client connects with JWT in handshake:
```
io(API_BASE, { auth: { token: "<jwt>" } })
```

Server validates JWT, extracts `mobile_id`, joins:
- `user:<mobile_id>` (personal room — for DMs and notifications)
- `group:<group_id>` for every group the user is a member of

On invalid token: emit `error` and disconnect.

### Events — Client → Server

| Event | Payload | Purpose |
|---|---|---|
| `dm:send` | `{ recipient_id, body?, image_url?, context_type?, context_ref? }` | Send a DM. Server creates conversation if none exists, persists message, emits to recipient. |
| `dm:read` | `{ conversation_id }` | Mark a DM thread read. Updates caller's `last_read_at`. |
| `group:send` | `{ group_id, body?, image_url? }` | Send to a group. Server persists, broadcasts to group room. |
| `group:read` | `{ group_id }` | Mark group thread read. |
| `presence:heartbeat` | (no payload) | Every 30s while connected. Refreshes `last_active_at`. |

### Events — Server → Client

| Event | Payload | When |
|---|---|---|
| `dm:received` | `{ message }` | Someone sent you a DM. |
| `dm:sent` | `{ message }` | Confirmation back to sender (so they get the real message_id). |
| `group:received` | `{ message }` | Someone posted in a group you're in. |
| `presence:update` | `{ mobile_id, status: "online"\|"offline", last_seen_at? }` | A user you can see (DM partner or group member) went online/offline. |
| `offer:received` | `{ offer }` | Buyer sent you an offer. |
| `offer:status_changed` | `{ offer }` | An offer you're involved in changed (accepted/rejected). |
| `notification:new` | `{ notification }` | New notification arrived. |
| `error` | `{ code, message }` | Generic error. Codes: `unauthorized`, `blocked`, `validation`, `internal`. |

### HTTP fallback contract

Every event above also has an HTTP equivalent. If a `dm:send` socket call fails or times out, the client retries via `POST /api/v1/community/dm/send` with the same payload. Server is idempotent on `(sender_id, client_message_id)` to prevent duplicates. **Both paths must persist identically.**

---

## Build Pieces

### Piece 1: Schema + Indexes + Seed

**What:** 7 new MongoDB collections + indexes. Seed one Rice group. Backfill the missing chatbot indexes flagged in `CLAUDE.md`.

**Collections (added to `models/collections.py`):**

| Collection | Purpose | Key Fields |
|---|---|---|
| `community_groups` | Group rooms | `group_id`, `name_en`, `name_ur`, `crop`, `description`, `image_url`, `member_count`, `created_at` |
| `community_group_members` | Membership | `group_id`, `mobile_id`, `joined_at`, `last_read_at`, `muted` |
| `community_conversations` | DM thread metadata | `conversation_id`, `participants` (array of 2), `context_type` (product/group/offer/direct), `context_ref`, `last_message_at`, `last_message_preview` |
| `community_messages` | All messages (DM + group) | `message_id`, `conversation_id?`, `group_id?`, `sender_id`, `body`, `image_url`, `message_type` (text/image/system/offer), `payload` (jsonb), `client_message_id`, `created_at` |
| `community_offers` | Price offers | `offer_id`, `product_id`, `buyer_id`, `seller_id`, `price`, `quantity`, `unit`, `message`, `status` (pending/accepted/rejected/expired), `created_at`, `expires_at` |
| `community_blocks` | Blocking | `blocker_id`, `blocked_id`, `created_at` |
| `community_presence` | Online status | `mobile_id`, `status` (online/offline), `last_active_at`, `socket_id` |
| `community_notifications` | In-app feed | `notification_id`, `recipient_id`, `type`, `title_en`, `title_ur`, `body_en`, `body_ur`, `read`, `data` (jsonb), `created_at` |

**Indexes:**

```
community_messages:        (conversation_id, created_at desc)
                           (group_id, created_at desc)
                           (sender_id, client_message_id) UNIQUE — idempotency
community_conversations:   (participants, last_message_at desc)
community_group_members:   (mobile_id, group_id) UNIQUE
community_offers:          (buyer_id, created_at desc), (seller_id, status, created_at desc)
community_blocks:          (blocker_id, blocked_id) UNIQUE
community_presence:        (mobile_id) UNIQUE
community_notifications:   (recipient_id, read, created_at desc)

# Backfill (from CLAUDE.md soft spots):
chat_messages:             (mobile_id, session_id, created_at)
chat_sessions:             (mobile_id, updated_at desc)
```

**Seed:** One Rice group with `name_en: "Rice"`, `name_ur: "چاول"`, `crop: "rice"`.

**Deliverable:** `scripts/migrate_community.py` (idempotent migration + index creation + seed).

**Verification:** Run on fresh Mongo. `db.community_groups.find()` returns 1 doc. `db.community_messages.getIndexes()` returns 3 indexes plus `_id`.

---

### Piece 2: Pydantic Schemas + Utilities

**What:** Request/response models in `schemas/community.py` and shared helpers in `services/community_helpers.py`.

**Schemas (Pydantic):**
```
MessageCreate, MessageOut
ConversationOut (with last_message_preview, unread_count)
GroupOut, GroupMemberOut
OfferCreate, OfferOut
BlockCreate
NotificationOut
PresenceUpdate
```

**Utilities:**

- `get_or_create_dm_conversation(user_a, user_b, context_type, context_ref) -> conversation_id` — sorted-tuple lookup so (A,B) and (B,A) return the same conversation
- `is_blocked(sender_id, recipient_id) -> bool` — checks both directions
- `build_notification(recipient_id, type, **kwargs) -> dict` — bilingual (en/ur) builder
- Reuse `parse_datetime()` from `chatbot.py` — do not duplicate

**Deliverable:** Both files + unit tests for `get_or_create_dm_conversation` (idempotency) and `is_blocked` (bidirectional).

**Verification:** Pytest passes. Calling `get_or_create_dm_conversation(A, B)` then `(B, A)` returns the same `conversation_id`.

---

### Piece 3: Image Upload Pipeline

**What:** One endpoint that accepts a multipart image, stores it on a docker volume, returns a URL.

**Endpoint:**

```
POST /api/v1/media/upload
  - Auth: JWT required
  - multipart/form-data, field: file
  - Validates: image/jpeg or image/png, max 5 MB
  - Generates UUID filename, writes to /app/uploads/community/<uuid>.<ext>
  - Returns: { "url": "/uploads/community/<uuid>.jpg" }
```

**main.py:**
```python
app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")
```

**docker-compose.yml change:** Add named volume `community_uploads:` mapped to `/app/uploads` in backend service.

**Frontend helper:** `lib/uploadImage.ts` wraps `expo-image-picker` (already in deps) → POSTs file → returns URL → caller stores URL in `message.image_url`.

**Deliverable:** `endpoints/media.py` + `docker-compose.yml` patch + `lib/uploadImage.ts`.

**Verification:** Pick a photo from simulator → upload → URL returned → render `<Image source={{ uri: API_BASE + url }} />` → image displays.

---

### Piece 4: Socket.IO Gateway (the biggest piece — 2 sessions)

**What:** The realtime layer. Auth handshake, room management, presence, event handlers, broadcast logic.

**File:** `services/socket_gateway.py`

**Setup in `main.py`:**
```python
import socketio
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
sio_app = socketio.ASGIApp(sio, app)  # wrap FastAPI
# uvicorn now serves sio_app instead of app
```

**Auth handshake (`@sio.event async def connect`):**
1. Read `auth.token` from handshake
2. Validate JWT (reuse `services/security.py`)
3. Extract `mobile_id`
4. `await sio.save_session(sid, {"mobile_id": mobile_id})`
5. `await sio.enter_room(sid, f"user:{mobile_id}")`
6. Look up user's groups, `enter_room` for each
7. Upsert `community_presence` to `online` with `socket_id=sid`
8. Broadcast `presence:update` to relevant rooms
9. Return `True` to accept connection. Return `False` to reject.

**Disconnect (`@sio.event async def disconnect`):**
1. Read session, get `mobile_id`
2. Update `community_presence` to `offline`, set `last_active_at`
3. Broadcast `presence:update` to relevant rooms

**Event handlers (each in `services/socket_gateway.py`):**

- `@sio.on("dm:send")` — validate, check `is_blocked`, persist message, emit `dm:sent` to sender, `dm:received` to `user:<recipient_id>`. Bonus: trigger notification (Piece 11).
- `@sio.on("dm:read")` — update `last_read_at` in `community_conversations`.
- `@sio.on("group:send")` — validate group membership, persist, broadcast `group:received` to `group:<group_id>` (skip sender via `skip_sid=sid`).
- `@sio.on("group:read")` — update `last_read_at` in `community_group_members`.
- `@sio.on("presence:heartbeat")` — refresh `last_active_at`.

**Broadcast helpers (used by HTTP endpoints in later pieces):**
```python
async def broadcast_to_user(mobile_id, event, payload): ...
async def broadcast_to_group(group_id, event, payload, skip_sid=None): ...
```

**Deliverable:** `services/socket_gateway.py` + `main.py` patch + dependency added to `requirements.txt`: `python-socketio[asgi]==5.x`.

**Verification:** Two simulators connect with different JWTs. Both fire `dm:send` to each other. Both `dm:received` arrives within 200ms. Disconnect one → other sees `presence:update` with status `offline`.

---

### Piece 5: DM HTTP Endpoints

**What:** HTTP equivalents for inbox, history, fallback send. Send-via-HTTP must produce identical state to send-via-socket.

**Endpoints (all under `/api/v1/community/`):**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `dm/inbox/{mobile_id}` | List conversations + last_message_preview + unread_count |
| `GET` | `dm/messages/{conversation_id}?before=&limit=50` | Paginated history |
| `POST` | `dm/send` | HTTP fallback for sending. Same payload as `dm:send` socket event. Idempotent on `client_message_id`. |
| `POST` | `dm/read` | Mark read. Body: `{ conversation_id }` |
| `POST` | `dm/block` | Body: `{ blocked_id }` |
| `POST` | `dm/unblock` | Body: `{ blocked_id }` |
| `GET` | `dm/blocks/{mobile_id}` | List blocks |

**Behavior rules:**
- Every send checks `is_blocked()` — returns 403 if blocked.
- Send via HTTP also broadcasts via `broadcast_to_user()` — keeps real-time delivery even when one party uses HTTP.
- Mongo writes wrapped in try/except + log (per CLAUDE.md pattern).

**Deliverable:** `endpoints/community_dm.py` registered in `main.py`.

**Verification:** Send via HTTP from user A → user B (connected via socket) receives `dm:received` event in real time.

---

### Piece 6: Group Endpoints + Auto-Join Hook

**What:** Group HTTP endpoints + modify the existing crop-selection endpoint to auto-add members.

**Endpoints:**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `groups/list/{mobile_id}` | User's groups + last_message preview + unread_count |
| `GET` | `groups/{group_id}` | Group detail |
| `GET` | `groups/{group_id}/members` | Member list (paginated) |
| `GET` | `groups/{group_id}/messages?before=&limit=50` | History |
| `POST` | `groups/{group_id}/send` | HTTP fallback for sending |
| `POST` | `groups/{group_id}/read` | Mark group read |
| `POST` | `groups/{group_id}/leave` | Leave |
| `POST` | `groups/{group_id}/join` | Re-join |
| `POST` | `groups/{group_id}/mute` | Mute notifications |

**Auto-join hook:** Modify `POST /user/crop-selection/{mobile_id}` (existing). After saving the crop list, look up matching `community_groups` (by `crop` field) and upsert into `community_group_members`. **Additive change — do not modify response shape.**

In v1, only the Rice group exists. Picking Wheat/Tomato/etc. silently does nothing (lookup misses, no error).

**Deliverable:** `endpoints/community_groups.py` + 1-line patch to `endpoints/user.py` (or wherever crop-selection lives).

**Verification:** User picks Rice → calls `groups/list/{mobile_id}` → sees Rice group. User picks Wheat → no error, no group added (until Wheat group is seeded later).

---

### Piece 7: Offer Endpoints (accept/reject only)

**What:** Structured offers. Buyer creates → seller accepts or rejects. No counter in v1.

**Endpoints:**

| Method | Path | Purpose |
|---|---|---|
| `POST` | `offers/create` | Buyer creates offer. Body: `{ product_id, seller_id, price, quantity, unit, message? }`. Creates DM conversation (context_type=offer) if none exists. Inserts `message_type: "offer"` message in DM. Triggers notification + socket event. |
| `POST` | `offers/{offer_id}/accept` | Seller only. Status → `accepted`. Inserts system message. Notifies buyer. |
| `POST` | `offers/{offer_id}/reject` | Seller only. Status → `rejected`. Inserts system message. Notifies buyer. |
| `POST` | `offers/{offer_id}/withdraw` | Buyer only. Status → `expired`. |
| `GET` | `offers/sent/{mobile_id}` | Filterable by status |
| `GET` | `offers/received/{mobile_id}` | Filterable by status |
| `GET` | `offers/{offer_id}` | Single offer |

**State machine:**

```
pending ──accept──▶  accepted (terminal)
pending ──reject──▶  rejected (terminal)
pending ──withdraw▶ expired (terminal)
```

Reject invalid transitions with 400. Wrong-user transitions (buyer trying to accept own offer) → 403.

**Deliverable:** `endpoints/community_offers.py` + `tests/test_offers.py` covering: state machine paths, permission checks (only seller can accept, only buyer can withdraw), idempotency.

**Verification:** Buyer creates offer → seller sees `offer:received` socket event → seller accepts via HTTP → buyer sees `offer:status_changed` socket event with status `accepted`. Both see accepted offer in DM.

---

### Piece 8: Frontend DM Screens + Socket Hook

**What:** Replace mocked `chat/[contactId].tsx`. Add the socket hook. Implement HTTP fallback.

**Files:**

- `lib/socket.ts` — singleton socket instance, connect on app mount, reconnect on JWT refresh
- `hooks/useSocket.ts` — `useSocketEvent(event, handler)` for screens to subscribe to events
- `hooks/useChatMessages.ts` — combines initial HTTP fetch + socket subscription for live updates
- `app/community/inbox.tsx` — combined DM + group inbox
- `app/community/chat/[conversationId].tsx` — message thread (replaces mocked `chat/[contactId].tsx`)
- `components/community/MessageBubble.tsx` — renders text / image / system / offer messages
- `components/community/PinnedProductCard.tsx` — sticky at top when `context_type=product`
- `components/community/ImagePickerButton.tsx` — wraps `expo-image-picker` + `lib/uploadImage.ts`

**Send flow (with fallback):**
```
1. Optimistic render (status: "sending")
2. Try socket.emit("dm:send", payload, ack)
3. If ack within 5s → mark as "sent", replace temp_id with real message_id from ack
4. If ack times out → POST /api/v1/community/dm/send → mark as "sent" or "failed"
5. On "failed" → show retry button on the bubble
```

**Patch product-buy screen:** Add "Message Seller" + "Make Offer" buttons that navigate to the DM with `context_type=product`.

**Deliverable:** All files above. Mocked screens deleted.

**Verification:** Two simulators. User A → product-buy → "Message Seller" → types → user B receives within 200ms. User B reads → user A's screen shows "read" indicator (conversation-level).

---

### Piece 9: Frontend Group Screens

**What:** Group chat thread + member list. Reuses MessageBubble, image picker, socket hook.

**Files:**

- `app/community/group/[groupId].tsx` — group message thread
- `app/community/group/[groupId]/members.tsx` — member list. Tap a member → opens DM (`context_type=group`).

**Behavior:**
- Group messages render sender name + initials avatar (no profile photos in v1).
- Top-right menu: Leave group, Mute.
- Same socket+HTTP fallback as DMs.

**Deliverable:** Two screens.

**Verification:** Two users in Rice group. User A posts → user B sees within 200ms. User B taps user A's name in member list → opens DM thread with `context_type=group`.

---

### Piece 10: Frontend Offer UI

**What:** Offer rendering inside chat + the "make an offer" modal.

**Components:**

- `components/community/OfferCard.tsx` — renders inline in message thread. Shows price, quantity, unit, status badge.
  - For pending offers received by seller: Accept / Reject buttons
  - For pending offers sent by buyer: Withdraw button
  - For terminal states: status badge only
- `components/community/MakeOfferModal.tsx` — opens from product-buy screen or DM. Form: price, quantity (pre-filled from product, editable), unit (read-only), optional message.

**Status badges:**
- `pending` = yellow
- `accepted` = green
- `rejected` = red
- `expired` = grey

All amounts shown in PKR with thousand separators (`Rs 5,000`).

**Deliverable:** Two components, integrated into Piece 8's chat screen.

**Verification:** Buyer makes offer from product-buy → seller sees offer card in DM with Accept/Reject → accepts → both see green "accepted" badge in real time.

---

### Piece 11: In-App Notifications + Bell

**What:** Bell in dashboards shows unread community events. No push.

**Endpoints:**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `notifications/{mobile_id}?limit=50` | Paginated, sorted desc |
| `POST` | `notifications/read` | Body: `{ notification_ids: [] }` or `{ all: true }` |

**Triggers (insert notification doc when source event happens):**

| Event | Recipient | title_en (title_ur) |
|---|---|---|
| New DM | Recipient | "<Sender> sent you a message" / "<Sender> نے آپ کو پیغام بھیجا" |
| New offer | Seller | "<Buyer> made an offer" / "<Buyer> نے قیمت پیش کی" |
| Offer accepted | Buyer | "Your offer was accepted" / "آپ کی پیش کش قبول ہو گئی" |
| Offer rejected | Buyer | "Your offer was declined" / "آپ کی پیش کش مسترد ہو گئی" |
| Added to group | New member | "Welcome to the <Crop> group" / "<Crop> گروپ میں خوش آمدید" |

**Frontend:**
- `components/NotificationBell.tsx` in `farmer-dashboard.tsx` and `community-dashboard.tsx` headers
- Subscribes to `notification:new` socket event for live count updates
- Polls `notifications/{mobile_id}` every 30s as fallback
- Tap → drawer/screen showing list. Tap a notification → deep-link to source screen.

**Deliverable:** Endpoints + bell component + notification triggers wired into Pieces 4/5/6/7.

**Verification:** Trigger each event type → bell increments live → tap → navigates correctly → count decrements.

---

### Piece 12: Presence Indicators + Block Enforcement

**What:** Two small features that share a session. Green/grey dot on avatars + the block-user UX.

**Presence indicators:**
- `components/community/PresenceDot.tsx` — green when online, grey when offline. Subscribes to `presence:update` socket event.
- Render in: DM inbox (next to contact name), DM thread header, group member list.
- Backend already broadcasts `presence:update` from Piece 4. No backend work here.

**Block enforcement:**
- Long-press any message bubble → action menu: "Block <user>" + "Cancel"
- `app/community/blocked-users.tsx` — list of blocked users with unblock button
- Add "Blocked users" entry to profile/settings screen
- Sweep test: confirm `is_blocked()` is called in every send path (`dm:send` socket, `dm/send` HTTP, `groups/{id}/send`, `offers/create`)
- Group filter: blocked users' messages are hidden client-side from group threads (cheap version — backend still delivers them)

**Deliverable:** PresenceDot component + blocked-users screen + long-press handler in MessageBubble.

**Verification:** User A blocks user B → user B's `dm:send` to user A returns `error` event with code `blocked`. User B's group messages no longer appear in user A's group thread view.

---

### Piece 13: Demo Seed + Tests + Walkthrough Script

**What:** Demo-ready dataset, tests for highest-risk paths, and a documented 3-minute defense demo.

**Seed (`scripts/seed_community_demo.py`):**
- 3 demo farmers (named after team) + 2 demo buyers
- All 3 farmers in the Rice group
- 12 prefilled group messages spanning the last 3 days
- One in-flight DM thread (buyer ↔ farmer) with a pending offer
- One completed offer thread (accepted) with a "deal done" system message
- 2 unread notifications per demo user

**Tests (`tests/test_community.py`):**
- Offer state machine: each transition + rejected double-accepts + permission checks
- Block enforcement: blocked sender's `dm/send` returns 403
- DM idempotency: `get_or_create_dm_conversation()` is order-independent
- Auto-join: crop-selection adds rows to `community_group_members`
- Socket auth: connect with invalid JWT → rejected; valid → joins user room

**Demo script (`docs/DEMO.md`):**

> 3-minute defense walkthrough — Two simulators, side by side.
>
> 1. Open as Buyer 1 → tap a rice product → "Make Offer" → fill modal (Rs 8,000 for 50 kg) → submit
> 2. Switch to Farmer 1 (other simulator) → bell shows 1 (live update) → tap → opens DM with offer card
> 3. Tap "Accept" → both screens show green "accepted" badge in real time
> 4. Open Rice group → Farmer 1 posts a crop photo → Farmer 2 (third simulator if available, or refresh) sees photo within 200ms
> 5. Farmer 1 long-presses a buyer's message → "Block" → buyer's next message returns error
> 6. Show offline status: kill Buyer 1's app → Farmer 1's DM thread shows grey dot within 30s

**Deliverable:** Seed script + ~20 tests + DEMO.md.

**Verification:** Fresh Mongo → run migration (Piece 1) → run seed → run tests (all pass) → execute demo script end-to-end on real Android devices over LAN.

---

## Week-by-Week Schedule

| Week | Goal | Pieces | Risk |
|---|---|---|---|
| **1** | Backend foundation + sockets working end-to-end | 1, 2, 3, 4 | Socket gateway is the hardest piece. Get it solid this week or the whole plan slips. |
| **2** | Backend features complete | 5, 6, 7 | DM + groups + offers all using socket gateway from week 1. Easier work. |
| **3** | Frontend chat working end-to-end | 8, 9, 10 | Parallelize across team — one person per major screen set. |
| **4** | Polish | 11, 12, 13 | Notifications, presence, block, seed, tests, demo script. |
| **5** | Real-device testing + bug fixes | — | Test over actual LAN with physical Android phones. Fix everything that breaks. |
| **6** | Defense prep | — | **No code.** Slides, Phase IV doc, demo rehearsal. |

---

## Panic Plan (read this if Week 3 isn't on track)

If at end of **week 3** DMs aren't working end-to-end on a real device with real users — STOP and cut, in this order:

1. **Cut images from chat** (text + offers only). Saves frontend complexity. You already have image upload working for disease detection — defendable.
2. **Cut group chat entirely.** DM + offers only. Group chat is "community" feature — pitch as future work.
3. **Cut presence (online/offline dots).** Goes into v2 alongside push notifications.
4. **Cut block user.** Justify as "moderation framework deferred to v2."

The minimum demo that still passes a defense: **Buyer DMs farmer about a real product → buyer makes offer → farmer accepts → both see real-time updates.** That's a working WebSocket chat marketplace. Examiners will pass that.

---

## What's Already in Place (no work needed)

- `mobile_id` identity model (`lib/deviceId.ts`)
- JWT auth (Stytch OTP → HS256)
- Onboarding chain ending at user-type and crop selection
- `expo-image-picker` already in dependencies
- `useT()` i18n helper for English/Urdu
- AsyncStorage versioned-key pattern
- Logger + datetime conventions (per CLAUDE.md)
- Existing chatbot patterns to mirror (try/except around Mongo writes, `parse_datetime()`, structured logging)

---

## Conventions to Follow (cross-reference CLAUDE.md)

- **Backend imports:** code lives under `src/app/`. Run with `PYTHONPATH=src` locally.
- **Async DB:** Motor only. `await collection.find_one(...)`. No PyMongo sync calls.
- **Mongo writes never break user-facing replies** — wrap in try/except, log, swallow on background paths.
- **Datetime:** `datetime.utcnow()` (naive UTC). Use `parse_datetime()` from `chatbot.py` for mixed inputs.
- **Logging:** `logger.info("event_name key=value", ...)`. `logger.exception(...)` inside `except`.
- **Frontend:** wrap user-visible strings in `useT({ english, urdu })`. Don't hardcode English-only.
- **No new state libs.** AsyncStorage + Context. Don't introduce Redux / Zustand / react-query / axios.
- **API base:** always import from `config/env.ts`. Never hardcode URLs.
- **mobile_id is the primary key** for all community lookups. JWT only confirms identity at endpoint boundary.

---

## How to Hand This to Claude Code

When working on a piece, give Claude Code this prompt:

> Read `community_chat_build_plan_v2.md` and `CLAUDE.md`. Implement Piece N in full. Follow all conventions in both docs. After implementing, run the verification step listed for that piece and report results. Do not start Piece N+1 — stop after verification.

Work one piece at a time, verify each, commit, then move on. Don't let Claude skip verification — most bugs surface there.

---
