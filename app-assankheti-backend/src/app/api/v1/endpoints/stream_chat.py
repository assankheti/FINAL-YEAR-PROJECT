from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.stream import (
    STREAM_API_KEY,
    STREAM_APP_ID,
    create_or_update_channel,
    create_stream_token,
    normalize_channel_id,
    normalize_stream_user_id,
    role_for_mobile_id,
    upsert_stream_user,
)
from app.services.security import get_current_mobile_id
from app.utils.logger import logger

router = APIRouter()


class StreamTokenRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=80)
    role: Optional[str] = Field(None, pattern="^(farmer|customer|admin)$")


class DirectChannelRequest(BaseModel):
    member_id: str = Field(..., min_length=1, max_length=128)
    member_name: Optional[str] = Field(None, max_length=80)
    context_type: Optional[str] = Field("direct", max_length=40)
    context_ref: Optional[str] = Field(None, max_length=128)


class CommunityChannelRequest(BaseModel):
    channel_id: str = Field(..., min_length=1, max_length=80)
    name: str = Field(..., min_length=1, max_length=80)
    crop: Optional[str] = Field(None, max_length=40)


@router.get("/config")
async def stream_config(mobile_id: str = Depends(get_current_mobile_id)):
    if not STREAM_API_KEY:
        raise HTTPException(status_code=503, detail="Stream API key is not configured")
    return {"app_id": STREAM_APP_ID, "api_key": STREAM_API_KEY}


@router.post("/token")
async def generate_stream_token(
    payload: StreamTokenRequest,
    mobile_id: str = Depends(get_current_mobile_id),
):
    stream_user_id = normalize_stream_user_id(mobile_id)
    stream_role = role_for_mobile_id(mobile_id, payload.role)
    app_role = payload.role or "user"
    name = payload.name or f"Assan Kheti {stream_user_id[-6:]}"

    try:
        upsert_stream_user(stream_user_id, name, stream_role, {"mobile_id": mobile_id, "app_role": app_role})
        token = create_stream_token(stream_user_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        logger.exception("stream_token_failed mobile_id=%s", mobile_id)
        raise HTTPException(status_code=500, detail="Failed to create Stream token")

    return {
        "api_key": STREAM_API_KEY,
        "app_id": STREAM_APP_ID,
        "user": {"id": stream_user_id, "name": name, "role": stream_role, "app_role": app_role, "mobile_id": mobile_id},
        "token": token,
    }


@router.post("/channels/direct")
async def create_direct_channel(
    payload: DirectChannelRequest,
    mobile_id: str = Depends(get_current_mobile_id),
):
    current_user_id = normalize_stream_user_id(mobile_id)
    other_user_id = normalize_stream_user_id(payload.member_id)
    if current_user_id == other_user_id:
        raise HTTPException(status_code=400, detail="Cannot create a direct channel with yourself")

    channel_id = normalize_channel_id("dm-" + "-".join(sorted([current_user_id, other_user_id])))
    try:
        upsert_stream_user(other_user_id, payload.member_name or f"Member {other_user_id[-6:]}", "customer")
        channel = create_or_update_channel(
            "messaging",
            channel_id,
            current_user_id,
            [current_user_id, other_user_id],
            {
                "name": "Direct conversation",
                "assan_kheti_kind": "direct",
                "context_type": payload.context_type,
                "context_ref": payload.context_ref,
            },
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        logger.exception("stream_direct_channel_failed mobile_id=%s other=%s", mobile_id, payload.member_id)
        raise HTTPException(status_code=500, detail="Failed to create direct channel")

    return channel


@router.post("/channels/community")
async def create_community_channel(
    payload: CommunityChannelRequest,
    mobile_id: str = Depends(get_current_mobile_id),
):
    stream_user_id = normalize_stream_user_id(mobile_id)
    channel_id = normalize_channel_id(f"community-{payload.channel_id}")
    try:
        channel = create_or_update_channel(
            "messaging",
            channel_id,
            stream_user_id,
            [stream_user_id],
            {
                "name": payload.name,
                "assan_kheti_kind": "community",
                "crop": payload.crop,
            },
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        logger.exception("stream_community_channel_failed mobile_id=%s channel=%s", mobile_id, payload.channel_id)
        raise HTTPException(status_code=500, detail="Failed to create community channel")

    return channel
