from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.services.pesticide_service import (
    scrape_and_store_pesticides,
    get_all_pesticides,
    search_pesticides
)
from app.schemas.pesticide import PesticideResponse
from app.utils.logger import logger

router = APIRouter(
    tags=["Pesticide Management"]
)


@router.post("/scrape-and-store")
async def scrape_and_store():
    """
    Trigger pesticide scraper to fetch data from KissanGhar and store in MongoDB.
    """
    try:
        result = await scrape_and_store_pesticides()

        if result["status"] == "success":
            return {
                "status": "success",
                "message": result["message"],
                "count": result["count"],
                "samples": result.get("pesticides", [])
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=result["message"]
            )

    except Exception as e:
        logger.error(f"Error in pesticide scraping endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to scrape pesticides: {str(e)}"
        )


@router.get("/all")
async def get_pesticides(limit: int = 100):
    """
    Get all pesticides from MongoDB.
    """
    try:
        pesticides = await get_all_pesticides(limit)
        return {
            "status": "success",
            "count": len(pesticides),
            "data": pesticides
        }

    except Exception as e:
        logger.error(f"Error fetching pesticides: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch pesticides: {str(e)}"
        )


@router.get("/search")
async def search(query: str):
    """
    Search pesticides by name.
    """
    if not query or len(query) < 2:
        raise HTTPException(
            status_code=400,
            detail="Search query must be at least 2 characters"
        )

    try:
        results = await search_pesticides(query)
        return {
            "status": "success",
            "count": len(results),
            "query": query,
            "data": results
        }

    except Exception as e:
        logger.error(f"Error searching pesticides: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search pesticides: {str(e)}"
        )