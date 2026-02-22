from pydantic import BaseModel, Field
from datetime import datetime


class mobileid(BaseModel):
    mobile_id: str = Field(..., description="Unique mobile device ID")


class mobileid_db(BaseModel):
    mobile_id: str
    created_new: bool
    server_time: datetime
