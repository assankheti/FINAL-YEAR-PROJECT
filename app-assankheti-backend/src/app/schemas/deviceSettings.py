from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime


class UserSettingsUpdate(BaseModel):
    voice_assistant: Optional[bool] = None
    dark_mode: Optional[bool] = None
    push_notifications: Optional[bool] = None
    weather_alerts: Optional[bool] = None
    price_updates: Optional[bool] = None


class FinalSettingsDB(BaseModel):
    mobile_id: str
    terms_accepted: bool
    language: Literal["en", "ur"]
    voice: Literal["english", "urdu"]
    character_id: str
    selected_crops: list[str] = Field(default_factory=list)
    voice_assistant: bool = True
    dark_mode: bool = False
    push_notifications: bool = True
    weather_alerts: bool = True
    price_updates: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
