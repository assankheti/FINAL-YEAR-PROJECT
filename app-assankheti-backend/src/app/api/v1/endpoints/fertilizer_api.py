from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.services.fertilizer_service import (
    scrape_and_store_fertilizers,
    get_all_fertilizers,
    search_fertilizers
)
from app.schemas.fertilizer import FertilizerResponse
from app.utils.logger import logger

router = APIRouter(
    tags=["Fertilizer Management"]
)


@router.post("/scrape-and-store")
async def scrape_and_store():
    """
    Trigger fertilizer scraper to fetch data from KissanGhar and store in MongoDB.
    """
    try:
        result = await scrape_and_store_fertilizers()
        
        if result["status"] == "success":
            return {
                "status": "success",
                "message": result["message"],
                "count": result["count"],
                "samples": result.get("fertilizers", [])
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=result["message"]
            )
    
    except Exception as e:
        logger.error(f"Error in fertilizer scraping endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to scrape fertilizers: {str(e)}"
        )


@router.get("/all")
async def get_fertilizers(limit: int = 100):
    """
    Get all fertilizers from MongoDB.
    """
    try:
        fertilizers = await get_all_fertilizers(limit)
        return {
            "status": "success",
            "count": len(fertilizers),
            "data": fertilizers
        }
    
    except Exception as e:
        logger.error(f"Error fetching fertilizers: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch fertilizers: {str(e)}"
        )


@router.get("/search")
async def search(query: str):
    """
    Search fertilizers by name.
    """
    if not query or len(query) < 2:
        raise HTTPException(
            status_code=400,
            detail="Search query must be at least 2 characters"
        )
    
    try:
        results = await search_fertilizers(query)
        return {
            "status": "success",
            "count": len(results),
            "query": query,
            "data": results
        }
    
    except Exception as e:
        logger.error(f"Error searching fertilizers: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search fertilizers: {str(e)}"
        )
