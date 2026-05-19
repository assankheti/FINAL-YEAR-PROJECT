"""
HTTP endpoints for community groups.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.v1.endpoints.chatbot import parse_datetime
from app.db.db_connection import get_database
from app.models.collections import (
    COMMUNITY_GROUP_MEMBERS_COLLECTION,
    COMMUNITY_GROUPS_COLLECTION,
    COMMUNITY_MESSAGES_COLLECTION,
)
from app.schemas.community import MessageCreate
from app.services.security import get_current_mobile_id
from app.utils.logger import logger

router = APIRouter()
db = get_database()

PREVIEW_CHARS = 80
MAX_HISTORY_LIMIT = 100
MAX_MEMBERS_LIMIT = 200


class GroupSendRequest(BaseModel):
    body: Optional[str] = Field(None, max_length=4000)
    image_url: Optional[str] = None
    client_message_id: Optional[str] = None


# ---------- Helpers ----------

def _strip_id(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in doc.items() if k != "_id"}


def _preview(body: Optional[str], image_url: Optional[str]) -> str:
    if body:
        return body[:PREVIEW_CHARS]
    if image_url:
        return "[image]"
    return ""


async def _require_membership(group_id: str, mobile_id: str) -> Dict[str, Any]:
    member = await db[COMMUNITY_GROUP_MEMBERS_COLLECTION].find_one(
        {"group_id": group_id, "mobile_id": mobile_id}
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    return member


async def _last_group_message(group_id: str) -> Optional[Dict[str, Any]]:
    cursor = (
        db[COMMUNITY_MESSAGES_COLLECTION]
        .find({"group_id": group_id})
        .sort("created_at", -1)
        .limit(1)
    )
    docs = [d async for d in cursor]
    return docs[0] if docs else None


async def _unread_count(group_id: str, mobile_id: str, last_read_at: Optional[datetime]) -> int:
    query: Dict[str, Any] = {
        "group_id": group_id,
        "sender_id": {"$ne": mobile_id},
    }
    if last_read_at:
        query["created_at"] = {"$gt": last_read_at}
    try:
        return await db[COMMUNITY_MESSAGES_COLLECTION].count_documents(query)
    except Exception:
        logger.exception(
            "group_unread_count_failed group_id=%s mobile_id=%s", group_id, mobile_id
        )
        return 0


# ---------- List user's groups ----------

@router.get("/groups/list/{mobile_id}")
async def groups_list(
    mobile_id: str,
    caller_id: str = Depends(get_current_mobile_id),
):
    if mobile_id != caller_id:
        raise HTTPException(status_code=403, detail="mobile_id does not match token")

    member_cursor = db[COMMUNITY_GROUP_MEMBERS_COLLECTION].find({"mobile_id": mobile_id})
    items: List[Dict[str, Any]] = []
    async for member in member_cursor:
        member = _strip_id(member)
        group = await db[COMMUNITY_GROUPS_COLLECTION].find_one(
            {"group_id": member["group_id"]}
        )
        if not group:
            continue
        group = _strip_id(group)

        last_msg = await _last_group_message(member["group_id"])
        last_message_at = last_msg.get("created_at") if last_msg else None
        last_message_preview = (
            _preview(last_msg.get("body"), last_msg.get("image_url"))
            if last_msg else None
        )
        unread = await _unread_count(
            member["group_id"], mobile_id, member.get("last_read_at")
        )

        items.append({
            "group_id": group["group_id"],
            "name_en": group.get("name_en"),
            "name_ur": group.get("name_ur"),
            "crop": group.get("crop"),
            "description": group.get("description"),
            "image_url": group.get("image_url"),
            "member_count": group.get("member_count", 0),
            "muted": bool(member.get("muted")),
            "last_read_at": member.get("last_read_at"),
            "last_message_at": last_message_at,
            "last_message_preview": last_message_preview,
            "unread_count": unread,
        })

    items.sort(
        key=lambda x: x["last_message_at"] or datetime.min, reverse=True
    )
    return {"groups": items}


# ---------- Group detail ----------

@router.get("/groups/{group_id}")
async def group_detail(
    group_id: str,
    caller_id: str = Depends(get_current_mobile_id),
):
    group = await db[COMMUNITY_GROUPS_COLLECTION].find_one({"group_id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return _strip_id(group)


# ---------- Members ----------

@router.get("/groups/{group_id}/members")
async def group_members(
    group_id: str,
    limit: int = Query(50, ge=1, le=MAX_MEMBERS_LIMIT),
    skip: int = Query(0, ge=0),
    caller_id: str = Depends(get_current_mobile_id),
):
    group = await db[COMMUNITY_GROUPS_COLLECTION].find_one({"group_id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    cursor = (
        db[COMMUNITY_GROUP_MEMBERS_COLLECTION]
        .find({"group_id": group_id})
        .sort("joined_at", 1)
        .skip(skip)
        .limit(limit)
    )
    members = [_strip_id(d) async for d in cursor]
    return {"members": members, "skip": skip, "limit": limit}


# ---------- Messages history ----------

@router.get("/groups/{group_id}/messages")
async def group_messages(
    group_id: str,
    before: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=MAX_HISTORY_LIMIT),
    caller_id: str = Depends(get_current_mobile_id),
):
    await _require_membership(group_id, caller_id)

    query: Dict[str, Any] = {"group_id": group_id}
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
    messages = [_strip_id(d) async for d in cursor]
    return {"messages": messages}


# ---------- Send ----------

@router.post("/groups/{group_id}/send")
async def group_send(
    group_id: str,
    payload: GroupSendRequest,
    sender_id: str = Depends(get_current_mobile_id),
):
    await _require_membership(group_id, sender_id)

    body = payload.body or ""
    image_url = payload.image_url
    if not body and not image_url:
        raise HTTPException(
            status_code=400, detail="Message body or image_url required"
        )

    client_message_id = payload.client_message_id or str(uuid.uuid4())
    msgs = db[COMMUNITY_MESSAGES_COLLECTION]

    # Idempotency on (sender_id, client_message_id)
    existing = await msgs.find_one(
        {"sender_id": sender_id, "client_message_id": client_message_id}
    )
    if existing:
        return _strip_id(existing)

    now = datetime.utcnow()
    doc = {
        "message_id": str(uuid.uuid4()),
        "conversation_id": None,
        "group_id": group_id,
        "sender_id": sender_id,
        "body": body,
        "image_url": image_url,
        "message_type": "image" if (image_url and not body) else "text",
        "payload": {},
        "client_message_id": client_message_id,
        "created_at": now,
    }
    try:
        await msgs.insert_one(doc)
    except Exception:
        logger.exception(
            "group_http_insert_failed group_id=%s sender_id=%s client_message_id=%s",
            group_id, sender_id, client_message_id,
        )
        existing = await msgs.find_one(
            {"sender_id": sender_id, "client_message_id": client_message_id}
        )
        if existing:
            return _strip_id(existing)
        raise HTTPException(status_code=500, detail="Failed to persist message")

    out = _strip_id(doc)
    serializable = dict(out)
    if isinstance(serializable.get("created_at"), datetime):
        serializable["created_at"] = serializable["created_at"].isoformat()
    logger.info(
        "group_http_sent group_id=%s sender_id=%s message_id=%s",
        group_id, sender_id, doc["message_id"],
    )
    return out


# ---------- Read ----------

@router.post("/groups/{group_id}/read")
async def group_read(
    group_id: str,
    caller_id: str = Depends(get_current_mobile_id),
):
    now = datetime.utcnow()
    try:
        result = await db[COMMUNITY_GROUP_MEMBERS_COLLECTION].update_one(
            {"group_id": group_id, "mobile_id": caller_id},
            {"$set": {"last_read_at": now}},
        )
    except Exception:
        logger.exception(
            "group_read_failed group_id=%s mobile_id=%s", group_id, caller_id
        )
        raise HTTPException(status_code=500, detail="Failed to mark group read")

    if result.matched_count == 0:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    return {"ok": True, "last_read_at": now}


# ---------- Leave / Join / Mute ----------

@router.post("/groups/{group_id}/leave")
async def group_leave(
    group_id: str,
    caller_id: str = Depends(get_current_mobile_id),
):
    try:
        result = await db[COMMUNITY_GROUP_MEMBERS_COLLECTION].delete_one(
            {"group_id": group_id, "mobile_id": caller_id}
        )
    except Exception:
        logger.exception(
            "group_leave_failed group_id=%s mobile_id=%s", group_id, caller_id
        )
        raise HTTPException(status_code=500, detail="Failed to leave group")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not a member of this group")

    try:
        await db[COMMUNITY_GROUPS_COLLECTION].update_one(
            {"group_id": group_id}, {"$inc": {"member_count": -1}}
        )
    except Exception:
        logger.exception("group_member_count_decrement_failed group_id=%s", group_id)

    logger.info("group_left group_id=%s mobile_id=%s", group_id, caller_id)
    return {"ok": True}


@router.post("/groups/{group_id}/join")
async def group_join(
    group_id: str,
    caller_id: str = Depends(get_current_mobile_id),
):
    group = await db[COMMUNITY_GROUPS_COLLECTION].find_one({"group_id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    existing = await db[COMMUNITY_GROUP_MEMBERS_COLLECTION].find_one(
        {"group_id": group_id, "mobile_id": caller_id}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already a member of this group")

    now = datetime.utcnow()
    try:
        await db[COMMUNITY_GROUP_MEMBERS_COLLECTION].insert_one({
            "group_id": group_id,
            "mobile_id": caller_id,
            "joined_at": now,
            "last_read_at": None,
            "muted": False,
        })
    except Exception:
        logger.exception(
            "group_join_failed group_id=%s mobile_id=%s", group_id, caller_id
        )
        raise HTTPException(status_code=500, detail="Failed to join group")

    try:
        await db[COMMUNITY_GROUPS_COLLECTION].update_one(
            {"group_id": group_id}, {"$inc": {"member_count": 1}}
        )
    except Exception:
        logger.exception("group_member_count_increment_failed group_id=%s", group_id)

    logger.info("group_joined group_id=%s mobile_id=%s", group_id, caller_id)
    return {"ok": True}


@router.post("/groups/{group_id}/mute")
async def group_mute(
    group_id: str,
    caller_id: str = Depends(get_current_mobile_id),
):
    member = await db[COMMUNITY_GROUP_MEMBERS_COLLECTION].find_one(
        {"group_id": group_id, "mobile_id": caller_id}
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    new_muted = not bool(member.get("muted"))
    try:
        await db[COMMUNITY_GROUP_MEMBERS_COLLECTION].update_one(
            {"group_id": group_id, "mobile_id": caller_id},
            {"$set": {"muted": new_muted}},
        )
    except Exception:
        logger.exception(
            "group_mute_failed group_id=%s mobile_id=%s", group_id, caller_id
        )
        raise HTTPException(status_code=500, detail="Failed to update mute setting")

    logger.info(
        "group_mute_toggled group_id=%s mobile_id=%s muted=%s",
        group_id, caller_id, new_muted,
    )
    return {"ok": True, "muted": new_muted}
