from pydantic import BaseModel, Field
from datetime import datetime


class AuthCredentialsDB(BaseModel):
    mobile_id: str = Field(..., description="Unique mobile device ID")
    phone_number: str
    user_id: str  # Stytch user_id
    is_active: bool = True
    created_at: datetime
    last_login_at: datetime
