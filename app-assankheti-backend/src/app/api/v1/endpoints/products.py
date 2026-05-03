from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query

from app.db.db_connection import get_database
from app.models.collections import PRODUCT_LISTINGS_COLLECTION
from app.schemas.product import ProductCreate, ProductUpdate
from app.utils.logger import logger

router = APIRouter(tags=["Product Listings"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _object_id(product_id: str) -> ObjectId:
    try:
        return ObjectId(product_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid product id")


def _serialize_product(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "farmer_id": doc["farmer_id"],
        "name": doc["name"],
        "category": doc.get("category", "grains"),
        "price": float(doc.get("price", 0)),
        "unit": doc.get("unit", "kg"),
        "stock": int(doc.get("stock", 0)),
        "min_order": doc.get("min_order"),
        "delivery_area": doc.get("delivery_area"),
        "description": doc.get("description"),
        "images": doc.get("images", []),
        "status": doc.get("status", "active"),
        "views": int(doc.get("views", 0)),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


async def _get_collection():
    db = get_database()
    collection = db[PRODUCT_LISTINGS_COLLECTION]
    await collection.create_index([("farmer_id", 1), ("updated_at", -1)])
    await collection.create_index([("category", 1), ("status", 1)])
    return collection


@router.post("/")
async def create_product(payload: ProductCreate):
    try:
        collection = await _get_collection()
        now = _now()
        data = payload.model_dump()
        if data["stock"] <= 0 and data["status"] == "active":
            data["status"] = "sold"

        data.update({"views": 0, "created_at": now, "updated_at": now})
        result = await collection.insert_one(data)
        created = await collection.find_one({"_id": result.inserted_id})
        return {"status": "success", "data": _serialize_product(created)}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error creating product listing: {exc}")
        raise HTTPException(status_code=500, detail="Failed to create product")


@router.get("/farmer/{farmer_id}")
async def get_farmer_products(farmer_id: str, limit: int = Query(100, ge=1, le=200)):
    try:
        collection = await _get_collection()
        cursor = collection.find({"farmer_id": farmer_id}).sort("updated_at", -1).limit(limit)
        products = [_serialize_product(doc) async for doc in cursor]
        return {"status": "success", "count": len(products), "data": products}
    except Exception as exc:
        logger.error(f"Error fetching farmer products: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch products")


@router.get("/all")
async def get_all_products(
    category: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(100, ge=1, le=200),
):
    try:
        collection = await _get_collection()
        query = {}
        if category:
            query["category"] = category
        if status:
            query["status"] = status

        cursor = collection.find(query).sort("updated_at", -1).limit(limit)
        products = [_serialize_product(doc) async for doc in cursor]
        return {"status": "success", "count": len(products), "data": products}
    except Exception as exc:
        logger.error(f"Error fetching product listings: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch products")


@router.get("/{product_id}")
async def get_product(product_id: str):
    collection = await _get_collection()
    product = await collection.find_one({"_id": _object_id(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"status": "success", "data": _serialize_product(product)}


@router.put("/{product_id}")
async def update_product(product_id: str, payload: ProductUpdate):
    collection = await _get_collection()
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "stock" in update_data and "status" not in update_data:
        update_data["status"] = "sold" if update_data["stock"] <= 0 else "active"

    update_data["updated_at"] = _now()
    result = await collection.update_one({"_id": _object_id(product_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    product = await collection.find_one({"_id": _object_id(product_id)})
    return {"status": "success", "data": _serialize_product(product)}


@router.delete("/{product_id}")
async def delete_product(product_id: str):
    collection = await _get_collection()
    result = await collection.delete_one({"_id": _object_id(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"status": "success", "deleted_id": product_id}
