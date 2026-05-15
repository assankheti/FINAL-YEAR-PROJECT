from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# ---------- Messages ----------

MessageType = Literal["text", "image", "system", "offer"]
ContextType = Literal["product", "group", "offer", "direct"]


class MessageCreate(BaseModel):
    recipient_id: Optional[str] = Field(None, description="Required for DMs; omit for group sends")
    group_id: Optional[str] = Field(None, description="Required for group sends; omit for DMs")
    body: Optional[str] = Field(None, max_length=4000)
    image_url: Optional[str] = None
    message_type: MessageType = "text"
    payload: Optional[Dict[str, Any]] = None
    context_type: Optional[ContextType] = None
    context_ref: Optional[str] = None
    client_message_id: Optional[str] = Field(None, description="Idempotency key")


class MessageOut(BaseModel):
    message_id: str
    conversation_id: Optional[str] = None
    group_id: Optional[str] = None
    sender_id: str
    body: Optional[str] = None
    image_url: Optional[str] = None
    message_type: MessageType = "text"
    payload: Optional[Dict[str, Any]] = None
    client_message_id: Optional[str] = None
    created_at: datetime


# ---------- Conversations ----------

class ConversationOut(BaseModel):
    conversation_id: str
    participants: List[str]
    context_type: Optional[ContextType] = None
    context_ref: Optional[str] = None
    last_message_at: Optional[datetime] = None
    last_message_preview: Optional[str] = None
    unread_count: int = 0


# ---------- Groups ----------

class GroupOut(BaseModel):
    group_id: str
    name_en: str
    name_ur: str
    crop: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    member_count: int = 0
    created_at: datetime
    last_message_at: Optional[datetime] = None
    last_message_preview: Optional[str] = None
    unread_count: int = 0


class GroupMemberOut(BaseModel):
    group_id: str
    mobile_id: str
    joined_at: datetime
    last_read_at: Optional[datetime] = None
    muted: bool = False


# ---------- Offers ----------

OfferStatus = Literal["pending", "accepted", "rejected", "expired"]


class OfferCreate(BaseModel):
    product_id: str
    seller_id: str
    price: float = Field(..., gt=0)
    quantity: float = Field(..., gt=0)
    unit: str = Field(..., min_length=1, max_length=16, description="kg, ton, bag, etc.")
    message: Optional[str] = Field(None, max_length=500)


class OfferOut(BaseModel):
    offer_id: str
    product_id: str
    buyer_id: str
    seller_id: str
    price: float
    quantity: float
    unit: str
    message: Optional[str] = None
    status: OfferStatus = "pending"
    created_at: datetime
    expires_at: Optional[datetime] = None


# ---------- Blocks ----------

class BlockCreate(BaseModel):
    blocked_id: str = Field(..., min_length=1)


# ---------- Notifications ----------

NotificationType = Literal[
    "dm",
    "offer_received",
    "offer_accepted",
    "offer_rejected",
    "group_added",
]


class NotificationOut(BaseModel):
    notification_id: str
    recipient_id: str
    type: NotificationType
    title_en: str
    title_ur: str
    body_en: str
    body_ur: str
    read: bool = False
    data: Optional[Dict[str, Any]] = None
    created_at: datetime


# ---------- Presence ----------

PresenceStatus = Literal["online", "offline"]


class PresenceUpdate(BaseModel):
    mobile_id: str
    status: PresenceStatus
    last_active_at: Optional[datetime] = None
