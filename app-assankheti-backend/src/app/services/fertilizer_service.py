from datetime import datetime
from app.db.db_connection import get_database
from app.models.collections import FERTILIZERS_COLLECTION
from app.services.scraper.fertilizer_scraper import scrape_fertilizer_prices
from app.utils.logger import logger


async def scrape_and_store_fertilizers():
    """
    Fetch fertilizer data from KissanGhar and store in MongoDB.
    
    Returns:
        dict: Status of the operation
    """
    try:
        # Scrape fertilizer data
        logger.info("Starting fertilizer scraping...")
        fertilizers = scrape_fertilizer_prices()
        
        if not fertilizers:
            logger.warning("No fertilizers scraped")
            return {
                "status": "error",
                "message": "No fertilizers could be scraped",
                "count": 0
            }
        
        # Connect to MongoDB
        db = get_database()
        collection = db[FERTILIZERS_COLLECTION]
        
        # Clear existing records
        await collection.delete_many({})
        logger.info(f"Cleared existing fertilizer records")
        
        # Prepare documents for insertion
        documents = []
        for name, price in fertilizers.items():
            doc = {
                "name": name,
                "price": price,
                "scraped_at": datetime.utcnow()
            }
            documents.append(doc)
        
        # Insert all documents
        if documents:
            result = await collection.insert_many(documents)
            logger.info(f"Inserted {len(result.inserted_ids)} fertilizer records")
            
            return {
                "status": "success",
                "message": f"Successfully scraped and stored {len(result.inserted_ids)} fertilizers",
                "count": len(result.inserted_ids),
                "fertilizers": list(fertilizers.keys())[:10]  # Show first 10
            }
        else:
            return {
                "status": "error",
                "message": "No documents to insert",
                "count": 0
            }
    
    except Exception as e:
        logger.error(f"Error in scrape_and_store_fertilizers: {e}")
        return {
            "status": "error",
            "message": str(e),
            "count": 0
        }


async def get_all_fertilizers(limit: int = 100):
    """
    Fetch all fertilizers from MongoDB.
    
    Args:
        limit: Maximum number of records to return
        
    Returns:
        list: List of fertilizers
    """
    try:
        db = get_database()
        collection = db[FERTILIZERS_COLLECTION]
        
        fertilizers = await collection.find({}).limit(limit).to_list(None)
        
        # Convert ObjectId to string
        for fert in fertilizers:
            if "_id" in fert:
                fert["_id"] = str(fert["_id"])
        
        return fertilizers
    
    except Exception as e:
        logger.error(f"Error fetching fertilizers: {e}")
        return []


async def search_fertilizers(query: str):
    """
    Search fertilizers by name.
    
    Args:
        query: Search query string
        
    Returns:
        list: Matching fertilizers
    """
    try:
        db = get_database()
        collection = db[FERTILIZERS_COLLECTION]
        
        results = await collection.find({
            "name": {"$regex": query, "$options": "i"}
        }).to_list(None)
        
        # Convert ObjectId to string
        for fert in results:
            if "_id" in fert:
                fert["_id"] = str(fert["_id"])
        
        return results
    
    except Exception as e:
        logger.error(f"Error searching fertilizers: {e}")
        return []
