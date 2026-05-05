"""
HTTP endpoints for structured price offers (Piece 7).

State machine:
    pending --accept--> accepted   (seller-only, terminal)
    pending --reject--> rejected   (seller-only, terminal)
    pending --withdraw-> expired    (buyer-only, terminal)

Each transition:
  - flips `community_offers.status`
  - inserts a system message in the DM thread
  - broadcasts an `offer:status_changed` event to the buyer (or `offer:received`
    to the seller on create)
  - inserts a notification doc and emits `notification:new`
"""

import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.db.db_connection import get_database
from app.models.collections import (
    COMMUNITY_CONVERSATIONS_COLLECTION,
    COMMUNITY_MESSAGES_COLLECTION,
    COMMUNITY_OFFERS_COLLECTION,
)
from app.schemas.community import OfferCreate, OfferOut, OfferStatus
from app.services.community_helpers import get_or_create_dm_conversation, is_blocked
from app.services.notifications import notify
from app.services.security import get_current_mobile_id
from app.services.socket_gateway import broadcast_to_user
from app.utils.logger import logger

router = APIRouter()
db = get_database()

OFFER_EXPIRY_DAYS = 7
TERMINAL_STATUSES = {"accepted", "rejected", "expired"}


# ---------- State machine ----------

def _validate_offer_action(
    offer: Dict[str, Any], action: str, actor_id: str
) -> None:
    """Pure validator for offer transitions.

    Raises HTTPException(400) for invalid state, HTTPException(403) for the
    wrong actor. Returns None when the transition is allowed.
    """
    status = offer.get("status")
    if action == "accept" or action == "reject":
        required_role = "seller"
        required_id = offer.get("seller_id")
    elif action == "withdraw":
        required_role = "buyer"
        required_id = offer.get("buyer_id")
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

    if status != "pending":
        past = {"accept": "accepted", "reject": "rejected", "withdraw": "withdrawn"}[action]
        raise HTTPException(
            status_code=400,
            detail=f"Offer cannot be {past}: current status is {status}",
        )
    if actor_id != required_id:
        raise HTTPException(
            status_code=403,
            detail=f"Only the {required_role} can {action} this offer",
        )


# ---------- Helpers ----------

def _strip_id(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in doc.items() if k != "_id"}


def _serialize_dt(value: Any) -> Any:
    return value.isoformat() if isinstance(value, datetime) else value


def _offer_payload(offer: Dict[str, Any]) -> Dict[str, Any]:
    """Wire-friendly copy of the offer (every datetime field as ISO string)."""
    out = {}
    for k, v in offer.items():
        if k == "_id":
            continue
        out[k] = _serialize_dt(v) if isinstance(v, datetime) else v
    return out


async def _insert_offer_message(
    conversation_id: str,
    sender_id: str,
    message_type: str,
    body: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    now = datetime.utcnow()
    doc = {
        "message_id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "group_id": None,
        "sender_id": sender_id,
        "body": body,
        "image_url": None,
        "message_type": message_type,
        "payload": payload or {},
        "client_message_id": str(uuid.uuid4()),
        "created_at": now,
    }
    try:
        await db[COMMUNITY_MESSAGES_COLLECTION].insert_one(doc)
    except Exception:
        logger.exception(
            "offer_message_insert_failed conversation_id=%s message_type=%s",
            conversation_id, message_type,
        )
        return doc

    preview = body[:80] if body else f"[{message_type}]"
    try:
        await db[COMMUNITY_CONVERSATIONS_COLLECTION].update_one(
            {"conversation_id": conversation_id},
            {"$set": {"last_message_at": now, "last_message_preview": preview}},
        )
    except Exception:
        logger.exception(
            "offer_conversation_update_failed conversation_id=%s", conversation_id
        )
    return doc


# ---------- Create ----------

@router.post("/offers/create")
async def offer_create(
    payload: OfferCreate,
    buyer_id: str = Depends(get_current_mobile_id),
):
    """Create a buyer-to-seller offer.

    Response: the offer doc plus `conversation_id` of the offer-anchored DM
    thread, so the frontend can navigate the buyer straight into it.
    """
    seller_id = payload.seller_id.strip()
    if not seller_id:
        raise HTTPException(status_code=400, detail="seller_id is required")
    if seller_id == buyer_id:
        raise HTTPException(status_code=400, detail="Cannot make an offer to yourself")

    # Block check is bidirectional — buyer cannot offer to a seller who blocked
    # them, and a buyer who blocked the seller shouldn't be able to offer either.
    if await is_blocked(buyer_id, seller_id):
        raise HTTPException(status_code=403, detail="Cannot make an offer to this user")

    now = datetime.utcnow()
    offer_id = str(uuid.uuid4())
    offer = {
        "offer_id": offer_id,
        "product_id": payload.product_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "price": float(payload.price),
        "quantity": float(payload.quantity),
        "unit": payload.unit,
        "message": payload.message,
        "status": "pending",
        "created_at": now,
        "expires_at": now + timedelta(days=OFFER_EXPIRY_DAYS),
    }
    try:
        await db[COMMUNITY_OFFERS_COLLECTION].insert_one(offer)
    except Exception:
        logger.exception(
            "offer_create_failed buyer_id=%s seller_id=%s product_id=%s",
            buyer_id, seller_id, payload.product_id,
        )
        raise HTTPException(status_code=500, detail="Failed to create offer")

    # Open or reuse a DM conversation anchored to this offer.
    try:
        conversation_id = await get_or_create_dm_conversation(
            buyer_id, seller_id, context_type="offer", context_ref=offer_id
        )
    except Exception:
        logger.exception(
            "offer_conversation_failed buyer_id=%s seller_id=%s offer_id=%s",
            buyer_id, seller_id, offer_id,
        )
        conversation_id = None

    if conversation_id:
        body = (
            f"Offer: {payload.price} for {payload.quantity} {payload.unit}"
            + (f" — {payload.message}" if payload.message else "")
        )
        await _insert_offer_message(
            conversation_id,
            buyer_id,
            "offer",
            body,
            payload=_offer_payload(offer),
        )

    wire_offer = _offer_payload(offer)
    await broadcast_to_user(seller_id, "offer:received", {"offer": wire_offer})
    await notify(
        seller_id,
        "offer_received",
        data={"offer_id": offer_id, "conversation_id": conversation_id},
        buyer_name=buyer_id,
    )

    logger.info(
        "offer_created offer_id=%s buyer_id=%s seller_id=%s product_id=%s",
        offer_id, buyer_id, seller_id, payload.product_id,
    )
    return {**_strip_id(offer), "conversation_id": conversation_id}


# ---------- Transitions ----------

async def _transition(offer_id: str, action: str, actor_id: str) -> Dict[str, Any]:
    offer = await db[COMMUNITY_OFFERS_COLLECTION].find_one({"offer_id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    _validate_offer_action(offer, action, actor_id)

    new_status: OfferStatus
    if action == "accept":
        new_status = "accepted"
    elif action == "reject":
        new_status = "rejected"
    else:
        new_status = "expired"

    try:
        await db[COMMUNITY_OFFERS_COLLECTION].update_one(
            {"offer_id": offer_id, "status": "pending"},
            {"$set": {"status": new_status, "updated_at": datetime.utcnow()}},
        )
    except Exception:
        logger.exception(
            "offer_status_update_failed offer_id=%s action=%s", offer_id, action
        )
        raise HTTPException(status_code=500, detail="Failed to update offer")

    updated = await db[COMMUNITY_OFFERS_COLLECTION].find_one({"offer_id": offer_id})
    if not updated:
        raise HTTPException(status_code=500, detail="Offer disappeared mid-transition")

    # System message in the DM thread
    conv = await db[COMMUNITY_CONVERSATIONS_COLLECTION].find_one(
        {"context_type": "offer", "context_ref": offer_id}
    )
    if conv:
        verb = {"accept": "accepted", "reject": "declined", "withdraw": "withdrew"}[action]
        await _insert_offer_message(
            conv["conversation_id"],
            actor_id,
            "system",
            f"Offer {verb}.",
            payload={"offer_id": offer_id, "status": new_status},
        )

    # Socket event to the counterparty
    counterparty = updated["buyer_id"] if action != "withdraw" else updated["seller_id"]
    wire_offer = _offer_payload(updated)
    await broadcast_to_user(
        counterparty, "offer:status_changed", {"offer": wire_offer}
    )

    notif_type = {
        "accept": "offer_accepted",
        "reject": "offer_rejected",
        "withdraw": "offer_rejected",  # buyer-initiated withdrawal — reuse rejected template
    }[action]
    await notify(
        counterparty,
        notif_type,
        data={"offer_id": offer_id, "status": new_status},
    )

    logger.info(
        "offer_transition offer_id=%s action=%s actor_id=%s new_status=%s",
        offer_id, action, actor_id, new_status,
    )
    return _strip_id(updated)


@router.post("/offers/{offer_id}/accept", response_model=OfferOut)
async def offer_accept(
    offer_id: str, caller_id: str = Depends(get_current_mobile_id)
):
    return await _transition(offer_id, "accept", caller_id)


@router.post("/offers/{offer_id}/reject", response_model=OfferOut)
async def offer_reject(
    offer_id: str, caller_id: str = Depends(get_current_mobile_id)
):
    return await _transition(offer_id, "reject", caller_id)


@router.post("/offers/{offer_id}/withdraw", response_model=OfferOut)
async def offer_withdraw(
    offer_id: str, caller_id: str = Depends(get_current_mobile_id)
):
    return await _transition(offer_id, "withdraw", caller_id)


# ---------- Lists ----------

async def _list_offers(filter_field: str, mobile_id: str, status: Optional[str]) -> List[Dict[str, Any]]:
    query: Dict[str, Any] = {filter_field: mobile_id}
    if status:
        query["status"] = status
    cursor = (
        db[COMMUNITY_OFFERS_COLLECTION]
        .find(query)
        .sort("created_at", -1)
    )
    return [_strip_id(d) async for d in cursor]


@router.get("/offers/sent/{mobile_id}")
async def offers_sent(
    mobile_id: str,
    status: Optional[str] = Query(None),
    caller_id: str = Depends(get_current_mobile_id),
):
    if mobile_id != caller_id:
        raise HTTPException(status_code=403, detail="mobile_id does not match token")
    offers = await _list_offers("buyer_id", mobile_id, status)
    return {"offers": offers}


@router.get("/offers/received/{mobile_id}")
async def offers_received(
    mobile_id: str,
    status: Optional[str] = Query(None),
    caller_id: str = Depends(get_current_mobile_id),
):
    if mobile_id != caller_id:
        raise HTTPException(status_code=403, detail="mobile_id does not match token")
    offers = await _list_offers("seller_id", mobile_id, status)
    return {"offers": offers}


@router.get("/offers/{offer_id}", response_model=OfferOut)
async def offer_detail(
    offer_id: str,
    caller_id: str = Depends(get_current_mobile_id),
):
    offer = await db[COMMUNITY_OFFERS_COLLECTION].find_one({"offer_id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if caller_id not in (offer.get("buyer_id"), offer.get("seller_id")):
        raise HTTPException(status_code=403, detail="Not a participant in this offer")
    return _strip_id(offer)
