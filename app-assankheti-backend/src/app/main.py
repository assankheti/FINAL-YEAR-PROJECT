# src/app/main.py
#
# Run with:
#   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
import os
from collections.abc import Callable, Awaitable

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
import asyncio

from .api.v1.endpoints import auth, deviceSettings
from .utils.logger import logger
from .db.db_connection import get_database


from .api.v1.endpoints.disease_api import router as disease_router
from .api.v1.endpoints.fertilizer_api import router as fertilizer_router
from .api.v1.endpoints.pesticide_api import router as pesticide_router
from .api.v1.endpoints.seed_api import router as seed_router
from .api.v1.endpoints.products import router as products_router
from .api.v1.endpoints import calculator
from .api.v1.endpoints.chatbot import router as chatbot_router
from .api.v1.endpoints.media import router as media_router
from .api.v1.endpoints.community_dm import router as community_dm_router
from .api.v1.endpoints.community_groups import router as community_groups_router
from .api.v1.endpoints.community_offers import router as community_offers_router
from .api.v1.endpoints.community_notifications import router as community_notifications_router
from .api.v1.endpoints.community_presence import router as community_presence_router
from .api.v1.endpoints.stream_chat import router as stream_chat_router
from .api.v1.endpoints.stripe_connect import router as stripe_connect_router
from .api.v1.endpoints.stripe_payments import router as stripe_payments_router
from .api.v1.endpoints.stripe_webhook import router as stripe_webhook_router
from .api.v1.endpoints.stripe_admin import router as stripe_admin_router
from .core.stripe_client import init_stripe
from .services.escrow_service import _ensure_indexes as _ensure_stripe_indexes
from .services.fertilizer_service import scrape_and_store_fertilizers
from .services.pesticide_service import scrape_and_store_pesticides
from .services.seed_service import scrape_and_store_seeds


def _env_flag(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}

def _resolve_upload_root() -> str:
    configured = os.getenv("UPLOAD_ROOT")
    if configured:
        return configured
    if os.path.exists("/.dockerenv"):
        return "/app/uploads"
    return os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
    )


UPLOAD_ROOT = _resolve_upload_root()
os.makedirs(os.path.join(UPLOAD_ROOT, "community"), exist_ok=True)




app = FastAPI(title="Assan Kheti Backend API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Start non-critical startup work without blocking Render port binding."""
    try:
        init_stripe()
        logger.info("Stripe initialised")
    except RuntimeError as exc:
        logger.warning("Stripe not initialised: %s", exc)

    asyncio.create_task(_run_stripe_index_setup())

    if _env_flag("RUN_STARTUP_SCRAPERS"):
        asyncio.create_task(run_scrapers_once("startup"))

    if _env_flag("RUN_PERIODIC_SCRAPERS"):
        asyncio.create_task(schedule_scraping())


async def _run_stripe_index_setup() -> None:
    try:
        await _ensure_stripe_indexes()
        logger.info("Stripe DB indexes ensured")
    except Exception as exc:
        logger.warning("Stripe index creation failed: %s", exc)


async def run_scrapers_once(reason: str) -> None:
    logger.info("%s scraping: Starting...", reason.capitalize())
    scrapers: tuple[tuple[str, Callable[[], Awaitable[dict]]], ...] = (
        ("fertilizer", scrape_and_store_fertilizers),
        ("pesticide", scrape_and_store_pesticides),
        ("seed", scrape_and_store_seeds),
    )

    for name, scraper in scrapers:
        try:
            result = await scraper()
            if result["status"] == "success":
                logger.info("%s %s scraper: %s", reason.capitalize(), name, result["message"])
            else:
                logger.error("%s %s scraper failed: %s", reason.capitalize(), name, result["message"])
        except Exception as exc:
            logger.error("%s %s scraper error: %s", reason.capitalize(), name, exc)


async def schedule_scraping():
    """Run all scrapers every 24 hours"""
    while True:
        try:
            await asyncio.sleep(86400)
            await run_scrapers_once("scheduled")
        except Exception as exc:
            logger.error(f"Error in scheduled scraping: {exc}")
            await asyncio.sleep(3600)

app.include_router(
    deviceSettings.router, prefix="/api/v1/user", tags=["Device Settings"]
)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(disease_router, prefix="/api/v1/disease", tags=["disease"])
app.include_router(fertilizer_router, prefix="/api/v1/fertilizer", tags=["Fertilizer Management"])
app.include_router(pesticide_router, prefix="/api/v1/pesticide", tags=["Pesticide Management"])
app.include_router(seed_router, prefix="/api/v1/seed", tags=["Seed Management"])
app.include_router(products_router, prefix="/api/v1/products", tags=["Product Listings"])
app.include_router(
    calculator.router,
    prefix="/api/v1/calculator",
    tags=["Smart Agriculture Calculator"]
)
app.include_router(chatbot_router, prefix="/api/v1/chatbot", tags=["AI Chatbot"])
app.include_router(media_router, prefix="/api/v1/media", tags=["Media"])
app.include_router(community_dm_router, prefix="/api/v1/community", tags=["Community DM"])
app.include_router(community_groups_router, prefix="/api/v1/community", tags=["Community Groups"])
app.include_router(community_offers_router, prefix="/api/v1/community", tags=["Community Offers"])
app.include_router(community_notifications_router, prefix="/api/v1/community", tags=["Community Notifications"])
app.include_router(community_presence_router, prefix="/api/v1/community", tags=["Community Presence"])
app.include_router(stream_chat_router, prefix="/api/v1/stream", tags=["Stream Chat"])
app.include_router(stripe_connect_router, prefix="/api/v1/stripe", tags=["Stripe Connect"])
app.include_router(stripe_payments_router, prefix="/api/v1/payments", tags=["Payments"])
# Webhook must be registered BEFORE any body-parsing middleware touches it
app.include_router(stripe_webhook_router, prefix="/api/v1/stripe", tags=["Stripe Webhook"])
app.include_router(stripe_admin_router, prefix="/api/v1/admin", tags=["Admin Payouts"])

app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")


@app.get("/health/db", tags=["health"])
async def health_db():
    try:
        db = get_database()
        await db.command("ping")
        return {"status": "ok", "database": "reachable"}
    except Exception as exc:
        logger.error(f"Database health check failed: {exc}")
        raise HTTPException(status_code=503, detail="Database not reachable")


@app.get("/", tags=["root"])
def read_root():
    return {
        "message": "Welcome to the Assan Kheti Backend API!",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error: {exc}")  # log the error
    errors = exc.errors()
    # Sanitize errors to ensure they're JSON serializable
    sanitized_errors = []
    for err in errors:
        sanitized_err = {
            'type': str(err.get('type', 'unknown')),
            'loc': list(err.get('loc', [])),
            'msg': str(err.get('msg', 'Unknown error')),
        }
        sanitized_errors.append(sanitized_err)
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": sanitized_errors},
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": "Resource not found"})

