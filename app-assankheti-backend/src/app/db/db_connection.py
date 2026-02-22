# src/app/db/db_connection.py
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Prefer explicit env vars; fall back to docker service name `mongo` so containers can connect
MONGO_URL = (
    os.getenv("MONGODB_LOCAL")
    or os.getenv("MONGODB_URI")
    or os.getenv("MONGO_URI")
    or "mongodb://mongo:27017"
)
DB_NAME = os.getenv("MONGO_DB_NAME") or "dbasssankheti"

_client: AsyncIOMotorClient = None



def get_database():
    """Return MongoDB database instance"""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URL)
    return _client[DB_NAME]


def get_db():
    """Return MongoDB database instance (safe for direct calls)."""
    return get_database()


async def get_db_dependency():
    """FastAPI dependency for injecting MongoDB via Depends(get_db_dependency)."""
    db = get_database()
    yield db
