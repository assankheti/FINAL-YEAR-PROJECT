# src/app/routers/auth.py
import re

from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.services.stytch_client import send_otp_sms, authenticate_otp
from app.schemas.auth import (
    SendOTPRequest,
    SendOTPResponse,
    VerifyOTPRequest,
    VerifyOTPResponse,
)
from app.db.db_connection import get_database
from app.services.security import create_access_token
from app.utils.logger import logger

router = APIRouter()


def _stytch_http_exception(exc: Exception) -> HTTPException:
    raw_status_code = getattr(exc, "status_code", None)
    error_message = getattr(exc, "error_message", None)
    status_code: int | None = None

    try:
        if raw_status_code is not None:
            status_code = int(raw_status_code)
    except Exception:
        status_code = None

    text = str(exc)
    if status_code is None:
        status_match = re.search(r"status_code=(\d{3})", text)
        if status_match:
            status_code = int(status_match.group(1))

    if not error_message:
        message_match = re.search(r"error_message='([^']+)'", text)
        if message_match:
            error_message = message_match.group(1)

    detail = error_message or text
    if status_code == 404:
        status_code = 400
    if status_code is not None and 400 <= status_code < 500:
        return HTTPException(status_code=status_code, detail=detail)
    return HTTPException(status_code=500, detail=detail)


@router.post("/send-otp/", response_model=SendOTPResponse)
async def send_otp(payload: SendOTPRequest):
    logger.info(f"Sending OTP to phone number: {payload.phone_number}")

    try:
        res = send_otp_sms(phone_number=payload.phone_number)
        method_id = res.phone_id

        if not method_id:
            raise HTTPException(status_code=500, detail="OTP method_id missing")

        return SendOTPResponse(method_id=method_id, message="OTP sent via SMS")

    except HTTPException:
        raise
    except Exception as exc:
        raise _stytch_http_exception(exc)


@router.post("/verify-otp/", response_model=VerifyOTPResponse)
async def verify_otp(payload: VerifyOTPRequest):
    try:
        # Step 1: Verify OTP via Stytch
        res = authenticate_otp(method_id=payload.method_id, code=payload.code)

        user_id = getattr(res, "user_id", None)
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid OTP")

        # Step 2: Save auth credentials
        db = get_database()
        now = datetime.utcnow()

        await db["auth_credentials"].update_one(
            {"mobile_id": payload.mobile_id},
            {
                "$set": {
                    "phone_number": payload.phone_number,
                    "user_id": user_id,
                    "is_active": True,
                    "last_login_at": now,
                },
                "$setOnInsert": {
                    "mobile_id": payload.mobile_id,
                    "created_at": now,
                },
            },
            upsert=True,
        )

        # Step 3: Create JWT token
        access_token = create_access_token(
            user_id,
            extra={
                "mobile_id": payload.mobile_id,
                "phone_number": payload.phone_number,
                "auth_via": "stytch_otp",
            },
        )

        return VerifyOTPResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=user_id,
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise _stytch_http_exception(exc)
