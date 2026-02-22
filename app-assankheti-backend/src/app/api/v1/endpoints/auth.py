# src/app/routers/auth.py
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


@router.post("/send-otp/", response_model=SendOTPResponse)
async def send_otp(payload: SendOTPRequest):
    logger.info(f"Sending OTP to phone number: {payload.phone_number}")

    try:
        res = send_otp_sms(phone_number=payload.phone_number)
        method_id = res.phone_id

        if not method_id:
            raise HTTPException(status_code=500, detail="OTP method_id missing")

        return SendOTPResponse(method_id=method_id, message="OTP sent via SMS")

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


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

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
