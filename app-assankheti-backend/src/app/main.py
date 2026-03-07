# src/app/main.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import asyncio

from app.api.v1.endpoints import auth, deviceSettings
from app.utils.logger import logger
from app.db.db_connection import get_database


from app.api.v1.endpoints.disease_api import router as disease_router
from app.api.v1.endpoints.fertilizer_api import router as fertilizer_router
from app.api.v1.endpoints.pesticide_api import router as pesticide_router
from app.api.v1.endpoints.seed_api import router as seed_router
from app.api.v1.endpoints import calculator
from app.services.fertilizer_service import scrape_and_store_fertilizers
from app.services.pesticide_service import scrape_and_store_pesticides
from app.services.seed_service import scrape_and_store_seeds




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
    """Run scrapers when the application starts"""
    logger.info("Application startup: Running scrapers...")
    try:
        # Fertilizer scraper
        fertilizer_result = await scrape_and_store_fertilizers()
        if fertilizer_result["status"] == "success":
            logger.info(f"Startup fertilizer scraper: {fertilizer_result['message']}")
        else:
            logger.error(f"Startup fertilizer scraper failed: {fertilizer_result['message']}")

        # Pesticide scraper
        pesticide_result = await scrape_and_store_pesticides()
        if pesticide_result["status"] == "success":
            logger.info(f"Startup pesticide scraper: {pesticide_result['message']}")
        else:
            logger.error(f"Startup pesticide scraper failed: {pesticide_result['message']}")

        # Seed scraper
        seed_result = await scrape_and_store_seeds()
        if seed_result["status"] == "success":
            logger.info(f"Startup seed scraper: {seed_result['message']}")
        else:
            logger.error(f"Startup seed scraper failed: {seed_result['message']}")

    except Exception as e:
        logger.error(f"Error during startup scrapers: {e}")

    # Start the background task for periodic scraping
    asyncio.create_task(schedule_scraping())


async def schedule_scraping():
    """Run all scrapers every 24 hours"""
    while True:
        try:
            # Wait 24 hours (86400 seconds)
            await asyncio.sleep(86400)
            logger.info("Scheduled scraping: Starting...")

            # Fertilizer scraper
            fertilizer_result = await scrape_and_store_fertilizers()
            if fertilizer_result["status"] == "success":
                logger.info(f"Scheduled fertilizer scraper: {fertilizer_result['message']}")
            else:
                logger.error(f"Scheduled fertilizer scraper failed: {fertilizer_result['message']}")

            # Pesticide scraper
            pesticide_result = await scrape_and_store_pesticides()
            if pesticide_result["status"] == "success":
                logger.info(f"Scheduled pesticide scraper: {pesticide_result['message']}")
            else:
                logger.error(f"Scheduled pesticide scraper failed: {pesticide_result['message']}")

            # Seed scraper
            seed_result = await scrape_and_store_seeds()
            if seed_result["status"] == "success":
                logger.info(f"Scheduled seed scraper: {seed_result['message']}")
            else:
                logger.error(f"Scheduled seed scraper failed: {seed_result['message']}")

        except Exception as e:
            logger.error(f"Error in scheduled scraping: {e}")
            # Wait 1 hour before retrying on error
            await asyncio.sleep(3600)
            logger.error(f"Error in scheduled scraping: {e}")
            # Wait 1 hour before retrying on error
            await asyncio.sleep(3600)

app.include_router(
    deviceSettings.router, prefix="/api/v1/user", tags=["Device Settings"]
)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(disease_router, prefix="/api/v1/disease", tags=["disease"])
app.include_router(fertilizer_router, prefix="/api/v1/fertilizer", tags=["Fertilizer Management"])
app.include_router(pesticide_router, prefix="/api/v1/pesticide", tags=["Pesticide Management"])
app.include_router(seed_router, prefix="/api/v1/seed", tags=["Seed Management"])
app.include_router(
    calculator.router,
    prefix="/api/v1/calculator",
    tags=["Smart Agriculture Calculator"]
)


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
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": "Resource not found"})



