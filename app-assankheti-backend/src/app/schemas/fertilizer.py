from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class FertilizerCreate(BaseModel):
    name: str = Field(..., description="Fertilizer name")
    price: float = Field(..., description="Price in PKR")
    quantity: Optional[str] = Field(None, description="Quantity (e.g., 50kg)")


class FertilizerDB(BaseModel):
    name: str
    price: float
    quantity: Optional[str] = None
    scraped_at: datetime


class FertilizerResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    price: float
    quantity: Optional[str] = None
    scraped_at: datetime

    class Config:
        populate_by_name = True
