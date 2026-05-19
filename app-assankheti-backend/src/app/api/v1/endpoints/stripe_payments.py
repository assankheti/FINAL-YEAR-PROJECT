"""
Buyer-facing payment APIs.

Routes:
  POST /api/v1/payments/create-checkout-session
  GET  /api/v1/payments/payment-complete          Stripe redirect landing page (HTML)
  GET  /api/v1/payments/orders                   list caller's orders
  GET  /api/v1/payments/orders/{order_id}        single order
  POST /api/v1/payments/orders/{order_id}/status update order status (farmer)
  POST /api/v1/payments/orders/{order_id}/refund request refund
  GET  /api/v1/payments/transactions             transaction history
  GET  /api/v1/payments/wallet                   wallet/balance summary
"""
import json as _json
from datetime import datetime, timezone
from typing import List, Optional
from urllib.parse import quote as _url_quote

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse

from app.db.db_connection import get_database
from app.models.collections import (
    ORDERS_COLLECTION,
    PAYMENTS_COLLECTION,
    PRODUCT_LISTINGS_COLLECTION,
    STRIPE_ACCOUNTS_COLLECTION,
)
from app.schemas.stripe_schemas import (
    CheckoutRequest,
    CheckoutSessionOut,
    OrderOut,
    OrderStatus,
    PaymentStatus,
    RefundRequest,
    TransactionHistoryOut,
    UpdateOrderStatusRequest,
    WalletBalanceOut,
)
from app.core.stripe_client import FRONTEND_URL
from app.services.escrow_service import escrow_service
from app.services.security import get_current_mobile_id
from app.services.stripe_service import stripe_service
from app.utils.logger import logger

router = APIRouter()


def _serialize_order(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if k != "_id"}


def _assert_obj_id(raw: str) -> ObjectId:
    try:
        return ObjectId(raw)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid product id")


# ── GET /payment-complete ──────────────────────────────────────────────────────

@router.get("/payment-complete", response_class=HTMLResponse)
async def payment_complete(
    status: str = Query("success"),
    order_id: Optional[str] = Query(None),
    app_url: Optional[str] = Query(None),
):
    """
    Browser landing page served after Stripe redirects on payment success/cancel.
    Shows a status message and attempts to deep-link back into the app.
    No auth required — called by the mobile browser, not the app.
    """
    is_success = status == "success"
    emoji = "✅" if is_success else "❌"
    title = "Payment Successful!" if is_success else "Payment Cancelled"
    message = (
        "Your order has been placed. Returning you to the app…"
        if is_success
        else "No payment was made. You can close this window and try again."
    )
    accent = "#0d5c4b" if is_success else "#dc2626"

    redirect_js = ""
    return_btn = ""
    if app_url:
        safe_url = _json.dumps(app_url)
        redirect_js = f"setTimeout(function(){{ window.location.href = {safe_url}; }}, 600);"
        return_btn = f'<a href="{app_url}" class="btn">Return to App</a>'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
       background:#f0f7f4;display:flex;align-items:center;justify-content:center;
       min-height:100vh;padding:24px}}
  .card{{background:#fff;border-radius:16px;padding:40px 28px;text-align:center;
         max-width:400px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08)}}
  .emoji{{font-size:64px;display:block;margin-bottom:16px}}
  h1{{color:{accent};font-size:22px;margin-bottom:10px}}
  p{{color:#6b7280;font-size:15px;line-height:1.5;margin-bottom:20px}}
  .btn{{display:block;background:{accent};color:#fff;padding:14px 24px;
        border-radius:50px;font-size:15px;font-weight:600;text-decoration:none;
        margin-bottom:12px}}
  .hint{{color:#9ca3af;font-size:12px;margin-top:8px}}
</style>
</head>
<body>
<div class="card">
  <span class="emoji">{emoji}</span>
  <h1>{title}</h1>
  <p>{message}</p>
  {return_btn}
  <p class="hint">You can also close this window manually to return to the app.</p>
</div>
<script>{redirect_js}</script>
</body>
</html>"""
    return HTMLResponse(content=html)


# ── POST /create-checkout-session ─────────────────────────────────────────────

@router.post("/create-checkout-session", response_model=CheckoutSessionOut)
async def create_checkout_session(
    payload: CheckoutRequest,
    request: Request,
    buyer_id: str = Depends(get_current_mobile_id),
):
    """
    Authenticated buyer creates a Stripe Checkout Session.

    1. Validates product exists and is active
    2. Calculates fees server-side (never trust client amounts)
    3. Looks up farmer's stripe account
    4. Creates Stripe Checkout Session
    5. Creates pending order + payment records
    """
    db = get_database()

    # 1. Validate product
    product = await db[PRODUCT_LISTINGS_COLLECTION].find_one(
        {"_id": _assert_obj_id(payload.product_id)}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.get("status") != "active":
        raise HTTPException(status_code=400, detail="Product is not available")
    if product.get("stock", 0) < payload.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {product.get('stock', 0)}",
        )

    farmer_id: str = product["farmer_id"]
    if farmer_id == buyer_id:
        raise HTTPException(status_code=400, detail="Cannot purchase your own product")

    # 2. Server-side fee calculation
    fees = stripe_service.calculate_fees(
        unit_price_pkr=float(product["price"]),
        quantity=payload.quantity,
    )

    # 3. Pre-create order_id so we can attach it to the session metadata
    import uuid
    order_id = str(uuid.uuid4())

    # 4. Build Stripe redirect URLs.
    #    The success/cancel URL points to THIS backend's /payment-complete page,
    #    which is reachable by the phone's browser (same network).
    #    That page shows a status message and JS-redirects to the app deep link
    #    (app_url), causing the OS to close the browser and re-open the app.
    scheme = request.url.scheme
    host = request.headers.get("host", str(request.url.netloc))
    backend_base = f"{scheme}://{host}"
    logger.info("checkout redirect_url received: %r", payload.redirect_url)
    encoded_app_url = _url_quote(payload.redirect_url or "", safe="")
    # Stripe replaces {CHECKOUT_SESSION_ID} in the success URL at redirect time.
    success_url = (
        f"{backend_base}/api/v1/payments/payment-complete"
        f"?status=success&order_id={order_id}&app_url={encoded_app_url}"
    )
    cancel_url = (
        f"{backend_base}/api/v1/payments/payment-complete"
        f"?status=cancel&order_id={order_id}&app_url={encoded_app_url}"
    )

    # 5. Create Stripe Checkout Session
    try:
        session = await stripe_service.create_checkout_session(
            order_id=order_id,
            buyer_id=buyer_id,
            farmer_id=farmer_id,
            product_name=product["name"],
            unit_price_pkr=float(product["price"]),
            quantity=payload.quantity,
            platform_fee_pkr=fees["platform_fee_pkr"],
            success_url=success_url,
            cancel_url=cancel_url,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        logger.exception("checkout_session_create_failed buyer=%s product=%s", buyer_id, payload.product_id)
        raise HTTPException(status_code=502, detail="Payment provider error")

    # 6. Persist pending order (use the pre-created order_id)
    now = datetime.now(timezone.utc)
    await db[ORDERS_COLLECTION].insert_one(
        {
            "order_id": order_id,
            "buyer_id": buyer_id,
            "farmer_id": farmer_id,
            "product_id": payload.product_id,
            "product_name": product["name"],
            "quantity": payload.quantity,
            "unit_price_pkr": int(product["price"]),
            "subtotal_pkr": fees["subtotal_pkr"],
            "commission_pkr": fees["commission_pkr"],
            "service_fee_pkr": fees["service_fee_pkr"],
            "platform_fee_pkr": fees["platform_fee_pkr"],
            "farmer_amount_pkr": fees["farmer_amount_pkr"],
            "total_pkr": fees["total_pkr"],
            "delivery_address": payload.delivery_address,
            "notes": payload.notes,
            "status": OrderStatus.pending,
            "payment_status": PaymentStatus.pending,
            "stripe_session_id": session["id"],
            "stripe_payment_intent_id": None,
            "created_at": now,
            "updated_at": now,
        }
    )
    import uuid as _uuid
    await db[PAYMENTS_COLLECTION].insert_one(
        {
            "payment_id": str(_uuid.uuid4()),
            "order_id": order_id,
            "buyer_id": buyer_id,
            "farmer_id": farmer_id,
            "amount_pkr": fees["total_pkr"],
            "platform_fee_pkr": fees["platform_fee_pkr"],
            "farmer_amount_pkr": fees["farmer_amount_pkr"],
            "status": PaymentStatus.pending,
            "stripe_session_id": session["id"],
            "stripe_payment_intent_id": None,
            "stripe_charge_id": None,
            "created_at": now,
            "updated_at": now,
        }
    )

    return CheckoutSessionOut(
        checkout_url=session["url"],
        session_id=session["id"],
        order_id=order_id,
        amount_pkr=fees["total_pkr"],
        platform_fee_pkr=fees["platform_fee_pkr"],
        farmer_amount_pkr=fees["farmer_amount_pkr"],
    )


# ── POST /orders/{order_id}/confirm-payment ───────────────────────────────────

@router.post("/orders/{order_id}/confirm-payment")
async def confirm_payment(
    order_id: str,
    session_id: str = Query(..., description="Stripe checkout session ID"),
    buyer_id: str = Depends(get_current_mobile_id),
):
    """
    Called by the mobile app after the Stripe checkout browser closes.
    Verifies the Stripe session is paid and auto-advances the order to 'shipped'.
    Idempotent: safe to call multiple times.
    """
    import asyncio as _asyncio

    db = get_database()

    logger.info("confirm_payment START order=%s session=%s buyer=%s", order_id, session_id, buyer_id)

    doc = await db[ORDERS_COLLECTION].find_one({"order_id": order_id})
    if not doc:
        logger.warning("confirm_payment ORDER_NOT_FOUND order=%s", order_id)
        raise HTTPException(status_code=404, detail="Order not found")
    if doc["buyer_id"] != buyer_id:
        logger.warning("confirm_payment WRONG_BUYER order=%s expected=%s got=%s",
                       order_id, doc["buyer_id"], buyer_id)
        raise HTTPException(status_code=403, detail="Not your order")
    if doc.get("stripe_session_id") != session_id:
        logger.warning("confirm_payment SESSION_MISMATCH order=%s db=%r received=%r",
                       order_id, doc.get("stripe_session_id"), session_id)
        raise HTTPException(status_code=400, detail="Session ID mismatch")

    # Already shipped or beyond — idempotent success
    if doc["status"] in (
        OrderStatus.shipped, OrderStatus.delivered, OrderStatus.completed
    ):
        logger.info("confirm_payment ALREADY_ADVANCED order=%s status=%s", order_id, doc["status"])
        return {"order_id": order_id, "status": doc["status"], "payment_confirmed": True}

    # Verify payment status with Stripe.
    # Retry up to 3 times with 1 s gap — covers the rare case where the browser
    # closes fractionally before Stripe propagates the session status to its API.
    stripe_session = None
    for attempt in range(3):
        try:
            stripe_session = await stripe_service.get_checkout_session(session_id)
            logger.info("confirm_payment stripe_status=%r order=%s attempt=%d",
                        stripe_session.payment_status, order_id, attempt)
            if stripe_session.payment_status == "paid":
                break
            stripe_session = None  # not yet paid, will retry
        except Exception as exc:
            logger.error(
                "confirm_payment stripe_error order=%s attempt=%d: %s",
                order_id, attempt, exc,
            )
        if attempt < 2:
            await _asyncio.sleep(1)

    if stripe_session is None or stripe_session.payment_status != "paid":
        # Fallback: if the webhook already confirmed payment in our DB, trust that.
        fresh = await db[ORDERS_COLLECTION].find_one({"order_id": order_id})
        if fresh and fresh.get("payment_status") == PaymentStatus.held_in_escrow:
            logger.info(
                "confirm_payment WEBHOOK_CONFIRMED order=%s", order_id
            )
            return {"order_id": order_id, "status": fresh.get("status"), "payment_confirmed": True}
        logger.warning("confirm_payment UNCONFIRMED order=%s stripe_session=%s",
                       order_id, stripe_session)
        return {"order_id": order_id, "status": doc["status"], "payment_confirmed": False}

    # Mark escrow paid (idempotent with webhook). Errors here must NOT block the
    # success response — the webhook will reconcile any missed DB update.
    pi_id = str(stripe_session.payment_intent) if stripe_session.payment_intent else ""
    try:
        await escrow_service.mark_order_paid(
            stripe_session_id=session_id,
            stripe_payment_intent_id=pi_id,
            stripe_charge_id=None,
        )
    except Exception:
        logger.exception("confirm_payment escrow_error order=%s (non-fatal)", order_id)

    # Auto-advance to shipped. DB error is also non-fatal — webhook will catch up.
    try:
        now = datetime.now(timezone.utc)
        await db[ORDERS_COLLECTION].update_one(
            {"order_id": order_id},
            {"$set": {"status": OrderStatus.shipped, "updated_at": now}},
        )
    except Exception:
        logger.exception("confirm_payment ship_update_error order=%s (non-fatal)", order_id)

    logger.info("confirm_payment order=%s auto_shipped buyer=%s", order_id, buyer_id)
    return {"order_id": order_id, "status": "shipped", "payment_confirmed": True}


# ── GET /orders ────────────────────────────────────────────────────────────────

@router.get("/orders", response_model=List[OrderOut])
async def list_my_orders(
    role: str = Query("buyer", pattern="^(buyer|farmer)$"),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    mobile_id: str = Depends(get_current_mobile_id),
):
    db = get_database()
    query: dict = {"buyer_id" if role == "buyer" else "farmer_id": mobile_id}
    if status:
        query["status"] = status
    cursor = (
        db[ORDERS_COLLECTION].find(query).sort("created_at", -1).limit(limit)
    )
    return [_serialize_order(doc) async for doc in cursor]


# ── GET /orders/{order_id} ────────────────────────────────────────────────────

@router.get("/orders/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: str,
    mobile_id: str = Depends(get_current_mobile_id),
):
    db = get_database()
    doc = await db[ORDERS_COLLECTION].find_one({"order_id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if doc["buyer_id"] != mobile_id and doc["farmer_id"] != mobile_id:
        raise HTTPException(status_code=403, detail="Not your order")
    return _serialize_order(doc)


# ── POST /orders/{order_id}/status ────────────────────────────────────────────

@router.post("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    payload: UpdateOrderStatusRequest,
    mobile_id: str = Depends(get_current_mobile_id),
):
    """Farmer updates order to processing/shipped/delivered."""
    db = get_database()
    doc = await db[ORDERS_COLLECTION].find_one({"order_id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")

    # Farmers update their own; buyers can mark delivered
    if doc["farmer_id"] != mobile_id and doc["buyer_id"] != mobile_id:
        raise HTTPException(status_code=403, detail="Not your order")

    farmer_transitions = {OrderStatus.processing, OrderStatus.shipped}
    buyer_transitions = {OrderStatus.delivered}

    if doc["farmer_id"] == mobile_id and payload.status not in farmer_transitions:
        raise HTTPException(status_code=400, detail=f"Farmers can only set: {[s.value for s in farmer_transitions]}")
    if doc["buyer_id"] == mobile_id and mobile_id != doc["farmer_id"] and payload.status not in buyer_transitions:
        raise HTTPException(status_code=400, detail=f"Buyers can only set: {[s.value for s in buyer_transitions]}")

    await db[ORDERS_COLLECTION].update_one(
        {"order_id": order_id},
        {
            "$set": {
                "status": payload.status,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    return {"order_id": order_id, "status": payload.status}


# ── POST /orders/{order_id}/refund ────────────────────────────────────────────

@router.post("/orders/{order_id}/refund")
async def request_refund(
    order_id: str,
    payload: RefundRequest,
    mobile_id: str = Depends(get_current_mobile_id),
):
    """Buyer requests a refund for a paid order."""
    db = get_database()
    doc = await db[ORDERS_COLLECTION].find_one({"order_id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if doc["buyer_id"] != mobile_id:
        raise HTTPException(status_code=403, detail="Only the buyer can request a refund")
    if doc["payment_status"] not in (PaymentStatus.held_in_escrow, PaymentStatus.authorized):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot refund order in state '{doc['payment_status']}'",
        )
    if not doc.get("stripe_payment_intent_id"):
        raise HTTPException(status_code=400, detail="No payment to refund")

    try:
        refund = await stripe_service.create_refund(
            payment_intent_id=doc["stripe_payment_intent_id"],
            order_id=order_id,
            reason=payload.reason,
        )
    except Exception:
        logger.exception("refund_failed order=%s", order_id)
        raise HTTPException(status_code=502, detail="Refund failed")

    await escrow_service.record_refund(
        order_id=order_id,
        stripe_refund_id=refund["id"],
        amount_pkr=refund.get("amount", 0) // 100,
        reason=payload.reason,
    )
    return {"order_id": order_id, "refund_id": refund["id"], "status": "refunded"}


# ── GET /transactions ──────────────────────────────────────────────────────────

@router.get("/transactions", response_model=List[TransactionHistoryOut])
async def transaction_history(
    limit: int = Query(50, ge=1, le=200),
    mobile_id: str = Depends(get_current_mobile_id),
):
    db = get_database()
    query = {"$or": [{"buyer_id": mobile_id}, {"farmer_id": mobile_id}]}
    cursor = db[ORDERS_COLLECTION].find(query).sort("created_at", -1).limit(limit)
    results = []
    async for doc in cursor:
        results.append(
            TransactionHistoryOut(
                order_id=doc["order_id"],
                product_name=doc["product_name"],
                buyer_id=doc["buyer_id"],
                farmer_id=doc["farmer_id"],
                amount_pkr=doc["total_pkr"],
                platform_fee_pkr=doc["platform_fee_pkr"],
                status=doc["status"],
                payment_status=doc["payment_status"],
                created_at=doc["created_at"],
            )
        )
    return results


# ── GET /wallet ───────────────────────────────────────────────────────────────

@router.get("/wallet", response_model=WalletBalanceOut)
async def wallet_balance(mobile_id: str = Depends(get_current_mobile_id)):
    db = get_database()
    cursor = db[ORDERS_COLLECTION].find({"farmer_id": mobile_id})
    total_earned = pending_payout = total_paid_out = commission = 0
    async for doc in cursor:
        if doc["payment_status"] in (
            PaymentStatus.held_in_escrow,
            PaymentStatus.released,
        ):
            total_earned += doc.get("farmer_amount_pkr", 0)
            commission += doc.get("commission_pkr", 0)
        if doc["payment_status"] == PaymentStatus.released:
            total_paid_out += doc.get("farmer_amount_pkr", 0)
        if doc["payment_status"] == PaymentStatus.held_in_escrow:
            pending_payout += doc.get("farmer_amount_pkr", 0)

    return WalletBalanceOut(
        mobile_id=mobile_id,
        total_earned_pkr=total_earned,
        total_paid_out_pkr=total_paid_out,
        pending_payout_pkr=pending_payout,
        platform_commission_pkr=commission,
    )
