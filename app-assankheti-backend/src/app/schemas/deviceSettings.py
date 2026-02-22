from pydantic import BaseModel
from typing import Literal
from datetime import datetime


class FinalSettingsDB(BaseModel):
    mobile_id: str
    terms_accepted: bool
    language: Literal["en", "ur"]
    voice: Literal["english", "urdu"]
    character_id: str
    created_at: datetime
