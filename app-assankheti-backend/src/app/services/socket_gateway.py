"""
Socket.IO gateway for the community/marketplace messaging layer.

Implements the event contract documented in `community_chat_build_plan_v2.md`.

Auth: clients connect with `auth={"token": "<jwt>"}` in the handshake.
Rooms joined per connection:
    user:<mobile_id>           - personal room (DMs, notifications, presence)
    group:<group_id>           - one per group the user belongs to

Events implemented (client -> server):
    dm:send, dm:read, group:send, group:read, presence:heartbeat

Events emitted (server -> client):
    dm:received, dm:sent, group:received, presence:update, error

Mongo writes inside event handlers are wrapped in try/except + log per the
project convention so a transient DB hiccup never silently drops the socket.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, Iterable, Optional

import socketio
from jose import JWTError, jwt

from app.db.db_connection import get_database
from app.models.collections import (
    COMMUNITY_CONVERSATIONS_COLLECTION,
    COMMUNITY_GROUP_MEMBERS_COLLECTION,
    COMMUNITY_MESSAGES_COLLECTION,
    COMMUNITY_PRESENCE_COLLECTION,
)
from app.services.community_helpers import (
    get_or_create_dm_conversation,
    is_blocked,
)
from app.services.security import ALGORITHM, SECRET_KEY
from app.utils.logger import logger

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
db = get_database()

MAX_BODY_CHARS = 4000


# ---------- Helpers ----------

def _user_room(mobile_id: str) -> str:
    return f"user:{mobile_id}"


def _group_room(group_id: str) -> str:
    return f"group:{group_id}"


def _decode_token(token: Optional[str]) -> Optional[str]:
    """Validate JWT, return mobile_id, or None if invalid."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    mobile_id = payload.get("mobile_id")
    if not isinstance(mobile_id, str) or not mobile_id:
        return None
    return mobile_id


async def _user_group_ids(mobile_id: str) -> list[str]:
    cursor = db[COMMUNITY_GROUP_MEMBERS_COLLECTION].find(
        {"mobile_id": mobile_id}, {"group_id": 1, "_id": 0}
    )
    return [doc["group_id"] async for doc in cursor]


async def _dm_partner_ids(mobile_id: str) -> list[str]:
    """Other participants in any DM conversation this user takes part in."""
    cursor = db[COMMUNITY_CONVERSATIONS_COLLECTION].find(
        {"participants": mobile_id}, {"participants": 1, "_id": 0}
    )
    partners: set[str] = set()
    async for doc in cursor:
        for p in doc.get("participants", []):
            if p and p != mobile_id:
                partners.add(p)
    return list(partners)


async def _broadcast_presence(
    mobile_id: str,
    status: str,
    group_ids: Iterable[str],
    last_seen_at: Optional[datetime] = None,
) -> None:
    payload: Dict[str, Any] = {"mobile_id": mobile_id, "status": status}
    if last_seen_at is not None:
        payload["last_seen_at"] = last_seen_at.isoformat()

    # Personal room (other devices of the same user)
    await sio.emit("presence:update", payload, room=_user_room(mobile_id))
    # Group rooms (peers in shared groups)
    for gid in group_ids:
        await sio.emit("presence:update", payload, room=_group_room(gid))
    # DM partners' personal rooms (users who can see this user in their inbox)
    try:
        partners = await _dm_partner_ids(mobile_id)
    except Exception:
        logger.exception("dm_partner_lookup_failed mobile_id=%s", mobile_id)
        partners = []
    for partner in partners:
        await sio.emit("presence:update", payload, room=_user_room(partner))


def _serialize_message(doc: Dict[str, Any]) -> Dict[str, Any]:
    out = {k: v for k, v in doc.items() if k != "_id"}
    if isinstance(out.get("created_at"), datetime):
        out["created_at"] = out["created_at"].isoformat()
    return out


async def _persist_message(doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Insert with idempotency on (sender_id, client_message_id).

    If a doc with the same (sender_id, client_message_id) already exists, return
    that one — keeps both socket and HTTP retries safe.
    """
    coll = db[COMMUNITY_MESSAGES_COLLECTION]
    cmid = doc.get("client_message_id")
    sender = doc.get("sender_id")
    if cmid and sender:
        existing = await coll.find_one({"sender_id": sender, "client_message_id": cmid})
        if existing:
            return existing
    try:
        await coll.insert_one(doc)
        return doc
    except Exception:
        logger.exception(
            "community_message_insert_failed sender_id=%s client_message_id=%s",
            sender, cmid,
        )
        # Maybe a unique-index race — try to read it back.
        if cmid and sender:
            existing = await coll.find_one(
                {"sender_id": sender, "client_message_id": cmid}
            )
            if existing:
                return existing
        return None


async def _emit_error(sid: str, code: str, message: str) -> None:
    await sio.emit("error", {"code": code, "message": message}, to=sid)


# ---------- Connect / Disconnect ----------

@sio.event
async def connect(sid, environ, auth):
    token = None
    if isinstance(auth, dict):
        token = auth.get("token")
    if not token:
        # Fallback: some clients pass token via query string.
        qs = environ.get("QUERY_STRING", "")
        for part in qs.split("&"):
            if part.startswith("token="):
                token = part.split("=", 1)[1]
                break

    mobile_id = _decode_token(token)
    if not mobile_id:
        logger.info("socket_connect_rejected sid=%s reason=invalid_token", sid)
        await _emit_error(sid, "unauthorized", "Invalid or missing token")
        return False

    await sio.save_session(sid, {"mobile_id": mobile_id})
    await sio.enter_room(sid, _user_room(mobile_id))

    group_ids: list[str] = []
    try:
        group_ids = await _user_group_ids(mobile_id)
        for gid in group_ids:
            await sio.enter_room(sid, _group_room(gid))
    except Exception:
        logger.exception("socket_group_lookup_failed mobile_id=%s", mobile_id)

    now = datetime.utcnow()
    try:
        await db[COMMUNITY_PRESENCE_COLLECTION].update_one(
            {"mobile_id": mobile_id},
            {
                "$set": {
                    "status": "online",
                    "socket_id": sid,
                    "last_active_at": now,
                },
                "$setOnInsert": {"mobile_id": mobile_id, "created_at": now},
            },
            upsert=True,
        )
    except Exception:
        logger.exception("presence_upsert_failed mobile_id=%s", mobile_id)

    try:
        await _broadcast_presence(mobile_id, "online", group_ids, last_seen_at=now)
    except Exception:
        logger.exception("presence_broadcast_failed mobile_id=%s", mobile_id)

    logger.info(
        "socket_connect sid=%s mobile_id=%s groups=%d", sid, mobile_id, len(group_ids)
    )
    return True


@sio.event
async def disconnect(sid):
    session = await sio.get_session(sid) or {}
    mobile_id = session.get("mobile_id")
    if not mobile_id:
        logger.info("socket_disconnect sid=%s mobile_id=unknown", sid)
        return

    now = datetime.utcnow()
    group_ids: list[str] = []
    try:
        group_ids = await _user_group_ids(mobile_id)
    except Exception:
        logger.exception("socket_group_lookup_failed mobile_id=%s", mobile_id)

    try:
        await db[COMMUNITY_PRESENCE_COLLECTION].update_one(
            {"mobile_id": mobile_id},
            {"$set": {"status": "offline", "last_active_at": now, "socket_id": None}},
            upsert=True,
        )
    except Exception:
        logger.exception("presence_offline_failed mobile_id=%s", mobile_id)

    try:
        await _broadcast_presence(mobile_id, "offline", group_ids, last_seen_at=now)
    except Exception:
        logger.exception("presence_broadcast_failed mobile_id=%s", mobile_id)

    logger.info("socket_disconnect sid=%s mobile_id=%s", sid, mobile_id)


# ---------- DM ----------

@sio.on("dm:send")
async def on_dm_send(sid, data):
    session = await sio.get_session(sid) or {}
    sender_id = session.get("mobile_id")
    if not sender_id:
        await _emit_error(sid, "unauthorized", "Not authenticated")
        return

    if not isinstance(data, dict):
        await _emit_error(sid, "validation", "Invalid payload")
        return

    recipient_id = (data.get("recipient_id") or "").strip()
    body = data.get("body") or ""
    image_url = data.get("image_url")
    context_type = data.get("context_type")
    context_ref = data.get("context_ref")
    client_message_id = data.get("client_message_id") or str(uuid.uuid4())

    if not recipient_id:
        await _emit_error(sid, "validation", "recipient_id is required")
        return
    if not body and not image_url:
        await _emit_error(sid, "validation", "Message body or image_url required")
        return
    if isinstance(body, str) and len(body) > MAX_BODY_CHARS:
        await _emit_error(sid, "validation", "Message body too long")
        return

    try:
        if await is_blocked(sender_id, recipient_id):
            await _emit_error(sid, "blocked", "Cannot send to this user")
            return
    except Exception:
        logger.exception(
            "dm_block_check_failed sender_id=%s recipient_id=%s",
            sender_id, recipient_id,
        )

    try:
        conversation_id = await get_or_create_dm_conversation(
            sender_id, recipient_id, context_type=context_type, context_ref=context_ref
        )
    except Exception:
        logger.exception(
            "dm_conversation_failed sender_id=%s recipient_id=%s",
            sender_id, recipient_id,
        )
        await _emit_error(sid, "internal", "Failed to open conversation")
        return

    now = datetime.utcnow()
    message_doc = {
        "message_id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "group_id": None,
        "sender_id": sender_id,
        "recipient_id": recipient_id,
        "body": body,
        "image_url": image_url,
        "message_type": "image" if (image_url and not body) else "text",
        "payload": {},
        "client_message_id": client_message_id,
        "created_at": now,
    }

    persisted = await _persist_message(message_doc)
    if not persisted:
        await _emit_error(sid, "internal", "Failed to persist message")
        return

    preview = (body[:120] if body else ("[image]" if image_url else ""))
    try:
        await db[COMMUNITY_CONVERSATIONS_COLLECTION].update_one(
            {"conversation_id": conversation_id},
            {"$set": {"last_message_at": now, "last_message_preview": preview}},
        )
    except Exception:
        logger.exception(
            "dm_conversation_update_failed conversation_id=%s", conversation_id
        )

    out = _serialize_message(persisted)
    await sio.emit("dm:sent", {"message": out}, to=sid)
    await sio.emit("dm:received", {"message": out}, room=_user_room(recipient_id))

    # Inbox bell. Imported lazily to avoid a circular import — notifications.py
    # imports from this module's `broadcast_to_user`.
    try:
        from app.services.notifications import notify  # noqa: WPS433
        await notify(
            recipient_id,
            "dm",
            data={
                "conversation_id": conversation_id,
                "message_id": out.get("message_id"),
                "sender_id": sender_id,
            },
            sender_name=sender_id,
        )
    except Exception:
        logger.exception(
            "dm_notification_failed sender_id=%s recipient_id=%s",
            sender_id, recipient_id,
        )

    logger.info(
        "dm_sent sender_id=%s recipient_id=%s conversation_id=%s message_id=%s",
        sender_id, recipient_id, conversation_id, out.get("message_id"),
    )


@sio.on("dm:read")
async def on_dm_read(sid, data):
    session = await sio.get_session(sid) or {}
    mobile_id = session.get("mobile_id")
    if not mobile_id:
        await _emit_error(sid, "unauthorized", "Not authenticated")
        return
    if not isinstance(data, dict):
        await _emit_error(sid, "validation", "Invalid payload")
        return
    conversation_id = (data.get("conversation_id") or "").strip()
    if not conversation_id:
        await _emit_error(sid, "validation", "conversation_id is required")
        return

    now = datetime.utcnow()
    try:
        await db[COMMUNITY_CONVERSATIONS_COLLECTION].update_one(
            {"conversation_id": conversation_id, "participants": mobile_id},
            {"$set": {f"last_read_at.{mobile_id}": now}},
        )
    except Exception:
        logger.exception(
            "dm_read_update_failed mobile_id=%s conversation_id=%s",
            mobile_id, conversation_id,
        )

    # Broadcast seen receipt to all participants in this conversation so the
    # sender's client can show double-tick / "Seen" indicator.
    seen_payload: Dict[str, Any] = {
        "conversation_id": conversation_id,
        "reader_id": mobile_id,
        "seen_at": now.isoformat(),
    }
    try:
        conv = await db[COMMUNITY_CONVERSATIONS_COLLECTION].find_one(
            {"conversation_id": conversation_id}, {"participants": 1, "_id": 0}
        )
        if conv:
            for participant in conv.get("participants", []):
                if participant and participant != mobile_id:
                    await sio.emit("dm:seen", seen_payload, room=_user_room(participant))
    except Exception:
        logger.exception(
            "dm_seen_broadcast_failed mobile_id=%s conversation_id=%s",
            mobile_id, conversation_id,
        )


# ---------- Typing indicators ----------

@sio.on("typing")
async def on_typing(sid, data):
    """
    Client emits: {recipient_id: str, is_typing: bool}
    Server emits to recipient's personal room: typing:update {sender_id, is_typing}
    """
    session = await sio.get_session(sid) or {}
    sender_id = session.get("mobile_id")
    if not sender_id:
        await _emit_error(sid, "unauthorized", "Not authenticated")
        return

    if not isinstance(data, dict):
        # Silently ignore malformed typing events — they are ephemeral and
        # erroring on them would be more disruptive than ignoring them.
        return

    recipient_id = (data.get("recipient_id") or "").strip()
    if not recipient_id:
        return

    is_typing: bool = bool(data.get("is_typing", True))

    try:
        await sio.emit(
            "typing:update",
            {"sender_id": sender_id, "is_typing": is_typing},
            room=_user_room(recipient_id),
        )
    except Exception:
        logger.exception(
            "typing_emit_failed sender_id=%s recipient_id=%s",
            sender_id, recipient_id,
        )


@sio.on("stop_typing")
async def on_stop_typing(sid, data):
    """
    Alias for typing with is_typing=false.
    Client emits: {recipient_id: str}
    """
    session = await sio.get_session(sid) or {}
    sender_id = session.get("mobile_id")
    if not sender_id:
        await _emit_error(sid, "unauthorized", "Not authenticated")
        return

    if not isinstance(data, dict):
        return

    recipient_id = (data.get("recipient_id") or "").strip()
    if not recipient_id:
        return

    try:
        await sio.emit(
            "typing:update",
            {"sender_id": sender_id, "is_typing": False},
            room=_user_room(recipient_id),
        )
    except Exception:
        logger.exception(
            "stop_typing_emit_failed sender_id=%s recipient_id=%s",
            sender_id, recipient_id,
        )


# ---------- Group ----------

@sio.on("group:send")
async def on_group_send(sid, data):
    session = await sio.get_session(sid) or {}
    sender_id = session.get("mobile_id")
    if not sender_id:
        await _emit_error(sid, "unauthorized", "Not authenticated")
        return

    if not isinstance(data, dict):
        await _emit_error(sid, "validation", "Invalid payload")
        return

    group_id = (data.get("group_id") or "").strip()
    body = data.get("body") or ""
    image_url = data.get("image_url")
    client_message_id = data.get("client_message_id") or str(uuid.uuid4())

    if not group_id:
        await _emit_error(sid, "validation", "group_id is required")
        return
    if not body and not image_url:
        await _emit_error(sid, "validation", "Message body or image_url required")
        return
    if isinstance(body, str) and len(body) > MAX_BODY_CHARS:
        await _emit_error(sid, "validation", "Message body too long")
        return

    try:
        member = await db[COMMUNITY_GROUP_MEMBERS_COLLECTION].find_one(
            {"group_id": group_id, "mobile_id": sender_id}
        )
    except Exception:
        logger.exception(
            "group_member_check_failed sender_id=%s group_id=%s",
            sender_id, group_id,
        )
        await _emit_error(sid, "internal", "Group lookup failed")
        return
    if not member:
        await _emit_error(sid, "validation", "Not a member of this group")
        return

    now = datetime.utcnow()
    message_doc = {
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

    persisted = await _persist_message(message_doc)
    if not persisted:
        await _emit_error(sid, "internal", "Failed to persist message")
        return

    out = _serialize_message(persisted)
    # Ack to sender first
    await sio.emit("dm:sent", {"message": out}, to=sid)  # mirrors dm:sent ack
    # Broadcast to room, skipping sender
    await sio.emit(
        "group:received", {"message": out}, room=_group_room(group_id), skip_sid=sid
    )
    logger.info(
        "group_sent sender_id=%s group_id=%s message_id=%s",
        sender_id, group_id, out.get("message_id"),
    )


@sio.on("group:read")
async def on_group_read(sid, data):
    session = await sio.get_session(sid) or {}
    mobile_id = session.get("mobile_id")
    if not mobile_id:
        await _emit_error(sid, "unauthorized", "Not authenticated")
        return
    if not isinstance(data, dict):
        await _emit_error(sid, "validation", "Invalid payload")
        return
    group_id = (data.get("group_id") or "").strip()
    if not group_id:
        await _emit_error(sid, "validation", "group_id is required")
        return

    now = datetime.utcnow()
    try:
        await db[COMMUNITY_GROUP_MEMBERS_COLLECTION].update_one(
            {"group_id": group_id, "mobile_id": mobile_id},
            {"$set": {"last_read_at": now}},
        )
    except Exception:
        logger.exception(
            "group_read_update_failed mobile_id=%s group_id=%s",
            mobile_id, group_id,
        )


# ---------- Presence heartbeat ----------

@sio.on("presence:heartbeat")
async def on_presence_heartbeat(sid, data=None):
    session = await sio.get_session(sid) or {}
    mobile_id = session.get("mobile_id")
    if not mobile_id:
        return

    now = datetime.utcnow()
    try:
        await db[COMMUNITY_PRESENCE_COLLECTION].update_one(
            {"mobile_id": mobile_id},
            {"$set": {"last_active_at": now, "status": "online"}},
            upsert=True,
        )
    except Exception:
        logger.exception("presence_heartbeat_failed mobile_id=%s", mobile_id)


# ---------- Public broadcast helpers (used by HTTP endpoints in later pieces) ----------

async def broadcast_to_user(mobile_id: str, event: str, payload: Dict[str, Any]) -> None:
    """Emit `event` with `payload` to a user's personal room."""
    if not mobile_id:
        return
    try:
        await sio.emit(event, payload, room=_user_room(mobile_id))
    except Exception:
        logger.exception(
            "broadcast_to_user_failed mobile_id=%s event=%s", mobile_id, event
        )


async def broadcast_to_group(
    group_id: str,
    event: str,
    payload: Dict[str, Any],
    skip_sid: Optional[str] = None,
) -> None:
    """Emit `event` with `payload` to a group room, optionally skipping a sid."""
    if not group_id:
        return
    try:
        await sio.emit(event, payload, room=_group_room(group_id), skip_sid=skip_sid)
    except Exception:
        logger.exception(
            "broadcast_to_group_failed group_id=%s event=%s", group_id, event
        )
