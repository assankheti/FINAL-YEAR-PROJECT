"""
Stripe Connect Express — farmer onboarding.

Routes:
  POST /api/v1/stripe/connect/create-account   create Express account + link
  POST /api/v1/stripe/connect/refresh-link     regenerate onboarding link
  GET  /api/v1/stripe/connect/status           check account status
"""
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.core.stripe_client import STRIPE_PUBLISHABLE_KEY
from app.db.db_connection import get_database
from app.models.collections import (
    FINAL_SETTINGS_COLLECTION,
    STRIPE_ACCOUNTS_COLLECTION,
)
from app.schemas.stripe_schemas import (
    ConnectAccountOut,
    ConnectAccountStatus,
    CreateConnectAccountRequest,
)
from app.services.security import get_current_mobile_id
from app.services.stripe_service import stripe_service
from app.utils.logger import logger

router = APIRouter()


async def _get_or_raise_farmer(mobile_id: str) -> dict:
    db = get_database()
    settings = await db[FINAL_SETTINGS_COLLECTION].find_one({"mobile_id": mobile_id})
    if not settings or settings.get("role") not in ("farmer", "admin"):
        raise HTTPException(status_code=403, detail="Only farmers can set up Stripe accounts")
    return settings


async def _account_doc(mobile_id: str) -> dict | None:
    db = get_database()
    return await db[STRIPE_ACCOUNTS_COLLECTION].find_one({"mobile_id": mobile_id})


# ── POST /connect/create-account ──────────────────────────────────────────────

@router.post("/connect/create-account", response_model=ConnectAccountOut)
async def create_connect_account(
    payload: CreateConnectAccountRequest,
    mobile_id: str = Depends(get_current_mobile_id),
):
    """Create (or return existing) Stripe Express account and onboarding link."""
    await _get_or_raise_farmer(mobile_id)
    db = get_database()
    now = datetime.now(timezone.utc)

    existing = await _account_doc(mobile_id)
    if existing and existing.get("stripe_account_id"):
        stripe_account_id = existing["stripe_account_id"]
    else:
        try:
            account = await stripe_service.create_connect_account(
                mobile_id=mobile_id,
                country=payload.country,
                business_type=payload.business_type,
            )
            stripe_account_id = account["id"]
        except Exception as exc:
            logger.exception("stripe_connect_create_failed mobile_id=%s", mobile_id)
            raise HTTPException(status_code=502, detail=f"Stripe error: {exc}")

        await db[STRIPE_ACCOUNTS_COLLECTION].update_one(
            {"mobile_id": mobile_id},
            {
                "$set": {
                    "stripe_account_id": stripe_account_id,
                    "status": ConnectAccountStatus.onboarding,
                    "country": payload.country,
                    "business_type": payload.business_type,
                    "payouts_enabled": False,
                    "charges_enabled": False,
                    "requirements": [],
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "mobile_id": mobile_id,
                    "created_at": now,
                },
            },
            upsert=True,
        )

    try:
        onboarding_url = await stripe_service.create_account_link(
            stripe_account_id=stripe_account_id,
            mobile_id=mobile_id,
        )
    except Exception as exc:
        logger.exception("stripe_account_link_failed mobile_id=%s", mobile_id)
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc}")

    doc = await _account_doc(mobile_id)
    return ConnectAccountOut(
        mobile_id=mobile_id,
        stripe_account_id=stripe_account_id,
        status=doc.get("status", ConnectAccountStatus.onboarding),
        onboarding_url=onboarding_url,
        payouts_enabled=doc.get("payouts_enabled", False),
        charges_enabled=doc.get("charges_enabled", False),
        requirements=doc.get("requirements", []),
        created_at=doc.get("created_at"),
    )


# ── POST /connect/refresh-link ─────────────────────────────────────────────────

@router.post("/connect/refresh-link", response_model=ConnectAccountOut)
async def refresh_onboarding_link(
    mobile_id: str = Depends(get_current_mobile_id),
):
    """Generate a fresh onboarding link for an existing account."""
    doc = await _account_doc(mobile_id)
    if not doc or not doc.get("stripe_account_id"):
        raise HTTPException(status_code=404, detail="No Stripe account found. Call create-account first.")

    try:
        onboarding_url = await stripe_service.create_account_link(
            stripe_account_id=doc["stripe_account_id"],
            mobile_id=mobile_id,
        )
    except Exception as exc:
        logger.exception("stripe_refresh_link_failed mobile_id=%s", mobile_id)
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc}")

    return ConnectAccountOut(
        mobile_id=mobile_id,
        stripe_account_id=doc["stripe_account_id"],
        status=doc.get("status", ConnectAccountStatus.onboarding),
        onboarding_url=onboarding_url,
        payouts_enabled=doc.get("payouts_enabled", False),
        charges_enabled=doc.get("charges_enabled", False),
        requirements=doc.get("requirements", []),
        created_at=doc.get("created_at"),
    )


# ── GET /connect/status ────────────────────────────────────────────────────────

@router.get("/connect/status", response_model=ConnectAccountOut)
async def connect_account_status(
    mobile_id: str = Depends(get_current_mobile_id),
):
    """Fetch live account status from Stripe and sync to MongoDB."""
    doc = await _account_doc(mobile_id)
    if not doc or not doc.get("stripe_account_id"):
        raise HTTPException(status_code=404, detail="No Stripe account found.")

    try:
        account = await stripe_service.retrieve_account(doc["stripe_account_id"])
    except Exception as exc:
        logger.exception("stripe_retrieve_account_failed mobile_id=%s", mobile_id)
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc}")

    payouts_enabled: bool = account.get("payouts_enabled", False)
    charges_enabled: bool = account.get("charges_enabled", False)
    reqs: list = account.get("requirements", {}).get("currently_due", [])

    if payouts_enabled and charges_enabled:
        status = ConnectAccountStatus.active
    elif account.get("disabled_reason"):
        status = ConnectAccountStatus.disabled
    else:
        status = ConnectAccountStatus.onboarding

    db = get_database()
    await db[STRIPE_ACCOUNTS_COLLECTION].update_one(
        {"mobile_id": mobile_id},
        {
            "$set": {
                "payouts_enabled": payouts_enabled,
                "charges_enabled": charges_enabled,
                "requirements": reqs,
                "status": status,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return ConnectAccountOut(
        mobile_id=mobile_id,
        stripe_account_id=doc["stripe_account_id"],
        status=status,
        onboarding_url=None,
        payouts_enabled=payouts_enabled,
        charges_enabled=charges_enabled,
        requirements=reqs,
        created_at=doc.get("created_at"),
    )


# ── GET /config ───────────────────────────────────────────────────────────────

@router.get("/config")
async def stripe_config(_: str = Depends(get_current_mobile_id)):
    if not STRIPE_PUBLISHABLE_KEY:
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    return {"publishable_key": STRIPE_PUBLISHABLE_KEY}
