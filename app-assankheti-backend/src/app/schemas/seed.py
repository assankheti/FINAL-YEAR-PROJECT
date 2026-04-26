from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class SeedCreate(BaseModel):
    name: str = Field(..., description="Seed name")
    price: float = Field(..., description="Price in PKR")
    quantity: Optional[str] = Field(None, description="Quantity (e.g., 1kg)")


class SeedDB(BaseModel):
    name: str
    price: float
    quantity: Optional[str] = None
    scraped_at: datetime


class SeedResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    price: float
    quantity: Optional[str] = None
    scraped_at: datetime

    class Config:
        populate_by_name = True