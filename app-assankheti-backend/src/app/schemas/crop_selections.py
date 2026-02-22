from pydantic import BaseModel, Field
from datetime import datetime
from typing import List


class cropSelectionCreate(BaseModel):
    selected_crops: List[str] = Field(..., min_length=1, description="Selected crops")


class cropSelectionDB(BaseModel):
    mobile_id: str
    selected_crops: List[str]
    created_at: datetime