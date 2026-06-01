"""
Escrow state machine.

Keeps escrow_transactions, orders, and payments in sync whenever
a payment event occurs. All writes are idempotent on stripe event id.
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.db.db_connection import get_database
from app.models.collections import (
    DISPUTES_COLLECTION,
    ESCROW_TRANSACTIONS_COLLECTION,
    ORDERS_COLLECTION,
    PAYMENTS_COLLECTION,
    PAYOUTS_COLLECTION,
    REFUNDS_COLLECTION,
    WEBHOOK_LOGS_COLLECTION,
)
from app.schemas.stripe_schemas import (
    DisputeStatus,
    EscrowStatus,
    OrderStatus,
    PaymentStatus,
    PayoutStatus,
)
from app.utils.logger import logger

NOW = lambda: datetime.now(timezone.utc)


async def _ensure_indexes() -> None:
    db = get_database()
    await db[ORDERS_COLLECTION].create_index([("order_id", 1)], unique=True)
    await db[ORDERS_COLLECTION].create_index([("buyer_id", 1), ("created_at", -1)])
    await db[ORDERS_COLLECTION].create_index([("farmer_id", 1), ("created_at", -1)])
    await db[ORDERS_COLLECTION].create_index([("stripe_session_id", 1)])
    await db[ORDERS_COLLECTION].create_index([("stripe_payment_intent_id", 1)])
    await db[PAYMENTS_COLLECTION].create_index([("payment_id", 1)], unique=True)
    await db[PAYMENTS_COLLECTION].create_index([("order_id", 1)])
    await db[ESCROW_TRANSACTIONS_COLLECTION].create_index([("escrow_id", 1)], unique=True)
    await db[ESCROW_TRANSACTIONS_COLLECTION].create_index([("order_id", 1)])
    await db[PAYOUTS_COLLECTION].create_index([("payout_id", 1)], unique=True)
    await db[PAYOUTS_COLLECTION].create_index([("order_id", 1)])
    await db[PAYOUTS_COLLECTION].create_index([("farmer_id", 1), ("status", 1)])
    await db[REFUNDS_COLLECTION].create_index([("refund_id", 1)], unique=True)
    await db[REFUNDS_COLLECTION].create_index([("order_id", 1)])
    await db[DISPUTES_COLLECTION].create_index([("dispute_id", 1)], unique=True)
    await db[DISPUTES_COLLECTION].create_index([("order_id", 1)])
    await db[WEBHOOK_LOGS_COLLECTION].create_index([("stripe_event_id", 1)], unique=True)


class EscrowService:

    # ── Order lifecycle ────────────────────────────────────────────────────────

    async def create_pending_order(
        self,
        buyer_id: str,
        farmer_id: str,
        product_id: str,
        product_name: str,
        quantity: int,
        unit_price_pkr: float,
        fees: Dict[str, int],
        stripe_session_id: str,
        delivery_address: Optional[str],
        notes: Optional[str],
    ) -> str:
        db = get_database()
        order_id = str(uuid.uuid4())
        now = NOW()
        order = {
            "order_id": order_id,
            "buyer_id": buyer_id,
            "farmer_id": farmer_id,
            "product_id": product_id,
            "product_name": product_name,
            "quantity": quantity,
            "unit_price_pkr": int(unit_price_pkr),
            "subtotal_pkr": fees["subtotal_pkr"],
            "commission_pkr": fees["commission_pkr"],
            "service_fee_pkr": fees["service_fee_pkr"],
            "platform_fee_pkr": fees["platform_fee_pkr"],
            "farmer_amount_pkr": fees["farmer_amount_pkr"],
            "total_pkr": fees["total_pkr"],
            "delivery_address": delivery_address,
            "notes": notes,
            "status": OrderStatus.pending,
            "payment_status": PaymentStatus.pending,
            "stripe_session_id": stripe_session_id,
            "stripe_payment_intent_id": None,
            "created_at": now,
            "updated_at": now,
        }
        await db[ORDERS_COLLECTION].insert_one(order)

        payment_id = str(uuid.uuid4())
        payment = {
            "payment_id": payment_id,
            "order_id": order_id,
            "buyer_id": buyer_id,
            "farmer_id": farmer_id,
            "amount_pkr": fees["total_pkr"],
            "platform_fee_pkr": fees["platform_fee_pkr"],
            "farmer_amount_pkr": fees["farmer_amount_pkr"],
            "status": PaymentStatus.pending,
            "stripe_session_id": stripe_session_id,
            "stripe_payment_intent_id": None,
            "stripe_charge_id": None,
            "created_at": now,
            "updated_at": now,
        }
        await db[PAYMENTS_COLLECTION].insert_one(payment)
        return order_id

    async def mark_order_paid(
        self,
        stripe_session_id: str,
        stripe_payment_intent_id: str,
        stripe_charge_id: Optional[str],
    ) -> Optional[str]:
        db = get_database()
        now = NOW()
        order = await db[ORDERS_COLLECTION].find_one(
            {"stripe_session_id": stripe_session_id}
        )
        if not order:
            logger.warning("mark_order_paid: no order for session %s", stripe_session_id)
            return None

        if order["payment_status"] == PaymentStatus.held_in_escrow:
            return order["order_id"]

        order_id = order["order_id"]
        await db[ORDERS_COLLECTION].update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": OrderStatus.paid,
                    "payment_status": PaymentStatus.held_in_escrow,
                    "stripe_payment_intent_id": stripe_payment_intent_id,
                    "updated_at": now,
                }
            },
        )
        await db[PAYMENTS_COLLECTION].update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": PaymentStatus.held_in_escrow,
                    "stripe_payment_intent_id": stripe_payment_intent_id,
                    "stripe_charge_id": stripe_charge_id,
                    "updated_at": now,
                }
            },
        )

        escrow_id = str(uuid.uuid4())
        await db[ESCROW_TRANSACTIONS_COLLECTION].update_one(
            {"order_id": order_id},
            {
                "$setOnInsert": {
                    "escrow_id": escrow_id,
                    "order_id": order_id,
                    "buyer_id": order["buyer_id"],
                    "farmer_id": order["farmer_id"],
                    "amount_pkr": order["total_pkr"],
                    "farmer_amount_pkr": order["farmer_amount_pkr"],
                    "commission_pkr": order["commission_pkr"],
                    "status": EscrowStatus.holding,
                    "stripe_payment_intent_id": stripe_payment_intent_id,
                    "stripe_transfer_id": None,
                    "created_at": now,
                    "updated_at": now,
                }
            },
            upsert=True,
        )
        return order_id

    async def mark_payment_failed(self, stripe_payment_intent_id: str) -> None:
        db = get_database()
        now = NOW()
        order = await db[ORDERS_COLLECTION].find_one(
            {"stripe_payment_intent_id": stripe_payment_intent_id}
        )
        if not order:
            return
        await db[ORDERS_COLLECTION].update_one(
            {"order_id": order["order_id"]},
            {"$set": {"status": OrderStatus.canceled, "payment_status": PaymentStatus.failed, "updated_at": now}},
        )
        await db[PAYMENTS_COLLECTION].update_one(
            {"order_id": order["order_id"]},
            {"$set": {"status": PaymentStatus.failed, "updated_at": now}},
        )

    # ── Payout release ────────────────────────────────────────────────────────

    async def create_payout_record(
        self,
        order_id: str,
        farmer_id: str,
        gross_pkr: int,
        commission_pkr: int,
        net_pkr: int,
        approved_by: str,
        notes: Optional[str],
    ) -> str:
        db = get_database()
        payout_id = str(uuid.uuid4())
        now = NOW()
        await db[PAYOUTS_COLLECTION].insert_one(
            {
                "payout_id": payout_id,
                "order_id": order_id,
                "farmer_id": farmer_id,
                "gross_amount_pkr": gross_pkr,
                "commission_pkr": commission_pkr,
                "net_amount_pkr": net_pkr,
                "status": PayoutStatus.approved,
                "stripe_transfer_id": None,
                "approved_by": approved_by,
                "notes": notes,
                "created_at": now,
                "updated_at": now,
            }
        )
        return payout_id

    async def finalize_payout(
        self, payout_id: str, order_id: str, stripe_transfer_id: str
    ) -> None:
        db = get_database()
        now = NOW()
        await db[PAYOUTS_COLLECTION].update_one(
            {"payout_id": payout_id},
            {
                "$set": {
                    "stripe_transfer_id": stripe_transfer_id,
                    "status": PayoutStatus.processing,
                    "updated_at": now,
                }
            },
        )
        await db[ORDERS_COLLECTION].update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": OrderStatus.completed,
                    "payment_status": PaymentStatus.released,
                    "updated_at": now,
                }
            },
        )
        await db[PAYMENTS_COLLECTION].update_one(
            {"order_id": order_id},
            {"$set": {"status": PaymentStatus.released, "updated_at": now}},
        )
        await db[ESCROW_TRANSACTIONS_COLLECTION].update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": EscrowStatus.released,
                    "stripe_transfer_id": stripe_transfer_id,
                    "updated_at": now,
                }
            },
        )

    async def mark_payout_paid(self, stripe_transfer_id: str) -> None:
        db = get_database()
        await db[PAYOUTS_COLLECTION].update_one(
            {"stripe_transfer_id": stripe_transfer_id},
            {"$set": {"status": PayoutStatus.paid, "updated_at": NOW()}},
        )

    async def mark_payout_failed(self, stripe_transfer_id: str) -> None:
        db = get_database()
        await db[PAYOUTS_COLLECTION].update_one(
            {"stripe_transfer_id": stripe_transfer_id},
            {"$set": {"status": PayoutStatus.failed, "updated_at": NOW()}},
        )

    # ── Refunds ───────────────────────────────────────────────────────────────

    async def record_refund(
        self,
        order_id: str,
        stripe_refund_id: str,
        amount_pkr: int,
        reason: str,
    ) -> None:
        db = get_database()
        now = NOW()
        refund_id = str(uuid.uuid4())
        await db[REFUNDS_COLLECTION].update_one(
            {"stripe_refund_id": stripe_refund_id},
            {
                "$setOnInsert": {
                    "refund_id": refund_id,
                    "order_id": order_id,
                    "stripe_refund_id": stripe_refund_id,
                    "amount_pkr": amount_pkr,
                    "reason": reason,
                    "created_at": now,
                    "updated_at": now,
                }
            },
            upsert=True,
        )
        await db[ORDERS_COLLECTION].update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": OrderStatus.refunded,
                    "payment_status": PaymentStatus.refunded,
                    "updated_at": now,
                }
            },
        )
        await db[PAYMENTS_COLLECTION].update_one(
            {"order_id": order_id},
            {"$set": {"status": PaymentStatus.refunded, "updated_at": now}},
        )
        await db[ESCROW_TRANSACTIONS_COLLECTION].update_one(
            {"order_id": order_id},
            {"$set": {"status": EscrowStatus.refunded, "updated_at": now}},
        )

    # ── Disputes ──────────────────────────────────────────────────────────────

    async def record_dispute_created(
        self,
        stripe_dispute_id: str,
        stripe_charge_id: str,
        amount_paisa: int,
        reason: str,
    ) -> None:
        db = get_database()
        now = NOW()
        payment = await db[PAYMENTS_COLLECTION].find_one(
            {"stripe_charge_id": stripe_charge_id}
        )
        order_id = payment["order_id"] if payment else "unknown"
        dispute_id = str(uuid.uuid4())

        await db[DISPUTES_COLLECTION].update_one(
            {"stripe_dispute_id": stripe_dispute_id},
            {
                "$setOnInsert": {
                    "dispute_id": dispute_id,
                    "order_id": order_id,
                    "stripe_dispute_id": stripe_dispute_id,
                    "stripe_charge_id": stripe_charge_id,
                    "amount_pkr": amount_paisa // 100,
                    "reason": reason,
                    "status": DisputeStatus.needs_response,
                    "created_at": now,
                    "updated_at": now,
                }
            },
            upsert=True,
        )
        if order_id != "unknown":
            await db[ORDERS_COLLECTION].update_one(
                {"order_id": order_id},
                {
                    "$set": {
                        "status": OrderStatus.disputed,
                        "payment_status": PaymentStatus.disputed,
                        "updated_at": now,
                    }
                },
            )

    async def record_dispute_closed(
        self, stripe_dispute_id: str, outcome: str
    ) -> None:
        db = get_database()
        status = DisputeStatus.won if outcome == "won" else DisputeStatus.lost
        await db[DISPUTES_COLLECTION].update_one(
            {"stripe_dispute_id": stripe_dispute_id},
            {"$set": {"status": status, "updated_at": NOW()}},
        )


escrow_service = EscrowService()
