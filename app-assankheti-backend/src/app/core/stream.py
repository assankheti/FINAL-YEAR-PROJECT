import os
import re
from functools import lru_cache
from typing import Any, Dict, Iterable, Optional

try:
    from stream_chat import StreamChat
except Exception:  # pragma: no cover - handled by runtime configuration checks
    StreamChat = None  # type: ignore


STREAM_APP_ID = os.getenv("STREAM_APP_ID")
STREAM_API_KEY = os.getenv("STREAM_API_KEY")
STREAM_API_SECRET = os.getenv("STREAM_API_SECRET")
STREAM_ADMIN_MOBILE_IDS = {
    item.strip()
    for item in os.getenv("STREAM_ADMIN_MOBILE_IDS", "").split(",")
    if item.strip()
}


def normalize_stream_user_id(value: str) -> str:
    """Stream user ids should be stable and avoid characters with URL ambiguity."""
    cleaned = re.sub(r"[^a-zA-Z0-9_@-]", "-", value.strip())
    return cleaned[:64] or "unknown-user"


def normalize_channel_id(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_-]", "-", value.strip().lower())
    return cleaned[:64] or "channel"


def role_for_mobile_id(mobile_id: str, requested_role: Optional[str]) -> str:
    """Return a Stream Chat built-in role. App-specific roles (farmer/customer) are
    stored as the custom 'app_role' field, not the Stream 'role' field."""
    if mobile_id in STREAM_ADMIN_MOBILE_IDS:
        return "admin"
    return "user"


@lru_cache(maxsize=1)
def get_stream_client():
    if StreamChat is None:
        raise RuntimeError("stream-chat is not installed. Run `pip install stream-chat`.")
    if not STREAM_API_KEY or not STREAM_API_SECRET:
        raise RuntimeError("STREAM_API_KEY and STREAM_API_SECRET must be configured.")
    return StreamChat(api_key=STREAM_API_KEY, api_secret=STREAM_API_SECRET)


def create_stream_token(user_id: str) -> str:
    return get_stream_client().create_token(user_id)


def upsert_stream_user(user_id: str, name: str, role: str, extra: Optional[Dict[str, Any]] = None) -> None:
    user = {
        "id": user_id,
        "name": name,
        "role": role,
        **(extra or {}),
    }
    get_stream_client().upsert_user(user)


def create_or_update_channel(
    channel_type: str,
    channel_id: str,
    created_by: str,
    members: Iterable[str],
    data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    distinct_members = sorted({member for member in members if member})
    channel = get_stream_client().channel(
        channel_type,
        channel_id,
        {
            "members": distinct_members,
            **(data or {}),
        },
    )
    try:
        channel.create(created_by)
    except Exception as exc:
        status_code = getattr(exc, "status_code", None)
        error_code = getattr(exc, "error_code", None)
        if status_code not in {400, 409} and error_code not in {16, "16"}:
            raise
        channel.add_members(distinct_members)
        channel.update({"name": (data or {}).get("name", channel_id), **(data or {})})
    return {"cid": f"{channel_type}:{channel_id}", "id": channel_id, "type": channel_type}
