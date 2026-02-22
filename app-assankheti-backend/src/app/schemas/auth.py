from pydantic import BaseModel, Field, validator
import re


class SendOTPRequest(BaseModel):
    phone_number: str = Field(..., example="+15005550006")
    expiration_minutes: int = 5

    @validator("phone_number")
    def validate_e164(cls, v):
        if not re.fullmatch(r"\+[1-9]\d{7,14}", v):
            raise ValueError(
                "Phone number must be in E.164 format (e.g., +15005550006)"
            )
        return v


class SendOTPResponse(BaseModel):
    method_id: str
    message: str


class VerifyOTPRequest(BaseModel):
    method_id: str
    code: str
    phone_number: str
    mobile_id: str


class VerifyOTPResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
