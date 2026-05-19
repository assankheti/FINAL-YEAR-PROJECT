"""
Admin-only Stripe APIs.

All routes require the caller's mobile_id to be in STRIPE_ADMIN_MOBILE_IDS
(env var) OR have role="admin" in user_settings.

Routes:
  POST /api/v1/admin/payouts/release/{order_id}  approve & release payout
  GET  /api/v1/admin/payouts                      list all payouts
  GET  /api/v1/admin/orders                       list all orders
  GET  /api/v1/admin/disputes                     list all disputes
  GET  /api/v1/admin/dashboard                    aggregate stats
  POST /api/v1/admin/orders/{order_id}/cancel     cancel & refund order
"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.stripe_client import STRIPE_ADMIN_MOBILE_IDS
from app.db.db_connection import get_database
from app.models.collections import (
    DISPUTES_COLLECTION,
    ESCROW_TRANSACTIONS_COLLECTION,
    FINAL_SETTINGS_COLLECTION,
    ORDERS_COLLECTION,
    PAYMENTS_COLLECTION,
    PAYOUTS_COLLECTION,
    STRIPE_ACCOUNTS_COLLECTION,
)
from app.schemas.stripe_schemas import (
    DisputeOut,
    OrderStatus,
    PaymentStatus,
    PayoutOut,
    PayoutStatus,
    ReleasePayoutRequest,
)
from app.services.escrow_service import escrow_service
from app.services.security import get_current_mobile_id
from app.services.stripe_service import stripe_service
from app.utils.logger import logger

router = APIRouter()


async def get_current_admin(mobile_id: str = Depends(get_current_mobile_id)) -> str:
    """Dependency: ensure caller is an admin."""
    if mobile_id in STRIPE_ADMIN_MOBILE_IDS:
        return mobile_id
    db = get_database()
    settings = await db[FINAL_SETTINGS_COLLECTION].find_one({"mobile_id": mobile_id})
    if settings and settings.get("role") == "admin":
        return mobile_id
    raise HTTPException(status_code=403, detail="Admin access required")


def _serialize(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if k != "_id"}


# ── POST /payouts/release/{order_id} ──────────────────────────────────────────

@router.post("/payouts/release/{order_id}")
async def release_payout(
    order_id: str,
    payload: ReleasePayoutRequest,
    admin_id: str = Depends(get_current_admin),
):
    """
    Admin approves payout for a completed/delivered order.

    Steps:
    1. Validate order is in delivered/completed state
    2. Check farmer has an active Stripe Connect account
    3. Calculate net farmer amount (gross - commission)
    4. Create Stripe Transfer to farmer's connected account
    5. Update payout, escrow, order, payment records
    """
    db = get_database()

    # 1. Load order
    order = await db[ORDERS_COLLECTION].find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order["payment_status"] != PaymentStatus.held_in_escrow:
        raise HTTPException(
            status_code=400,
            detail=f"Order payment is '{order['payment_status']}', expected 'held_in_escrow'",
        )
    allowed_statuses = {OrderStatus.delivered, OrderStatus.completed, OrderStatus.paid}
    if order["status"] not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Order status '{order['status']}' not eligible for payout. "
                   f"Allowed: {[s.value for s in allowed_statuses]}",
        )

    # 2. Check payout not already created
    existing_payout = await db[PAYOUTS_COLLECTION].find_one(
        {"order_id": order_id, "status": {"$ne": PayoutStatus.failed}}
    )
    if existing_payout:
        raise HTTPException(
            status_code=409,
            detail=f"Payout already exists with status '{existing_payout['status']}'",
        )

    farmer_id: str = order["farmer_id"]

    # 3. Look up farmer's Stripe account
    stripe_account_doc = await db[STRIPE_ACCOUNTS_COLLECTION].find_one(
        {"mobile_id": farmer_id}
    )
    if not stripe_account_doc or not stripe_account_doc.get("stripe_account_id"):
        raise HTTPException(
            status_code=400,
            detail=f"Farmer '{farmer_id}' has no Stripe Connect account",
        )
    if not stripe_account_doc.get("payouts_enabled"):
        raise HTTPException(
            status_code=400,
            detail="Farmer's Stripe account is not fully verified. Payouts not enabled.",
        )

    stripe_account_id: str = stripe_account_doc["stripe_account_id"]
    farmer_amount_pkr: int = order["farmer_amount_pkr"]
    commission_pkr: int = order["commission_pkr"]

    # 4. Create payout record (approved state)
    payout_id = await escrow_service.create_payout_record(
        order_id=order_id,
        farmer_id=farmer_id,
        gross_pkr=order["subtotal_pkr"],
        commission_pkr=commission_pkr,
        net_pkr=farmer_amount_pkr,
        approved_by=admin_id,
        notes=payload.notes,
    )

    # 5. Execute Stripe Transfer
    try:
        transfer = await stripe_service.create_transfer(
            stripe_account_id=stripe_account_id,
            amount_pkr=farmer_amount_pkr,
            order_id=order_id,
            payout_id=payout_id,
        )
    except Exception:
        logger.exception("payout_transfer_failed order=%s payout=%s", order_id, payout_id)
        raise HTTPException(status_code=502, detail="Stripe transfer failed")

    # 6. Finalize records
    await escrow_service.finalize_payout(
        payout_id=payout_id,
        order_id=order_id,
        stripe_transfer_id=transfer["id"],
    )

    logger.info(
        "payout_released order=%s payout=%s transfer=%s admin=%s farmer=%s amount=%d PKR",
        order_id, payout_id, transfer["id"], admin_id, farmer_id, farmer_amount_pkr,
    )
    return {
        "order_id": order_id,
        "payout_id": payout_id,
        "stripe_transfer_id": transfer["id"],
        "farmer_id": farmer_id,
        "net_amount_pkr": farmer_amount_pkr,
        "commission_pkr": commission_pkr,
        "status": PayoutStatus.processing,
    }


# ── GET /admin/payouts ─────────────────────────────────────────────────────────

@router.get("/payouts", response_model=List[PayoutOut])
async def list_payouts(
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    _: str = Depends(get_current_admin),
):
    db = get_database()
    query = {}
    if status:
        query["status"] = status
    cursor = db[PAYOUTS_COLLECTION].find(query).sort("created_at", -1).limit(limit)
    return [_serialize(doc) async for doc in cursor]


# ── GET /admin/orders ─────────────────────────────────────────────────────────

@router.get("/orders")
async def list_all_orders(
    status: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    _: str = Depends(get_current_admin),
):
    db = get_database()
    query: dict = {}
    if status:
        query["status"] = status
    if payment_status:
        query["payment_status"] = payment_status
    cursor = db[ORDERS_COLLECTION].find(query).sort("created_at", -1).limit(limit)
    return [_serialize(doc) async for doc in cursor]


# ── GET /admin/disputes ────────────────────────────────────────────────────────

@router.get("/disputes")
async def list_disputes(
    limit: int = Query(100, ge=1, le=500),
    _: str = Depends(get_current_admin),
):
    db = get_database()
    cursor = db[DISPUTES_COLLECTION].find({}).sort("created_at", -1).limit(limit)
    return [_serialize(doc) async for doc in cursor]


# ── GET /admin/dashboard ──────────────────────────────────────────────────────

@router.get("/dashboard")
async def admin_dashboard(_: str = Depends(get_current_admin)):
    db = get_database()
    orders = db[ORDERS_COLLECTION]
    payouts = db[PAYOUTS_COLLECTION]

    total_orders = await orders.count_documents({})
    paid_orders = await orders.count_documents({"payment_status": PaymentStatus.held_in_escrow})
    completed_orders = await orders.count_documents({"status": OrderStatus.completed})
    refunded_orders = await orders.count_documents({"status": OrderStatus.refunded})
    disputed_orders = await orders.count_documents({"status": OrderStatus.disputed})

    total_payouts_docs = await payouts.count_documents({"status": PayoutStatus.paid})
    pending_payouts = await payouts.count_documents({"status": {"$in": [PayoutStatus.pending, PayoutStatus.approved]}})

    # Revenue aggregation
    pipeline = [
        {"$match": {"payment_status": {"$in": [PaymentStatus.held_in_escrow, PaymentStatus.released]}}},
        {"$group": {
            "_id": None,
            "total_gmv": {"$sum": "$total_pkr"},
            "total_commission": {"$sum": "$commission_pkr"},
            "total_service_fees": {"$sum": "$service_fee_pkr"},
            "total_farmer_payouts": {"$sum": "$farmer_amount_pkr"},
        }},
    ]
    revenue_result = await orders.aggregate(pipeline).to_list(1)
    revenue = revenue_result[0] if revenue_result else {}

    return {
        "orders": {
            "total": total_orders,
            "paid_in_escrow": paid_orders,
            "completed": completed_orders,
            "refunded": refunded_orders,
            "disputed": disputed_orders,
        },
        "payouts": {
            "completed": total_payouts_docs,
            "pending": pending_payouts,
        },
        "revenue_pkr": {
            "gross_merchandise_value": revenue.get("total_gmv", 0),
            "platform_commission": revenue.get("total_commission", 0),
            "service_fees": revenue.get("total_service_fees", 0),
            "farmer_payouts": revenue.get("total_farmer_payouts", 0),
        },
    }


# ── POST /admin/orders/{order_id}/cancel ──────────────────────────────────────

@router.post("/orders/{order_id}/cancel")
async def admin_cancel_order(
    order_id: str,
    admin_id: str = Depends(get_current_admin),
):
    """Admin cancels an order and triggers a full refund."""
    db = get_database()
    order = await db[ORDERS_COLLECTION].find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order["status"] in (OrderStatus.completed, OrderStatus.refunded):
        raise HTTPException(status_code=400, detail=f"Cannot cancel an order with status '{order['status']}'")

    pi_id = order.get("stripe_payment_intent_id")
    if pi_id and order["payment_status"] == PaymentStatus.held_in_escrow:
        try:
            refund = await stripe_service.create_refund(
                payment_intent_id=pi_id,
                order_id=order_id,
                reason="requested_by_customer",
            )
            await escrow_service.record_refund(
                order_id=order_id,
                stripe_refund_id=refund["id"],
                amount_pkr=refund.get("amount", 0) // 100,
                reason="admin_cancel",
            )
        except Exception:
            logger.exception("admin_cancel_refund_failed order=%s", order_id)
            raise HTTPException(status_code=502, detail="Refund failed")
    else:
        # Not yet paid — just mark canceled
        await db[ORDERS_COLLECTION].update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": OrderStatus.canceled,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

    logger.info("admin_cancel order=%s by admin=%s", order_id, admin_id)
    return {"order_id": order_id, "status": "canceled"}
