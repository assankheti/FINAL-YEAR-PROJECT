# src/app/main.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.api.v1.endpoints import auth, deviceSettings
from app.utils.logger import logger
from app.db.db_connection import get_database


from app.api.v1.endpoints.disease_api import router as disease_router
from app.api.v1.endpoints import calculator




app = FastAPI(title="Assan Kheti Backend API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    deviceSettings.router, prefix="/api/v1/user", tags=["Device Settings"]
)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(disease_router, prefix="/api/v1/disease", tags=["disease"])
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



