# src/app/db/db_connection.py
import os
from urllib.parse import urlsplit, urlunsplit
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

def _is_running_in_docker() -> bool:
    return os.path.exists("/.dockerenv")


def _normalize_mongo_url(url: str) -> str:
    """
    Allow same env to work in both local and Docker runs.
    Docker service hostname `mongo` is only resolvable inside Docker network.
    """
    try:
        parts = urlsplit(url)
        if parts.hostname == "mongo" and not _is_running_in_docker():
            netloc = parts.netloc.replace("mongo", "localhost", 1)
            return urlunsplit((parts.scheme, netloc, parts.path, parts.query, parts.fragment))
    except Exception:
        # Keep original value on parse issues.
        pass
    return url


# Prefer explicit env vars; fall back to docker service name `mongo` so containers can connect
MONGO_URL = _normalize_mongo_url(
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
