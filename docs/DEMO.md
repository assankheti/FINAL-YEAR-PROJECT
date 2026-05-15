# 3-Minute Defense Demo — Community Marketplace

Walkthrough script for the FYP defense. Two simulators side by side, both pointed at the same backend, Mongo seeded from `scripts/seed_community_demo.py`.

## Setup (do this 5 minutes before defense)

```bash
# 1. Wipe and prepare the database
docker compose down -v
docker compose up --build -d

# 2. Apply schema + indexes (idempotent — safe to re-run)
docker exec backend bash -c "cd /app && PYTHONPATH=/app/src python -m scripts.migrate_community"

# 3. Seed demo data (idempotent)
docker exec backend bash -c "cd /app && PYTHONPATH=/app/src python -m scripts.seed_community_demo"

# 4. Confirm test suite is green
docker exec backend bash -c "cd /app && PYTHONPATH=/app/src python -m pytest tests/test_community.py -v"
```

Expected: `39 passed in ~1.5s`. If anything is red — STOP and fix before going live.

### Demo identities

The seed creates these deterministic accounts. Hardcode them on the simulators
ahead of time (they're in [scripts/seed_community_demo.py](../app-assankheti-backend/scripts/seed_community_demo.py)).

| Role | mobile_id | What they own |
|---|---|---|
| Farmer (us) | `demo-farmer-yaqoob` | Member of Rice group. Has the *pending* offer waiting in their DM. |
| Farmer | `demo-farmer-ahmad` | Has the *accepted* deal in their DM. |
| Farmer | `demo-farmer-waleed` | Active in the group thread. |
| Buyer | `demo-buyer-1` | Sent the pending offer to Yaqoob. |
| Buyer | `demo-buyer-2` | Closed the accepted deal with Ahmad. |

Pre-mint the JWTs once and put them in a paste-buffer:

```bash
docker exec backend python -c "
import sys; sys.path.insert(0,'/app/src')
from app.services.security import create_access_token
for m in ['demo-buyer-1','demo-farmer-yaqoob','demo-farmer-waleed']:
    print(m, create_access_token(m, extra={'mobile_id': m, 'auth_via': 'stytch_otp'}))
"
```

Stash each token under `auth.access_token` in the corresponding simulator's
AsyncStorage before the demo starts.

---

## The walkthrough (3 minutes)

### 0:00 – 0:30 · Buyer makes an offer

**Simulator A** = Buyer 1.

1. From the dashboard, tap any rice product (or the seed's `demo-product-rice-1`).
2. On the product-buy screen, tap **Make Offer**.
3. Fill the modal: **Rs 8,000 / kg**, **50 kg**, message _"Premium basmati for export"_.
4. Tap **Send offer**.

You should land directly inside the new DM thread with an inline orange offer
card showing the **Pending** badge.

### 0:30 – 1:00 · Farmer sees the offer

**Simulator B** = Yaqoob.

1. Bell badge in the dashboard header bumps from 0 to 1 within ~200 ms (live
   `notification:new`).
2. Tap the bell → drawer shows "_demo-buyer-1 made an offer_".
3. Tap that notification → opens the same DM thread, offer card visible with
   **Accept** + **Reject** buttons (Yaqoob is the seller).

### 1:00 – 1:30 · Accept, both sides update live

**Simulator B**: tap **Accept**, confirm.

- Both simulators flip the badge to **Accepted** (green) instantly via
  `offer:status_changed`.
- A `system` message appears in the thread: _"Offer accepted."_

### 1:30 – 2:00 · Group photo broadcast

**Simulator B**: From the dashboard, navigate to **Community → Inbox →
Rice (group)**.

1. Tap the image picker icon, choose any photo from the device.
2. Frontend uploads via `POST /media/upload`, then sends a `group:send`.

If a third simulator is connected to Rice, the new image lands within ~200 ms.
If only two are running, switch simulator A to the same group screen — the
image is already in the thread on focus refresh.

### 2:00 – 2:30 · Block enforcement

**Simulator B** (still in DM with Buyer 1): long-press one of buyer's text
bubbles → **Block** → confirm.

**Simulator A**: type a message → tap send. The toast/alert reads "_Cannot
send to this user_" (HTTP 403 from `/dm/send`). The optimistic message is
marked failed.

### 2:30 – 3:00 · Presence

**Simulator A**: kill the app entirely (swipe away on iOS / force-stop on
Android).

**Simulator B**: open the inbox. The presence dot next to Buyer 1's avatar
turns from green to grey. Long-press the dot → "Last seen Xm ago".

Total: 3 minutes, 0 backend taps from you, all live.

---

## Things that have flaked in dev (re-run guidance)

- **Bell shows 0 even though the offer arrived.** Notification socket missed
  the push because the app was background-throttled. Pull-to-refresh on the
  inbox and the bell catches up via the 30-second poll.
- **Image doesn't render in the seeded group.** The seed script writes a
  1×1 placeholder JPEG to `/app/uploads/community/seed_rice.jpg` inside the
  backend volume. If you see a broken-image icon, replace that file with a
  real photo (`docker cp pretty.jpg backend:/app/uploads/community/seed_rice.jpg`)
  and re-open the screen.
- **Presence dot stays grey for 5 seconds after a connect.** First-render race
  between the HTTP `GET /presence/{mobile_id}` and the live socket event. Tap
  away and back to force a re-mount; in production we'd cache.
- **"Cannot send to this user" but you didn't block.** Earlier demo runs left
  blocks in the database. Re-run `seed_community_demo.py` only writes new docs;
  to clear stale blocks use `docker compose down -v` then re-seed.

## Talking points for examiners

- **Architecture.** Real-time delivery via python-socketio (rooms model:
  `user:<mobile_id>` + `group:<group_id>`). HTTP fallback for every event so a
  flaky socket doesn't lose messages.
- **Data model.** Seven new MongoDB collections, all indexed (see
  [scripts/migrate_community.py](../app-assankheti-backend/scripts/migrate_community.py)).
  Conversations are keyed by sorted-tuple of participants, so `(A, B)` and
  `(B, A)` collide on the same row — verified by
  `GetOrCreateDMConversationTests.test_idempotent_reversed_order`.
- **Idempotency.** Every send carries a client-supplied `client_message_id`
  with a unique index on `(sender_id, client_message_id)`. A retry across
  socket and HTTP returns the same message, never duplicates.
- **Bilingual UI.** Every user-visible string in the new screens uses
  `useT({ english, urdu })`. Notification templates ship both `*_en` and `*_ur`
  fields from the backend (`build_notification`).
- **Block model.** Bidirectional check via `is_blocked()` enforced server-side
  on `dm:send` (socket + HTTP) and `offers/create`. Group sends use a cheaper
  client-side filter — backend still delivers, the recipient hides.
- **Cuts that are out of v1 (mention, don't dwell).** Voice notes,
  counter-offers, push notifications (FCM/OneSignal), typing indicators,
  user-created groups, end-to-end encryption.
