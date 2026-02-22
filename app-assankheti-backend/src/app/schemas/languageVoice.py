from pydantic import BaseModel, Field, root_validator
from typing import Literal, Optional
from datetime import datetime


class LanguageCreate(BaseModel):
    mobile_id: str = Field(..., description="Unique mobile device ID")
    language: Literal["en", "ur"] = Field(..., description="Text Language")
    voice: Literal["english", "urdu"] = Field(..., description="Voice Language")



class LanguageDB(BaseModel):
    mobile_id: str
    language: Literal["en", "ur"]
    voice: Literal["english", "urdu"]
    created_at: datetime
