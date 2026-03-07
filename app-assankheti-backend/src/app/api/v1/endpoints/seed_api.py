from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.services.seed_service import (
    scrape_and_store_seeds,
    get_all_seeds,
    search_seeds
)
from app.schemas.seed import SeedResponse
from app.utils.logger import logger

router = APIRouter(
    tags=["Seed Management"]
)


@router.post("/scrape-and-store")
async def scrape_and_store():
    """
    Trigger seed scraper to fetch data from KissanGhar and store in MongoDB.
    """
    try:
        result = await scrape_and_store_seeds()

        if result["status"] == "success":
            return {
                "status": "success",
                "message": result["message"],
                "count": result["count"],
                "samples": result.get("seeds", [])
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=result["message"]
            )

    except Exception as e:
        logger.error(f"Error in seed scraping endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to scrape seeds: {str(e)}"
        )


@router.get("/all")
async def get_seeds(limit: int = 100):
    """
    Get all seeds from MongoDB.
    """
    try:
        seeds = await get_all_seeds(limit)
        return {
            "status": "success",
            "count": len(seeds),
            "data": seeds
        }

    except Exception as e:
        logger.error(f"Error fetching seeds: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch seeds: {str(e)}"
        )


@router.get("/search")
async def search(query: str):
    """
    Search seeds by name.
    """
    if not query or len(query) < 2:
        raise HTTPException(
            status_code=400,
            detail="Search query must be at least 2 characters"
        )

    try:
        results = await search_seeds(query)
        return {
            "status": "success",
            "count": len(results),
            "query": query,
            "data": results
        }

    except Exception as e:
        logger.error(f"Error searching seeds: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search seeds: {str(e)}"
        )