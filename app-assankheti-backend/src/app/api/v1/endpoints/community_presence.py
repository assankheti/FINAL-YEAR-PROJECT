"""HTTP endpoints for presence (Piece 12).

Live status is broadcast via the `presence:update` socket event from the
gateway; this endpoint gives clients a snapshot for the initial render so they
don't have to wait for the next push.
"""
from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from app.db.db_connection import get_database
from app.models.collections import COMMUNITY_PRESENCE_COLLECTION
from app.services.security import get_current_mobile_id
from app.utils.logger import logger

router = APIRouter()
db = get_database()


def _serialize(doc: Dict[str, Any]) -> Dict[str, Any]:
    out = {k: v for k, v in doc.items() if k != "_id"}
    for k in ("last_active_at", "created_at"):
        v = out.get(k)
        if isinstance(v, datetime):
            out[k] = v.isoformat()
    return out


@router.get("/presence/{mobile_id}")
async def presence_get(
    mobile_id: str,
    caller_id: str = Depends(get_current_mobile_id),
):
    if not mobile_id:
        raise HTTPException(status_code=400, detail="mobile_id is required")
    try:
        doc = await db[COMMUNITY_PRESENCE_COLLECTION].find_one({"mobile_id": mobile_id})
    except Exception:
        logger.exception("presence_lookup_failed mobile_id=%s", mobile_id)
        raise HTTPException(status_code=500, detail="Presence lookup failed")

    if not doc:
        # Nothing recorded yet — treat as offline. The frontend can render a
        # grey dot without showing an error.
        return {
            "mobile_id": mobile_id,
            "status": "offline",
            "last_active_at": None,
        }
    return _serialize(doc)
