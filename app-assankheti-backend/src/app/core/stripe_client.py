"""Stripe client initialisation and platform-level configuration."""
import os
import stripe

STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY: str = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET: str = os.getenv(
    "STRIPE_WEBHOOK_SECRET",
    "replace_with_stripe_webhook_secret",
)
STRIPE_API_VERSION: str = "2026-04-22.dahlia"

# Platform fee settings
PLATFORM_COMMISSION_RATE: float = float(os.getenv("PLATFORM_COMMISSION_RATE", "0.10"))
PLATFORM_SERVICE_FEE_PKR: int = int(os.getenv("PLATFORM_SERVICE_FEE_PKR", "100"))

# Admin mobile_ids that can approve payouts
STRIPE_ADMIN_MOBILE_IDS: set[str] = {
    item.strip()
    for item in os.getenv("STRIPE_ADMIN_MOBILE_IDS", "").split(",")
    if item.strip()
}

CURRENCY = "pkr"
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")


def init_stripe() -> None:
    """Set global Stripe config. Called once at app startup."""
    if not STRIPE_SECRET_KEY:
        raise RuntimeError("STRIPE_SECRET_KEY is not configured.")
    stripe.api_key = STRIPE_SECRET_KEY
    stripe.api_version = STRIPE_API_VERSION


def get_stripe() -> stripe:
    """Return the stripe module (already configured via init_stripe)."""
    if not stripe.api_key:
        init_stripe()
    return stripe
