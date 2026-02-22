from pydantic import BaseModel, Field
from datetime import datetime


class CharacterCreate(BaseModel):
    mobile_id: str = Field(..., description="Unique mobile device ID")
    character_id: str = Field(..., description="Selected character id")


class CharacterDB(BaseModel):
    mobile_id: str
    character_id: str
    created_at: datetime
