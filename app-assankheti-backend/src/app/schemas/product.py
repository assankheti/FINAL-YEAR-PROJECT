from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


ProductCategory = Literal["grains", "veggies", "fruits", "others"]
ProductUnit = Literal["kg", "g", "bag", "bundle", "piece", "dozen"]
ProductStatus = Literal["active", "sold", "draft"]


class ProductCreate(BaseModel):
    farmer_id: str = Field(..., min_length=1, description="Owner/farmer identifier")
    name: str = Field(..., min_length=2, max_length=120)
    category: ProductCategory = "grains"
    price: float = Field(..., ge=0)
    unit: ProductUnit = "kg"
    stock: int = Field(..., ge=0)
    min_order: Optional[str] = Field(None, max_length=80)
    delivery_area: Optional[str] = Field(None, max_length=160)
    description: Optional[str] = Field(None, max_length=1200)
    images: List[str] = Field(default_factory=list, max_length=5)
    status: ProductStatus = "active"


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    category: Optional[ProductCategory] = None
    price: Optional[float] = Field(None, ge=0)
    unit: Optional[ProductUnit] = None
    stock: Optional[int] = Field(None, ge=0)
    min_order: Optional[str] = Field(None, max_length=80)
    delivery_area: Optional[str] = Field(None, max_length=160)
    description: Optional[str] = Field(None, max_length=1200)
    images: Optional[List[str]] = Field(None, max_length=5)
    status: Optional[ProductStatus] = None


class ProductResponse(BaseModel):
    id: str
    farmer_id: str
    name: str
    category: ProductCategory
    price: float
    unit: ProductUnit
    stock: int
    min_order: Optional[str] = None
    delivery_area: Optional[str] = None
    description: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    status: ProductStatus
    views: int = 0
    created_at: datetime
    updated_at: datetime
