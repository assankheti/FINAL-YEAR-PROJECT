"""HTTP endpoints for in-app notifications (Piece 11)."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.db.db_connection import get_database
from app.models.collections import COMMUNITY_NOTIFICATIONS_COLLECTION
from app.services.security import get_current_mobile_id
from app.utils.logger import logger

router = APIRouter()
db = get_database()

MAX_LIMIT = 100


class ReadRequest(BaseModel):
    notification_ids: Optional[List[str]] = Field(None, description="Subset to mark read")
    all: bool = Field(False, description="If true, mark every unread notification for caller as read")


def _strip(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in doc.items() if k != "_id"}


@router.get("/notifications/{mobile_id}")
async def list_notifications(
    mobile_id: str,
    limit: int = Query(50, ge=1, le=MAX_LIMIT),
    caller_id: str = Depends(get_current_mobile_id),
):
    if mobile_id != caller_id:
        raise HTTPException(status_code=403, detail="mobile_id does not match token")

    cursor = (
        db[COMMUNITY_NOTIFICATIONS_COLLECTION]
        .find({"recipient_id": mobile_id})
        .sort("created_at", -1)
        .limit(limit)
    )
    notifications = [_strip(d) async for d in cursor]
    try:
        unread_count = await db[COMMUNITY_NOTIFICATIONS_COLLECTION].count_documents(
            {"recipient_id": mobile_id, "read": False}
        )
    except Exception:
        logger.exception("notifications_unread_count_failed mobile_id=%s", mobile_id)
        unread_count = 0
    return {
        "notifications": notifications,
        "unread_count": unread_count,
    }


@router.post("/notifications/read")
async def mark_read(
    payload: ReadRequest,
    caller_id: str = Depends(get_current_mobile_id),
):
    if not payload.all and not payload.notification_ids:
        raise HTTPException(
            status_code=400, detail="Specify notification_ids or all=true"
        )

    query: Dict[str, Any] = {"recipient_id": caller_id, "read": False}
    if not payload.all:
        query["notification_id"] = {"$in": payload.notification_ids}

    now = datetime.utcnow()
    try:
        result = await db[COMMUNITY_NOTIFICATIONS_COLLECTION].update_many(
            query, {"$set": {"read": True, "read_at": now}}
        )
    except Exception:
        logger.exception("notifications_mark_read_failed mobile_id=%s", caller_id)
        raise HTTPException(status_code=500, detail="Failed to mark read")

    logger.info(
        "notifications_read mobile_id=%s matched=%s modified=%s all=%s",
        caller_id, result.matched_count, result.modified_count, payload.all,
    )
    return {"ok": True, "modified": result.modified_count}
