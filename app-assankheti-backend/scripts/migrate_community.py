"""
Idempotent migration for community/marketplace messaging (Piece 1).

Creates indexes for the 7 new community collections, backfills indexes for
existing chatbot collections flagged in CLAUDE.md, and seeds the Rice group.

Run from repo root with the backend src on PYTHONPATH:

    PYTHONPATH=app-assankheti-backend/src python -m scripts.migrate_community

Or directly:

    cd app-assankheti-backend && PYTHONPATH=src python scripts/migrate_community.py
"""

import asyncio
import uuid
from datetime import datetime

from pymongo import ASCENDING, DESCENDING

from app.db.db_connection import get_database
from app.models.collections import (
    CHAT_MESSAGES_COLLECTION,
    CHAT_SESSIONS_COLLECTION,
    COMMUNITY_BLOCKS_COLLECTION,
    COMMUNITY_CONVERSATIONS_COLLECTION,
    COMMUNITY_GROUP_MEMBERS_COLLECTION,
    COMMUNITY_GROUPS_COLLECTION,
    COMMUNITY_MESSAGES_COLLECTION,
    COMMUNITY_NOTIFICATIONS_COLLECTION,
    COMMUNITY_OFFERS_COLLECTION,
    COMMUNITY_PRESENCE_COLLECTION,
)
from app.utils.logger import logger


# (collection_name, [(keys, options_dict), ...])
INDEX_PLAN = [
    (
        COMMUNITY_MESSAGES_COLLECTION,
        [
            ([("conversation_id", ASCENDING), ("created_at", DESCENDING)], {"name": "conversation_created_idx"}),
            ([("group_id", ASCENDING), ("created_at", DESCENDING)], {"name": "group_created_idx"}),
            (
                [("sender_id", ASCENDING), ("client_message_id", ASCENDING)],
                {"name": "sender_client_msg_unique", "unique": True, "partialFilterExpression": {"client_message_id": {"$exists": True}}},
            ),
        ],
    ),
    (
        COMMUNITY_CONVERSATIONS_COLLECTION,
        [
            ([("participants", ASCENDING), ("last_message_at", DESCENDING)], {"name": "participants_last_msg_idx"}),
        ],
    ),
    (
        COMMUNITY_GROUP_MEMBERS_COLLECTION,
        [
            ([("mobile_id", ASCENDING), ("group_id", ASCENDING)], {"name": "member_group_unique", "unique": True}),
        ],
    ),
    (
        COMMUNITY_OFFERS_COLLECTION,
        [
            ([("buyer_id", ASCENDING), ("created_at", DESCENDING)], {"name": "buyer_created_idx"}),
            ([("seller_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)], {"name": "seller_status_created_idx"}),
        ],
    ),
    (
        COMMUNITY_BLOCKS_COLLECTION,
        [
            ([("blocker_id", ASCENDING), ("blocked_id", ASCENDING)], {"name": "blocker_blocked_unique", "unique": True}),
        ],
    ),
    (
        COMMUNITY_PRESENCE_COLLECTION,
        [
            ([("mobile_id", ASCENDING)], {"name": "presence_mobile_unique", "unique": True}),
        ],
    ),
    (
        COMMUNITY_NOTIFICATIONS_COLLECTION,
        [
            ([("recipient_id", ASCENDING), ("read", ASCENDING), ("created_at", DESCENDING)], {"name": "recipient_read_created_idx"}),
        ],
    ),
    (
        COMMUNITY_GROUPS_COLLECTION,
        [
            ([("group_id", ASCENDING)], {"name": "group_id_unique", "unique": True}),
            ([("crop", ASCENDING)], {"name": "crop_idx"}),
        ],
    ),
    # Backfill — existing chatbot collections (CLAUDE.md soft spots)
    (
        CHAT_MESSAGES_COLLECTION,
        [
            ([("mobile_id", ASCENDING), ("session_id", ASCENDING), ("created_at", ASCENDING)], {"name": "chat_msg_lookup_idx"}),
        ],
    ),
    (
        CHAT_SESSIONS_COLLECTION,
        [
            ([("mobile_id", ASCENDING), ("updated_at", DESCENDING)], {"name": "chat_session_recent_idx"}),
        ],
    ),
]


async def ensure_indexes(db) -> None:
    for coll_name, indexes in INDEX_PLAN:
        coll = db[coll_name]
        for keys, options in indexes:
            try:
                await coll.create_index(keys, **options)
                logger.info("index_created collection=%s name=%s", coll_name, options.get("name"))
            except Exception:
                logger.exception("index_failed collection=%s name=%s", coll_name, options.get("name"))


async def seed_rice_group(db) -> None:
    coll = db[COMMUNITY_GROUPS_COLLECTION]
    existing = await coll.find_one({"crop": "rice"})
    if existing:
        logger.info("seed_skip rice_group already_present group_id=%s", existing.get("group_id"))
        return

    doc = {
        "group_id": str(uuid.uuid4()),
        "name_en": "Rice",
        "name_ur": "چاول",
        "crop": "rice",
        "description": "Community group for rice farmers in Pakistan.",
        "image_url": None,
        "member_count": 0,
        "created_at": datetime.utcnow(),
    }
    await coll.insert_one(doc)
    logger.info("seed_inserted rice_group group_id=%s", doc["group_id"])


async def main() -> None:
    db = get_database()
    logger.info("migrate_community start db=%s", db.name)
    await ensure_indexes(db)
    await seed_rice_group(db)
    logger.info("migrate_community done")


if __name__ == "__main__":
    asyncio.run(main())
