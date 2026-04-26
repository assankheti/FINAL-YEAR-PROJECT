from datetime import datetime
from app.db.db_connection import get_database
from app.models.collections import PESTICIDES_COLLECTION
from app.services.scraper.pesticide_scraper import scrape_pesticide_prices
from app.utils.logger import logger


async def scrape_and_store_pesticides():
    """
    Fetch pesticide data from KissanGhar and store in MongoDB.

    Returns:
        dict: Status of the operation
    """
    try:
        # Scrape pesticide data
        logger.info("Starting pesticide scraping...")
        pesticides = scrape_pesticide_prices()

        if not pesticides:
            logger.warning("No pesticides scraped")
            return {
                "status": "error",
                "message": "No pesticides could be scraped",
                "count": 0
            }

        # Connect to MongoDB
        db = get_database()
        collection = db[PESTICIDES_COLLECTION]

        # Clear existing records
        await collection.delete_many({})
        logger.info(f"Cleared existing pesticide records")

        # Prepare documents for insertion
        documents = []
        for name, price in pesticides.items():
            doc = {
                "name": name,
                "price": price,
                "scraped_at": datetime.utcnow()
            }
            documents.append(doc)

        # Insert all documents
        if documents:
            result = await collection.insert_many(documents)
            logger.info(f"Inserted {len(result.inserted_ids)} pesticide records")

            return {
                "status": "success",
                "message": f"Successfully scraped and stored {len(result.inserted_ids)} pesticides",
                "count": len(result.inserted_ids),
                "pesticides": list(pesticides.keys())[:10]  # Show first 10
            }
        else:
            return {
                "status": "error",
                "message": "No documents to insert",
                "count": 0
            }

    except Exception as e:
        logger.error(f"Error in scrape_and_store_pesticides: {e}")
        return {
            "status": "error",
            "message": str(e),
            "count": 0
        }


async def get_all_pesticides(limit: int = 100):
    """
    Fetch all pesticides from MongoDB.

    Args:
        limit: Maximum number of records to return

    Returns:
        list: List of pesticides
    """
    try:
        db = get_database()
        collection = db[PESTICIDES_COLLECTION]

        pesticides = await collection.find({}).limit(limit).to_list(None)

        # Convert ObjectId to string
        for pest in pesticides:
            if "_id" in pest:
                pest["_id"] = str(pest["_id"])

        return pesticides

    except Exception as e:
        logger.error(f"Error fetching pesticides: {e}")
        return []


async def search_pesticides(query: str):
    """
    Search pesticides by name.

    Args:
        query: Search query string

    Returns:
        list: Matching pesticides
    """
    try:
        db = get_database()
        collection = db[PESTICIDES_COLLECTION]

        results = await collection.find({
            "name": {"$regex": query, "$options": "i"}
        }).to_list(None)

        # Convert ObjectId to string
        for pest in results:
            if "_id" in pest:
                pest["_id"] = str(pest["_id"])

        return results

    except Exception as e:
        logger.error(f"Error searching pesticides: {e}")
        return []