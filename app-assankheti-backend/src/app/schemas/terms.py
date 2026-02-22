from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TermsCreate(BaseModel):
    mobile_id: str = Field(..., description="Unique mobile device ID")
    terms_accepted: bool = Field(default=False)


class TermsDB(BaseModel):
    mobile_id: str
    terms_accepted: bool
    accepted_at: Optional[datetime] = None
    created_at: datetime
