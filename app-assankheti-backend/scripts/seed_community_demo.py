"""
Idempotent demo seed for the community / marketplace messaging stack.

Re-runnable: every doc is keyed by a deterministic id so re-running yields the
same dataset (no duplicates, no drift). Safe to run after a Mongo wipe + the
Piece 1 migration.

What this seeds:
  - 3 demo farmers (Yaqoob / Ahmad / Waleed) + 2 demo buyers
  - All 3 farmers in the Rice group
  - 12 prefilled group messages spanning the last 3 days, alternating senders,
    one is an image
  - 1 in-flight DM thread: Buyer 1 ↔ Yaqoob with a *pending* offer
    (Rs 8,000 for 50 kg)
  - 1 completed DM thread: Buyer 2 ↔ Ahmad with an *accepted* offer + a
    "deal done" system message
  - 2 unread notifications per demo user

Run from inside the backend container:
    PYTHONPATH=/app/src python -m scripts.seed_community_demo

Or locally:
    cd app-assankheti-backend && PYTHONPATH=src python scripts/seed_community_demo.py
"""

import asyncio
import os
import shutil
from datetime import datetime, timedelta
from typing import Any, Dict, List

from app.db.db_connection import get_database
from app.models.collections import (
    COMMUNITY_CONVERSATIONS_COLLECTION,
    COMMUNITY_GROUP_MEMBERS_COLLECTION,
    COMMUNITY_GROUPS_COLLECTION,
    COMMUNITY_MESSAGES_COLLECTION,
    COMMUNITY_NOTIFICATIONS_COLLECTION,
    COMMUNITY_OFFERS_COLLECTION,
)
from app.utils.logger import logger

# ---------- Deterministic identifiers (idempotency keys) ----------

FARMERS = [
    {"mobile_id": "demo-farmer-yaqoob", "name": "Yaqoob"},
    {"mobile_id": "demo-farmer-ahmad", "name": "Ahmad"},
    {"mobile_id": "demo-farmer-waleed", "name": "Waleed"},
]
BUYERS = [
    {"mobile_id": "demo-buyer-1", "name": "Buyer 1"},
    {"mobile_id": "demo-buyer-2", "name": "Buyer 2"},
]

PENDING_OFFER_ID = "demo-offer-pending"
ACCEPTED_OFFER_ID = "demo-offer-accepted"

PENDING_CONV_ID = "demo-conv-pending"
ACCEPTED_CONV_ID = "demo-conv-accepted"

SEED_IMAGE_RELATIVE = "/uploads/community/seed_rice.jpg"
SEED_IMAGE_ABSOLUTE = "/app/uploads/community/seed_rice.jpg"


# ---------- Helpers ----------

async def _upsert(coll, key: Dict[str, Any], doc: Dict[str, Any]) -> None:
    """Insert if missing; otherwise leave existing document intact."""
    existing = await coll.find_one(key)
    if existing:
        return
    await coll.insert_one(doc)


def _ensure_seed_image() -> None:
    """Drop a tiny placeholder JPEG into the uploads volume so the demo image
    message renders. Done once; if a real picture is already there, leave it."""
    target = SEED_IMAGE_ABSOLUTE
    if os.path.exists(target):
        return
    os.makedirs(os.path.dirname(target), exist_ok=True)
    # Minimal valid 1×1 JPEG so the image bubble renders rather than showing a
    # broken-icon. Replace with a real photo to make the demo prettier:
    #   docker cp pretty.jpg backend:/app/uploads/community/seed_rice.jpg
    minimal_jpeg = bytes.fromhex(
        "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c180d0d1832211c213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232ffc00011080001000103012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00fbf80a28a2803fffd9"
    )
    try:
        with open(target, "wb") as fh:
            fh.write(minimal_jpeg)
        logger.info("seed_image_written path=%s bytes=%d", target, len(minimal_jpeg))
    except OSError:
        logger.exception("seed_image_write_failed path=%s", target)


# ---------- Steps ----------

async def find_rice_group(db):
    grp = await db[COMMUNITY_GROUPS_COLLECTION].find_one({"crop": "rice"})
    if not grp:
        raise SystemExit(
            "rice group missing — run scripts/migrate_community.py first"
        )
    return grp


async def seed_memberships(db, rice_group_id: str) -> None:
    coll = db[COMMUNITY_GROUP_MEMBERS_COLLECTION]
    now = datetime.utcnow()
    inserted = 0
    for f in FARMERS:
        key = {"group_id": rice_group_id, "mobile_id": f["mobile_id"]}
        if await coll.find_one(key):
            continue
        await coll.insert_one({
            **key,
            "joined_at": now,
            "last_read_at": None,
            "muted": False,
        })
        inserted += 1
    if inserted:
        await db[COMMUNITY_GROUPS_COLLECTION].update_one(
            {"group_id": rice_group_id},
            {"$inc": {"member_count": inserted}},
        )
    logger.info("seed_memberships inserted=%d group_id=%s", inserted, rice_group_id)


GROUP_TIMELINE: List[Dict[str, Any]] = [
    # (sender_index_into_FARMERS, hours_ago, body, image?)
    {"f": 0, "h": 70, "body": "Salam — anyone harvesting basmati this week?"},
    {"f": 1, "h": 68, "body": "Wa salam, mine is 2-3 days out. How's water situation in your area?"},
    {"f": 2, "h": 60, "body": "Canal water came on Monday — should be enough for one more cycle."},
    {"f": 0, "h": 55, "body": "Good. I had to buy from a tube-well last week, very expensive."},
    {"f": 1, "h": 50, "body": "What price are you getting from buyers?"},
    {"f": 0, "h": 48, "body": "Rs 180/kg for premium basmati. Anyone seen better?"},
    {"f": 2, "h": 42, "body": "Rs 175 here in Gujranwala. Market is calm."},
    {"f": 1, "h": 36, "body": "Sharing a photo of my crop today — looking healthy."},
    {"f": 1, "h": 36, "body": None, "image": True},
    {"f": 0, "h": 24, "body": "Mashallah, looks great!"},
    {"f": 2, "h": 12, "body": "I have 2 tons ready if anyone's buyer is looking."},
    {"f": 0, "h": 4, "body": "Will let you know — Buyer 1 has been asking around."},
]


async def seed_group_messages(db, rice_group_id: str) -> None:
    coll = db[COMMUNITY_MESSAGES_COLLECTION]
    now = datetime.utcnow()
    inserted = 0
    for i, item in enumerate(GROUP_TIMELINE):
        cmid = f"demo-rice-msg-{i}"
        sender = FARMERS[item["f"]]["mobile_id"]
        # Idempotency on (sender_id, client_message_id) — same as production
        if await coll.find_one({"sender_id": sender, "client_message_id": cmid}):
            continue
        body = item.get("body")
        is_image = bool(item.get("image"))
        await coll.insert_one({
            "message_id": f"demo-rice-mid-{i}",
            "conversation_id": None,
            "group_id": rice_group_id,
            "sender_id": sender,
            "body": body,
            "image_url": SEED_IMAGE_RELATIVE if is_image else None,
            "message_type": "image" if (is_image and not body) else "text",
            "payload": {},
            "client_message_id": cmid,
            "created_at": now - timedelta(hours=item["h"]),
        })
        inserted += 1
    logger.info("seed_group_messages inserted=%d", inserted)


async def seed_pending_dm(db) -> None:
    """Buyer 1 ↔ Yaqoob with a pending offer for 50 kg @ Rs 8,000/kg."""
    buyer = BUYERS[0]["mobile_id"]
    seller = FARMERS[0]["mobile_id"]
    participants = sorted([buyer, seller])
    now = datetime.utcnow()

    await _upsert(
        db[COMMUNITY_CONVERSATIONS_COLLECTION],
        {"conversation_id": PENDING_CONV_ID},
        {
            "conversation_id": PENDING_CONV_ID,
            "participants": participants,
            "context_type": "offer",
            "context_ref": PENDING_OFFER_ID,
            "last_message_at": now - timedelta(hours=1),
            "last_message_preview": "Offer: 8000 for 50 kg",
            "created_at": now - timedelta(hours=2),
        },
    )

    offer_doc = {
        "offer_id": PENDING_OFFER_ID,
        "product_id": "demo-product-rice-1",
        "buyer_id": buyer,
        "seller_id": seller,
        "price": 8000.0,
        "quantity": 50.0,
        "unit": "kg",
        "message": "Premium basmati for export.",
        "status": "pending",
        "created_at": now - timedelta(hours=2),
        "expires_at": now + timedelta(days=7),
    }
    await _upsert(
        db[COMMUNITY_OFFERS_COLLECTION],
        {"offer_id": PENDING_OFFER_ID},
        offer_doc,
    )

    # Two messages in this thread: a chat preamble + the offer card.
    await _upsert(
        db[COMMUNITY_MESSAGES_COLLECTION],
        {"sender_id": buyer, "client_message_id": "demo-pending-cmid-1"},
        {
            "message_id": "demo-pending-mid-1",
            "conversation_id": PENDING_CONV_ID,
            "group_id": None,
            "sender_id": buyer,
            "recipient_id": seller,
            "body": "Salam Yaqoob bhai, I'm looking to buy 50 kg of your basmati.",
            "image_url": None,
            "message_type": "text",
            "payload": {},
            "client_message_id": "demo-pending-cmid-1",
            "created_at": now - timedelta(hours=2, minutes=5),
        },
    )
    await _upsert(
        db[COMMUNITY_MESSAGES_COLLECTION],
        {"sender_id": buyer, "client_message_id": "demo-pending-cmid-2"},
        {
            "message_id": "demo-pending-mid-2",
            "conversation_id": PENDING_CONV_ID,
            "group_id": None,
            "sender_id": buyer,
            "recipient_id": seller,
            "body": "Offer: 8000 for 50 kg — Premium basmati for export.",
            "image_url": None,
            "message_type": "offer",
            "payload": offer_doc,
            "client_message_id": "demo-pending-cmid-2",
            "created_at": now - timedelta(hours=1),
        },
    )

    logger.info("seed_pending_dm conversation_id=%s offer_id=%s", PENDING_CONV_ID, PENDING_OFFER_ID)


async def seed_accepted_dm(db) -> None:
    """Buyer 2 ↔ Ahmad with an accepted offer + 'deal done' system message."""
    buyer = BUYERS[1]["mobile_id"]
    seller = FARMERS[1]["mobile_id"]
    participants = sorted([buyer, seller])
    now = datetime.utcnow()

    await _upsert(
        db[COMMUNITY_CONVERSATIONS_COLLECTION],
        {"conversation_id": ACCEPTED_CONV_ID},
        {
            "conversation_id": ACCEPTED_CONV_ID,
            "participants": participants,
            "context_type": "offer",
            "context_ref": ACCEPTED_OFFER_ID,
            "last_message_at": now - timedelta(minutes=30),
            "last_message_preview": "Offer accepted.",
            "created_at": now - timedelta(days=1),
        },
    )

    offer_doc = {
        "offer_id": ACCEPTED_OFFER_ID,
        "product_id": "demo-product-rice-2",
        "buyer_id": buyer,
        "seller_id": seller,
        "price": 175.0,
        "quantity": 100.0,
        "unit": "kg",
        "message": "100 kg trial order.",
        "status": "accepted",
        "created_at": now - timedelta(days=1),
        "expires_at": now + timedelta(days=6),
    }
    await _upsert(
        db[COMMUNITY_OFFERS_COLLECTION],
        {"offer_id": ACCEPTED_OFFER_ID},
        offer_doc,
    )

    await _upsert(
        db[COMMUNITY_MESSAGES_COLLECTION],
        {"sender_id": buyer, "client_message_id": "demo-accepted-cmid-1"},
        {
            "message_id": "demo-accepted-mid-1",
            "conversation_id": ACCEPTED_CONV_ID,
            "group_id": None,
            "sender_id": buyer,
            "recipient_id": seller,
            "body": "Offer: 175 for 100 kg — 100 kg trial order.",
            "image_url": None,
            "message_type": "offer",
            "payload": offer_doc,
            "client_message_id": "demo-accepted-cmid-1",
            "created_at": now - timedelta(days=1),
        },
    )
    await _upsert(
        db[COMMUNITY_MESSAGES_COLLECTION],
        {"sender_id": seller, "client_message_id": "demo-accepted-cmid-2"},
        {
            "message_id": "demo-accepted-mid-2",
            "conversation_id": ACCEPTED_CONV_ID,
            "group_id": None,
            "sender_id": seller,
            "recipient_id": buyer,
            "body": "Offer accepted.",
            "image_url": None,
            "message_type": "system",
            "payload": {"offer_id": ACCEPTED_OFFER_ID, "status": "accepted"},
            "client_message_id": "demo-accepted-cmid-2",
            "created_at": now - timedelta(hours=23),
        },
    )
    await _upsert(
        db[COMMUNITY_MESSAGES_COLLECTION],
        {"sender_id": buyer, "client_message_id": "demo-accepted-cmid-3"},
        {
            "message_id": "demo-accepted-mid-3",
            "conversation_id": ACCEPTED_CONV_ID,
            "group_id": None,
            "sender_id": buyer,
            "recipient_id": seller,
            "body": "Shukriya bhai — deal done. I'll arrange pickup tomorrow.",
            "image_url": None,
            "message_type": "text",
            "payload": {},
            "client_message_id": "demo-accepted-cmid-3",
            "created_at": now - timedelta(minutes=30),
        },
    )

    logger.info("seed_accepted_dm conversation_id=%s offer_id=%s", ACCEPTED_CONV_ID, ACCEPTED_OFFER_ID)


async def seed_notifications(db) -> None:
    """Two unread notifications per demo user. Bilingual content baked in."""
    coll = db[COMMUNITY_NOTIFICATIONS_COLLECTION]
    now = datetime.utcnow()

    plan: List[Dict[str, Any]] = []
    # Each (recipient, type, title_en, title_ur, body_en, body_ur, data)
    for u in [*FARMERS, *BUYERS]:
        plan.extend([
            {
                "notification_id": f"demo-notif-{u['mobile_id']}-welcome",
                "recipient_id": u["mobile_id"],
                "type": "group_added",
                "title_en": "Group joined",
                "title_ur": "گروپ میں شامل",
                "body_en": "Welcome to the Rice group",
                "body_ur": "Rice گروپ میں خوش آمدید",
                "data": {"crop": "rice"},
                "read": False,
                "created_at": now - timedelta(days=1),
            },
            {
                "notification_id": f"demo-notif-{u['mobile_id']}-dm",
                "recipient_id": u["mobile_id"],
                "type": "dm",
                "title_en": "New message",
                "title_ur": "نیا پیغام",
                "body_en": f"You have a new message in the {u['name']} thread",
                "body_ur": "آپ کو نیا پیغام موصول ہوا",
                "data": {},
                "read": False,
                "created_at": now - timedelta(hours=1),
            },
        ])

    inserted = 0
    for doc in plan:
        if await coll.find_one({"notification_id": doc["notification_id"]}):
            continue
        await coll.insert_one(doc)
        inserted += 1
    logger.info("seed_notifications inserted=%d", inserted)


# ---------- Entrypoint ----------

async def main() -> None:
    db = get_database()
    logger.info("seed_community_demo start db=%s", db.name)

    rice = await find_rice_group(db)
    rice_id = rice["group_id"]

    _ensure_seed_image()

    await seed_memberships(db, rice_id)
    await seed_group_messages(db, rice_id)
    await seed_pending_dm(db)
    await seed_accepted_dm(db)
    await seed_notifications(db)

    logger.info("seed_community_demo done")
    print("\nDemo data ready. Identifiers:")
    print(f"  Rice group:        {rice_id}")
    print(f"  Pending offer:     {PENDING_OFFER_ID} (conv {PENDING_CONV_ID})")
    print(f"  Accepted offer:    {ACCEPTED_OFFER_ID} (conv {ACCEPTED_CONV_ID})")
    print(f"  Farmers:           {[f['mobile_id'] for f in FARMERS]}")
    print(f"  Buyers:            {[b['mobile_id'] for b in BUYERS]}")


if __name__ == "__main__":
    asyncio.run(main())
