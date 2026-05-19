"""
Stripe webhook receiver.

Endpoint: POST /api/v1/stripe/webhook

IMPORTANT: FastAPI must receive the RAW request body so Stripe signature
verification works. Do NOT add a Pydantic body parameter here.

Design:
- Verify signature first (fail-fast on invalid requests)
- Log every event to webhook_logs (idempotent on stripe event id)
- Dispatch to typed handlers
- All handlers are idempotent; safe to replay
"""
import json
from datetime import datetime, timezone
from typing import Any, Dict

import stripe
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from app.core.stripe_client import STRIPE_WEBHOOK_SECRET
from app.db.db_connection import get_database
from app.models.collections import WEBHOOK_LOGS_COLLECTION
from app.services.escrow_service import escrow_service
from app.services.stripe_service import stripe_service
from app.utils.logger import logger

router = APIRouter()


async def _log_event(event_id: str, event_type: str, data: Dict[str, Any], processed: bool) -> bool:
    """
    Insert webhook log. Returns False if this event was already processed
    (idempotency guard). Returns True if this is a new event.
    """
    db = get_database()
    existing = await db[WEBHOOK_LOGS_COLLECTION].find_one(
        {"stripe_event_id": event_id, "processed": True}
    )
    if existing:
        return False

    await db[WEBHOOK_LOGS_COLLECTION].update_one(
        {"stripe_event_id": event_id},
        {
            "$set": {
                "stripe_event_id": event_id,
                "event_type": event_type,
                "processed": processed,
                "data_snapshot": json.dumps(data, default=str)[:4096],
                "received_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )
    return True


async def _mark_processed(event_id: str, error: str | None = None) -> None:
    db = get_database()
    update: Dict[str, Any] = {
        "processed": error is None,
        "processed_at": datetime.now(timezone.utc),
    }
    if error:
        update["error"] = error
    await db[WEBHOOK_LOGS_COLLECTION].update_one(
        {"stripe_event_id": event_id},
        {"$set": update},
    )


# ── Main webhook route ─────────────────────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload: bytes = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event: stripe.Event = stripe_service.construct_webhook_event(
            payload=payload,
            sig_header=sig_header,
            webhook_secret=STRIPE_WEBHOOK_SECRET,
        )
    except stripe.error.SignatureVerificationError:
        logger.warning("stripe_webhook invalid signature")
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    except Exception as exc:
        logger.exception("stripe_webhook construct_failed")
        raise HTTPException(status_code=400, detail=str(exc))

    event_id: str = event["id"]
    event_type: str = event["type"]
    # Convert typed stripe-python 15 object to plain dict for handler compatibility
    obj: Dict[str, Any] = json.loads(str(event["data"]["object"]))

    is_new = await _log_event(event_id, event_type, obj, processed=False)
    if not is_new:
        logger.info("stripe_webhook duplicate event_id=%s type=%s — skipped", event_id, event_type)
        return JSONResponse({"status": "already_processed"})

    logger.info("stripe_webhook event_id=%s type=%s", event_id, event_type)
    error: str | None = None

    try:
        await _dispatch(event_type, obj)
    except Exception as exc:
        error = str(exc)
        logger.exception("stripe_webhook handler_failed event_id=%s type=%s", event_id, event_type)

    await _mark_processed(event_id, error=error)
    return JSONResponse({"status": "ok" if not error else "error", "event_id": event_id})


# ── Event dispatcher ──────────────────────────────────────────────────────────

async def _dispatch(event_type: str, obj: Dict[str, Any]) -> None:
    match event_type:
        case "checkout.session.completed":
            await _handle_checkout_completed(obj)
        case "payment_intent.succeeded":
            await _handle_payment_intent_succeeded(obj)
        case "payment_intent.payment_failed":
            await _handle_payment_intent_failed(obj)
        case "payment_intent.canceled":
            await _handle_payment_intent_canceled(obj)
        case "charge.refunded":
            await _handle_charge_refunded(obj)
        case "charge.dispute.created":
            await _handle_dispute_created(obj)
        case "charge.dispute.closed":
            await _handle_dispute_closed(obj)
        case "payout.paid":
            await _handle_payout_paid(obj)
        case "payout.failed":
            await _handle_payout_failed(obj)
        case "transfer.created":
            await _handle_transfer_created(obj)
        case "transfer.updated":
            await _handle_transfer_updated(obj)
        case "transfer.reversed":
            await _handle_transfer_reversed(obj)
        case _:
            logger.debug("stripe_webhook unhandled_event_type=%s", event_type)


# ── Handlers ──────────────────────────────────────────────────────────────────

async def _handle_checkout_completed(obj: Dict[str, Any]) -> None:
    session_id: str = obj["id"]
    payment_intent_id: str = obj.get("payment_intent", "")
    # latest_charge is nested inside payment_intent object when expanded
    charge_id: str | None = None
    if obj.get("payment_intent") and isinstance(obj["payment_intent"], dict):
        charge_id = obj["payment_intent"].get("latest_charge")

    order_id = await escrow_service.mark_order_paid(
        stripe_session_id=session_id,
        stripe_payment_intent_id=payment_intent_id,
        stripe_charge_id=charge_id,
    )
    if order_id:
        logger.info("stripe_webhook checkout_completed order_id=%s", order_id)


async def _handle_payment_intent_succeeded(obj: Dict[str, Any]) -> None:
    # Update charge_id if we have it (for refund tracking)
    pi_id: str = obj["id"]
    charge_id: str | None = obj.get("latest_charge")
    if charge_id:
        db = get_database()
        await db["payments"].update_one(
            {"stripe_payment_intent_id": pi_id},
            {"$set": {"stripe_charge_id": charge_id, "updated_at": datetime.now(timezone.utc)}},
        )
    logger.info("stripe_webhook payment_intent_succeeded pi=%s", pi_id)


async def _handle_payment_intent_failed(obj: Dict[str, Any]) -> None:
    pi_id: str = obj["id"]
    await escrow_service.mark_payment_failed(stripe_payment_intent_id=pi_id)
    logger.info("stripe_webhook payment_intent_failed pi=%s", pi_id)


async def _handle_payment_intent_canceled(obj: Dict[str, Any]) -> None:
    pi_id: str = obj["id"]
    await escrow_service.mark_payment_failed(stripe_payment_intent_id=pi_id)
    logger.info("stripe_webhook payment_intent_canceled pi=%s", pi_id)


async def _handle_charge_refunded(obj: Dict[str, Any]) -> None:
    charge_id: str = obj["id"]
    db = get_database()
    payment = await db["payments"].find_one({"stripe_charge_id": charge_id})
    if not payment:
        logger.warning("stripe_webhook charge_refunded: no payment for charge=%s", charge_id)
        return

    refunds_list = obj.get("refunds", {}).get("data", [])
    for r in refunds_list:
        await escrow_service.record_refund(
            order_id=payment["order_id"],
            stripe_refund_id=r["id"],
            amount_pkr=r.get("amount", 0) // 100,
            reason=r.get("reason", "requested_by_customer"),
        )


async def _handle_dispute_created(obj: Dict[str, Any]) -> None:
    await escrow_service.record_dispute_created(
        stripe_dispute_id=obj["id"],
        stripe_charge_id=obj.get("charge", ""),
        amount_paisa=obj.get("amount", 0),
        reason=obj.get("reason", "general"),
    )
    logger.info("stripe_webhook dispute_created id=%s", obj["id"])


async def _handle_dispute_closed(obj: Dict[str, Any]) -> None:
    outcome: str = obj.get("status", "lost")
    await escrow_service.record_dispute_closed(
        stripe_dispute_id=obj["id"],
        outcome=outcome,
    )
    logger.info("stripe_webhook dispute_closed id=%s outcome=%s", obj["id"], outcome)


async def _handle_payout_paid(obj: Dict[str, Any]) -> None:
    # This is a Stripe payout (platform bank payout), not a Connect transfer.
    logger.info("stripe_webhook payout_paid id=%s amount=%s", obj["id"], obj.get("amount"))


async def _handle_payout_failed(obj: Dict[str, Any]) -> None:
    logger.warning("stripe_webhook payout_failed id=%s", obj["id"])


async def _handle_transfer_created(obj: Dict[str, Any]) -> None:
    transfer_id: str = obj["id"]
    await escrow_service.mark_payout_paid(stripe_transfer_id=transfer_id)
    logger.info("stripe_webhook transfer_created id=%s", transfer_id)


async def _handle_transfer_updated(obj: Dict[str, Any]) -> None:
    transfer_id: str = obj["id"]
    logger.info("stripe_webhook transfer_updated id=%s", transfer_id)


async def _handle_transfer_reversed(obj: Dict[str, Any]) -> None:
    transfer_id: str = obj["id"]
    await escrow_service.mark_payout_failed(stripe_transfer_id=transfer_id)
    logger.warning("stripe_webhook transfer_reversed id=%s", transfer_id)
