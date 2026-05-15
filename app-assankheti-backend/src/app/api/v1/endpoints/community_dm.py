"""
HTTP endpoints for direct messages (Piece 5).

These mirror the Socket.IO `dm:*` events from `services/socket_gateway.py`.
Send-via-HTTP must produce identical persisted state to send-via-socket so the
client's HTTP fallback is safe to use.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.v1.endpoints.chatbot import parse_datetime
from app.db.db_connection import get_database
from app.models.collections import (
    COMMUNITY_BLOCKS_COLLECTION,
    COMMUNITY_CONVERSATIONS_COLLECTION,
    COMMUNITY_MESSAGES_COLLECTION,
)
from app.schemas.community import MessageCreate, MessageOut
from app.services.community_helpers import (
    get_or_create_dm_conversation,
    is_blocked,
)
from app.services.security import get_current_mobile_id
from app.services.notifications import notify
from app.services.socket_gateway import broadcast_to_user
from app.utils.logger import logger

router = APIRouter()
db = get_database()

PREVIEW_CHARS = 80
MAX_HISTORY_LIMIT = 100


# ---------- Request bodies (lightweight, endpoint-local) ----------

class ReadRequest(BaseModel):
    conversation_id: str = Field(..., min_length=1)


class BlockRequest(BaseModel):
    blocked_id: str = Field(..., min_length=1)


class ResolveRequest(BaseModel):
    other_mobile_id: str = Field(..., min_length=1)
    context_type: Optional[str] = "direct"
    context_ref: Optional[str] = None


# ---------- Helpers ----------

def _strip_id(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in doc.items() if k != "_id"}


def _preview(body: Optional[str], image_url: Optional[str]) -> str:
    if body:
        return body[:PREVIEW_CHARS]
    if image_url:
        return "[image]"
    return ""


# ---------- Send ----------

@router.post("/dm/send", response_model=MessageOut)
async def dm_send(
    payload: MessageCreate,
    sender_id: str = Depends(get_current_mobile_id),
):
    recipient_id = (payload.recipient_id or "").strip()
    if not recipient_id:
        raise HTTPException(status_code=400, detail="recipient_id is required")
    if recipient_id == sender_id:
        raise HTTPException(status_code=400, detail="Cannot DM yourself")

    body = payload.body or ""
    image_url = payload.image_url
    if not body and not image_url:
        raise HTTPException(
            status_code=400, detail="Message body or image_url required"
        )

    if await is_blocked(sender_id, recipient_id):
        raise HTTPException(status_code=403, detail="Cannot send to this user")

    client_message_id = payload.client_message_id or str(uuid.uuid4())
    msgs = db[COMMUNITY_MESSAGES_COLLECTION]

    # Idempotency: if (sender_id, client_message_id) already exists, return it.
    existing = await msgs.find_one(
        {"sender_id": sender_id, "client_message_id": client_message_id}
    )
    if existing:
        return _strip_id(existing)

    try:
        conversation_id = await get_or_create_dm_conversation(
            sender_id,
            recipient_id,
            context_type=payload.context_type,
            context_ref=payload.context_ref,
        )
    except Exception:
        logger.exception(
            "dm_http_conversation_failed sender_id=%s recipient_id=%s",
            sender_id, recipient_id,
        )
        raise HTTPException(status_code=500, detail="Failed to open conversation")

    now = datetime.utcnow()
    inferred_type = payload.message_type
    if image_url and not body and inferred_type == "text":
        inferred_type = "image"

    doc = {
        "message_id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "group_id": None,
        "sender_id": sender_id,
        "recipient_id": recipient_id,
        "body": body,
        "image_url": image_url,
        "message_type": inferred_type,
        "payload": payload.payload or {},
        "client_message_id": client_message_id,
        "created_at": now,
    }

    try:
        await msgs.insert_one(doc)
    except Exception:
        logger.exception(
            "dm_http_insert_failed sender_id=%s client_message_id=%s",
            sender_id, client_message_id,
        )
        # Race against socket path inserting the same idempotency key
        existing = await msgs.find_one(
            {"sender_id": sender_id, "client_message_id": client_message_id}
        )
        if existing:
            return _strip_id(existing)
        raise HTTPException(status_code=500, detail="Failed to persist message")

    preview = _preview(body, image_url)
    try:
        await db[COMMUNITY_CONVERSATIONS_COLLECTION].update_one(
            {"conversation_id": conversation_id},
            {"$set": {"last_message_at": now, "last_message_preview": preview}},
        )
    except Exception:
        logger.exception(
            "dm_http_conversation_update_failed conversation_id=%s", conversation_id
        )

    out = _strip_id(doc)
    serializable = dict(out)
    if isinstance(serializable.get("created_at"), datetime):
        serializable["created_at"] = serializable["created_at"].isoformat()
    await broadcast_to_user(recipient_id, "dm:received", {"message": serializable})

    try:
        await notify(
            recipient_id,
            "dm",
            data={
                "conversation_id": conversation_id,
                "message_id": doc["message_id"],
                "sender_id": sender_id,
            },
            sender_name=sender_id,
        )
    except Exception:
        logger.exception(
            "dm_http_notification_failed sender_id=%s recipient_id=%s",
            sender_id, recipient_id,
        )

    logger.info(
        "dm_http_sent sender_id=%s recipient_id=%s conversation_id=%s message_id=%s",
        sender_id, recipient_id, conversation_id, doc["message_id"],
    )
    return out


# ---------- Resolve ----------

@router.post("/dm/resolve")
async def dm_resolve(
    payload: ResolveRequest,
    caller_id: str = Depends(get_current_mobile_id),
):
    """Return the conversation_id for a DM thread between caller and other user.

    Used by deep-link entry points (e.g. product-buy "Message Seller") so the
    chat screen can load existing history before the user sends anything.
    Creates the conversation if it does not exist yet — idempotent on
    (sorted participant pair).
    """
    other_id = (payload.other_mobile_id or "").strip()
    if not other_id:
        raise HTTPException(status_code=400, detail="other_mobile_id is required")
    if other_id == caller_id:
        raise HTTPException(status_code=400, detail="Cannot DM yourself")

    participants = sorted([caller_id, other_id])
    existing = await db[COMMUNITY_CONVERSATIONS_COLLECTION].find_one(
        {"participants": participants}
    )
    if existing:
        return {"conversation_id": existing["conversation_id"], "created": False}

    try:
        conversation_id = await get_or_create_dm_conversation(
            caller_id, other_id, payload.context_type, payload.context_ref,
        )
    except Exception:
        logger.exception(
            "dm_resolve_failed caller_id=%s other_id=%s", caller_id, other_id
        )
        raise HTTPException(status_code=500, detail="Failed to resolve conversation")

    return {"conversation_id": conversation_id, "created": True}


# ---------- Inbox ----------

@router.get("/dm/inbox/{mobile_id}")
async def dm_inbox(
    mobile_id: str,
    caller_id: str = Depends(get_current_mobile_id),
):
    if mobile_id != caller_id:
        raise HTTPException(status_code=403, detail="mobile_id does not match token")

    cursor = (
        db[COMMUNITY_CONVERSATIONS_COLLECTION]
        .find({"participants": mobile_id})
        .sort("last_message_at", -1)
    )

    items: List[Dict[str, Any]] = []
    async for conv in cursor:
        conv = _strip_id(conv)
        participants = conv.get("participants", [])
        other = next((p for p in participants if p != mobile_id), None)
        last_read_map = conv.get("last_read_at") or {}
        last_read_at = last_read_map.get(mobile_id) if isinstance(last_read_map, dict) else None

        unread_query: Dict[str, Any] = {
            "conversation_id": conv["conversation_id"],
            "sender_id": {"$ne": mobile_id},
        }
        if last_read_at:
            unread_query["created_at"] = {"$gt": last_read_at}

        try:
            unread_count = await db[COMMUNITY_MESSAGES_COLLECTION].count_documents(
                unread_query
            )
        except Exception:
            logger.exception(
                "dm_inbox_unread_count_failed conversation_id=%s",
                conv.get("conversation_id"),
            )
            unread_count = 0

        items.append({
            "conversation_id": conv["conversation_id"],
            "other_participant": other,
            "context_type": conv.get("context_type"),
            "context_ref": conv.get("context_ref"),
            "last_message_preview": conv.get("last_message_preview"),
            "last_message_at": conv.get("last_message_at"),
            "unread_count": unread_count,
        })

    return {"conversations": items}


# ---------- Messages history ----------

@router.get("/dm/messages/{conversation_id}")
async def dm_messages(
    conversation_id: str,
    before: Optional[str] = Query(None, description="ISO timestamp; messages strictly before this"),
    limit: int = Query(50, ge=1, le=MAX_HISTORY_LIMIT),
    caller_id: str = Depends(get_current_mobile_id),
):
    conv = await db[COMMUNITY_CONVERSATIONS_COLLECTION].find_one(
        {"conversation_id": conversation_id}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if caller_id not in (conv.get("participants") or []):
        raise HTTPException(status_code=403, detail="Not a participant")

    query: Dict[str, Any] = {"conversation_id": conversation_id}
    if before:
        try:
            query["created_at"] = {"$lt": parse_datetime(before)}
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid `before` timestamp")

    cursor = (
        db[COMMUNITY_MESSAGES_COLLECTION]
        .find(query)
        .sort("created_at", -1)
        .limit(limit)
    )
    messages = [_strip_id(doc) async for doc in cursor]
    return {"messages": messages}


# ---------- Read ----------

@router.post("/dm/read")
async def dm_read(
    payload: ReadRequest,
    caller_id: str = Depends(get_current_mobile_id),
):
    now = datetime.utcnow()
    try:
        result = await db[COMMUNITY_CONVERSATIONS_COLLECTION].update_one(
            {"conversation_id": payload.conversation_id, "participants": caller_id},
            {"$set": {f"last_read_at.{caller_id}": now}},
        )
    except Exception:
        logger.exception(
            "dm_http_read_failed mobile_id=%s conversation_id=%s",
            caller_id, payload.conversation_id,
        )
        raise HTTPException(status_code=500, detail="Failed to mark read")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"ok": True, "last_read_at": now}


# ---------- Block / Unblock ----------

@router.post("/dm/block")
async def dm_block(
    payload: BlockRequest,
    caller_id: str = Depends(get_current_mobile_id),
):
    blocked_id = payload.blocked_id.strip()
    if blocked_id == caller_id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")

    now = datetime.utcnow()
    try:
        await db[COMMUNITY_BLOCKS_COLLECTION].update_one(
            {"blocker_id": caller_id, "blocked_id": blocked_id},
            {"$setOnInsert": {
                "blocker_id": caller_id,
                "blocked_id": blocked_id,
                "created_at": now,
            }},
            upsert=True,
        )
    except Exception:
        logger.exception(
            "dm_block_failed blocker_id=%s blocked_id=%s", caller_id, blocked_id
        )
        raise HTTPException(status_code=500, detail="Failed to block user")

    logger.info("dm_blocked blocker_id=%s blocked_id=%s", caller_id, blocked_id)
    return {"ok": True}


@router.post("/dm/unblock")
async def dm_unblock(
    payload: BlockRequest,
    caller_id: str = Depends(get_current_mobile_id),
):
    blocked_id = payload.blocked_id.strip()
    try:
        result = await db[COMMUNITY_BLOCKS_COLLECTION].delete_one(
            {"blocker_id": caller_id, "blocked_id": blocked_id}
        )
    except Exception:
        logger.exception(
            "dm_unblock_failed blocker_id=%s blocked_id=%s", caller_id, blocked_id
        )
        raise HTTPException(status_code=500, detail="Failed to unblock user")

    logger.info(
        "dm_unblocked blocker_id=%s blocked_id=%s removed=%d",
        caller_id, blocked_id, result.deleted_count,
    )
    return {"ok": True, "removed": result.deleted_count}


@router.get("/dm/blocks/{mobile_id}")
async def dm_blocks(
    mobile_id: str,
    caller_id: str = Depends(get_current_mobile_id),
):
    if mobile_id != caller_id:
        raise HTTPException(status_code=403, detail="mobile_id does not match token")

    cursor = db[COMMUNITY_BLOCKS_COLLECTION].find({"blocker_id": mobile_id})
    blocks = [_strip_id(doc) async for doc in cursor]
    return {"blocks": blocks}
