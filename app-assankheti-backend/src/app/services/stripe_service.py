"""
Stripe service layer.

All Stripe API calls go through this class so the rest of the app never
imports stripe directly. Every method is async-safe (Stripe SDK calls are
made in a thread-pool via asyncio.to_thread when needed, or called
synchronously — the SDK is I/O-bound but not a coroutine library, so
wrapping is the correct pattern).
"""
import asyncio
import uuid
from typing import Any, Dict, List, Optional

import stripe

from app.core.stripe_client import (
    CURRENCY,
    FRONTEND_URL,
    PLATFORM_COMMISSION_RATE,
    PLATFORM_SERVICE_FEE_PKR,
    get_stripe,
)
from app.utils.logger import logger


def _pkr_to_paisa(pkr: float) -> int:
    """Convert PKR to smallest unit (paisa = 1/100 PKR)."""
    return int(round(pkr * 100))


def _paisa_to_pkr(paisa: int) -> int:
    """Convert paisa back to whole PKR."""
    return paisa // 100


def _idempotency_key(prefix: str, *args: str) -> str:
    return f"{prefix}-" + "-".join(args)


class StripeService:
    """Centralised Stripe operations."""

    # ── Connect Express ────────────────────────────────────────────────────────

    async def create_connect_account(
        self,
        mobile_id: str,
        email: Optional[str] = None,
        country: str = "PK",
        business_type: str = "individual",
    ) -> Dict[str, Any]:
        """Create a Stripe Express connected account for a farmer."""
        s = get_stripe()
        params: Dict[str, Any] = {
            "type": "express",
            "country": country,
            "business_type": business_type,
            "capabilities": {
                "transfers": {"requested": True},
            },
            "metadata": {"mobile_id": mobile_id},
            "settings": {
                "payouts": {"schedule": {"interval": "manual"}},
            },
        }
        if email:
            params["email"] = email

        account = await asyncio.to_thread(
            s.Account.create,
            **params,
            idempotency_key=_idempotency_key("create-account", mobile_id),
        )
        return account

    async def create_account_link(
        self,
        stripe_account_id: str,
        mobile_id: str,
        refresh_url: Optional[str] = None,
        return_url: Optional[str] = None,
    ) -> str:
        """Generate an onboarding link for the farmer."""
        s = get_stripe()
        link = await asyncio.to_thread(
            s.AccountLink.create,
            account=stripe_account_id,
            refresh_url=refresh_url or f"{FRONTEND_URL}/stripe/refresh?mid={mobile_id}",
            return_url=return_url or f"{FRONTEND_URL}/stripe/return?mid={mobile_id}",
            type="account_onboarding",
        )
        return link.url

    async def retrieve_account(self, stripe_account_id: str) -> Dict[str, Any]:
        s = get_stripe()
        return await asyncio.to_thread(s.Account.retrieve, stripe_account_id)

    # ── Checkout ───────────────────────────────────────────────────────────────

    async def create_checkout_session(
        self,
        order_id: str,
        buyer_id: str,
        farmer_id: str,
        product_name: str,
        unit_price_pkr: float,
        quantity: int,
        platform_fee_pkr: int,
        success_url: str,
        cancel_url: str,
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout Session.

        Funds land on the PLATFORM account (no transfer_data).
        The manual transfer to the farmer happens later at payout time.

        success_url / cancel_url are provided by the caller so the mobile
        client can pass its own deep-link scheme (e.g. assankhetiapp://)
        which the OS intercepts to auto-close the in-app browser.
        """
        s = get_stripe()
        fee_paisa = _pkr_to_paisa(platform_fee_pkr)

        session = await asyncio.to_thread(
            s.checkout.Session.create,
            mode="payment",
            currency=CURRENCY,
            line_items=[
                {
                    "price_data": {
                        "currency": CURRENCY,
                        "unit_amount": _pkr_to_paisa(unit_price_pkr),
                        "product_data": {
                            "name": product_name,
                            "metadata": {
                                "product_id": product_name,
                                "farmer_id": farmer_id,
                            },
                        },
                    },
                    "quantity": quantity,
                },
                {
                    "price_data": {
                        "currency": CURRENCY,
                        "unit_amount": fee_paisa,
                        "product_data": {"name": "Platform service fee"},
                    },
                    "quantity": 1,
                },
            ],
            payment_intent_data={
                "metadata": {
                    "order_id": order_id,
                    "buyer_id": buyer_id,
                    "farmer_id": farmer_id,
                },
            },
            metadata={
                "order_id": order_id,
                "buyer_id": buyer_id,
                "farmer_id": farmer_id,
            },
            success_url=success_url,
            cancel_url=cancel_url,
            idempotency_key=_idempotency_key("checkout", order_id),
        )
        return session

    # ── Transfers (payout release) ─────────────────────────────────────────────

    async def create_transfer(
        self,
        stripe_account_id: str,
        amount_pkr: int,
        order_id: str,
        payout_id: str,
    ) -> Dict[str, Any]:
        """Transfer net amount from platform to farmer's connected account."""
        s = get_stripe()
        transfer = await asyncio.to_thread(
            s.Transfer.create,
            amount=_pkr_to_paisa(amount_pkr),
            currency=CURRENCY,
            destination=stripe_account_id,
            metadata={
                "order_id": order_id,
                "payout_id": payout_id,
            },
            idempotency_key=_idempotency_key("transfer", payout_id),
        )
        return transfer

    # ── Refunds ────────────────────────────────────────────────────────────────

    async def create_refund(
        self,
        payment_intent_id: str,
        order_id: str,
        reason: str = "requested_by_customer",
    ) -> Dict[str, Any]:
        """Refund the full payment intent back to the buyer."""
        s = get_stripe()
        refund = await asyncio.to_thread(
            s.Refund.create,
            payment_intent=payment_intent_id,
            reason=reason,
            metadata={"order_id": order_id},
            idempotency_key=_idempotency_key("refund", order_id),
        )
        return refund

    # ── Session retrieval ─────────────────────────────────────────────────────

    async def get_checkout_session(self, session_id: str):
        """Retrieve a Stripe Checkout Session (to verify payment_status)."""
        s = get_stripe()
        return await asyncio.to_thread(s.checkout.Session.retrieve, session_id)

    # ── Webhook verification ───────────────────────────────────────────────────

    def construct_webhook_event(
        self,
        payload: bytes,
        sig_header: str,
        webhook_secret: str,
    ) -> stripe.Event:
        s = get_stripe()
        return s.Webhook.construct_event(payload, sig_header, webhook_secret)

    # ── Fee calculation (pure) ────────────────────────────────────────────────

    def calculate_fees(
        self, unit_price_pkr: float, quantity: int
    ) -> Dict[str, int]:
        subtotal = int(round(unit_price_pkr * quantity))
        commission = int(round(subtotal * PLATFORM_COMMISSION_RATE))
        service_fee = PLATFORM_SERVICE_FEE_PKR
        platform_fee = commission + service_fee
        farmer_amount = subtotal - commission
        return {
            "subtotal_pkr": subtotal,
            "commission_pkr": commission,
            "service_fee_pkr": service_fee,
            "platform_fee_pkr": platform_fee,
            "farmer_amount_pkr": farmer_amount,
            "total_pkr": subtotal + service_fee,
        }


stripe_service = StripeService()
