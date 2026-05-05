"""
Insert + broadcast notifications.

Lives in its own module so endpoint code can fire-and-forget without each file
re-implementing the pattern. Failures here never break the caller's main flow:
the helper logs and swallows exceptions.

Avoid putting this in `community_helpers.py` — it imports from
`socket_gateway`, and `socket_gateway` imports `community_helpers`, so the
helper would create a cycle.
"""
from datetime import datetime
from typing import Any, Dict, Optional

from app.db.db_connection import get_database
from app.models.collections import COMMUNITY_NOTIFICATIONS_COLLECTION
from app.services.community_helpers import build_notification
from app.services.socket_gateway import broadcast_to_user
from app.utils.logger import logger

db = get_database()


def _wire_friendly(notif: Dict[str, Any]) -> Dict[str, Any]:
    out = {k: v for k, v in notif.items() if k != "_id"}
    if isinstance(out.get("created_at"), datetime):
        out["created_at"] = out["created_at"].isoformat()
    return out


async def notify(
    recipient_id: str,
    notif_type: str,
    data: Optional[Dict[str, Any]] = None,
    **template_vars: Any,
) -> None:
    """
    Build a bilingual notification, persist it, then broadcast `notification:new`
    to the recipient's user room.

    `template_vars` fills placeholders in `_NOTIFICATION_TEMPLATES`
    (e.g. `sender_name`, `buyer_name`, `crop`).
    """
    if not recipient_id:
        return
    try:
        notif = build_notification(recipient_id, notif_type, data=data, **template_vars)
    except Exception:
        logger.exception(
            "notification_build_failed recipient_id=%s type=%s",
            recipient_id, notif_type,
        )
        return

    try:
        await db[COMMUNITY_NOTIFICATIONS_COLLECTION].insert_one(notif)
    except Exception:
        logger.exception(
            "notification_insert_failed recipient_id=%s type=%s",
            recipient_id, notif_type,
        )

    try:
        await broadcast_to_user(
            recipient_id, "notification:new", {"notification": _wire_friendly(notif)}
        )
    except Exception:
        logger.exception(
            "notification_broadcast_failed recipient_id=%s type=%s",
            recipient_id, notif_type,
        )
