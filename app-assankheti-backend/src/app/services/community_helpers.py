"""
Shared utilities for the community/marketplace messaging layer.

`parse_datetime` is intentionally NOT redefined here — import it from
`app.api.v1.endpoints.chatbot` when you need datetime normalization.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from app.db.db_connection import get_database
from app.models.collections import (
    COMMUNITY_BLOCKS_COLLECTION,
    COMMUNITY_CONVERSATIONS_COLLECTION,
)
from app.utils.logger import logger

db = get_database()


# ---------- Conversations ----------

async def get_or_create_dm_conversation(
    user_a: str,
    user_b: str,
    context_type: Optional[str] = None,
    context_ref: Optional[str] = None,
) -> str:
    """
    Get the existing DM conversation between user_a and user_b, or create one.

    Participants are stored as a sorted list so (A, B) and (B, A) collide on
    the same document. Returns the conversation_id.
    """
    if not user_a or not user_b:
        raise ValueError("both user_a and user_b are required")

    participants = sorted([user_a, user_b])
    coll = db[COMMUNITY_CONVERSATIONS_COLLECTION]

    existing = await coll.find_one({"participants": participants})
    if existing:
        return existing["conversation_id"]

    conversation_id = str(uuid.uuid4())
    doc = {
        "conversation_id": conversation_id,
        "participants": participants,
        "context_type": context_type,
        "context_ref": context_ref,
        "last_message_at": None,
        "last_message_preview": None,
        "created_at": datetime.utcnow(),
    }
    try:
        await coll.insert_one(doc)
        logger.info(
            "conversation_created conversation_id=%s participants=%s context_type=%s",
            conversation_id, participants, context_type,
        )
    except Exception:
        # Race: another writer inserted concurrently. Re-read and return that one.
        logger.exception("conversation_insert_race participants=%s", participants)
        existing = await coll.find_one({"participants": participants})
        if existing:
            return existing["conversation_id"]
        raise
    return conversation_id


# ---------- Blocks ----------

async def is_blocked(sender_id: str, recipient_id: str) -> bool:
    """
    True if either user has blocked the other. Checks both directions.
    """
    if not sender_id or not recipient_id:
        return False

    coll = db[COMMUNITY_BLOCKS_COLLECTION]
    found = await coll.find_one({
        "$or": [
            {"blocker_id": sender_id, "blocked_id": recipient_id},
            {"blocker_id": recipient_id, "blocked_id": sender_id},
        ]
    })
    return found is not None


# ---------- Notifications ----------

# Bilingual templates per notification type. Use {placeholders} that are
# substituted from kwargs at build time.
_NOTIFICATION_TEMPLATES: Dict[str, Dict[str, str]] = {
    "dm": {
        "title_en": "New message",
        "title_ur": "نیا پیغام",
        "body_en": "{sender_name} sent you a message",
        "body_ur": "{sender_name} نے آپ کو پیغام بھیجا",
    },
    "offer_received": {
        "title_en": "New offer",
        "title_ur": "نئی پیشکش",
        "body_en": "{buyer_name} made an offer",
        "body_ur": "{buyer_name} نے قیمت پیش کی",
    },
    "offer_accepted": {
        "title_en": "Offer accepted",
        "title_ur": "پیشکش قبول ہو گئی",
        "body_en": "Your offer was accepted",
        "body_ur": "آپ کی پیش کش قبول ہو گئی",
    },
    "offer_rejected": {
        "title_en": "Offer declined",
        "title_ur": "پیشکش مسترد ہو گئی",
        "body_en": "Your offer was declined",
        "body_ur": "آپ کی پیش کش مسترد ہو گئی",
    },
    "group_added": {
        "title_en": "Group joined",
        "title_ur": "گروپ میں شامل",
        "body_en": "Welcome to the {crop} group",
        "body_ur": "{crop} گروپ میں خوش آمدید",
    },
}


def build_notification(
    recipient_id: str,
    type: str,
    data: Optional[Dict[str, Any]] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Build a notification document (not persisted) with bilingual title/body.

    `kwargs` are used to fill placeholders in the templates (e.g. sender_name,
    buyer_name, crop). Unfilled placeholders are left as-is rather than raising,
    so a missing field downgrades gracefully.
    """
    template = _NOTIFICATION_TEMPLATES.get(type)
    if template is None:
        raise ValueError(f"unknown notification type: {type}")

    def _fmt(s: str) -> str:
        try:
            return s.format(**kwargs)
        except (KeyError, IndexError):
            return s

    return {
        "notification_id": str(uuid.uuid4()),
        "recipient_id": recipient_id,
        "type": type,
        "title_en": _fmt(template["title_en"]),
        "title_ur": _fmt(template["title_ur"]),
        "body_en": _fmt(template["body_en"]),
        "body_ur": _fmt(template["body_ur"]),
        "read": False,
        "data": data or {},
        "created_at": datetime.utcnow(),
    }
