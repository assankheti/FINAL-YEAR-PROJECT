from datetime import datetime
from app.db.db_connection import get_database
from app.models.collections import SEEDS_COLLECTION
from app.services.scraper.seed_scraper import scrape_seed_prices
from app.utils.logger import logger


async def scrape_and_store_seeds():
    """
    Fetch seed data from KissanGhar and store in MongoDB.

    Returns:
        dict: Status of the operation
    """
    try:
        # Scrape seed data
        logger.info("Starting seed scraping...")
        seeds = scrape_seed_prices()

        if not seeds:
            logger.warning("No seeds scraped")
            return {
                "status": "error",
                "message": "No seeds could be scraped",
                "count": 0
            }

        # Connect to MongoDB
        db = get_database()
        collection = db[SEEDS_COLLECTION]

        # Clear existing records
        await collection.delete_many({})
        logger.info(f"Cleared existing seed records")

        # Prepare documents for insertion
        documents = []
        for name, price in seeds.items():
            doc = {
                "name": name,
                "price": price,
                "scraped_at": datetime.utcnow()
            }
            documents.append(doc)

        # Insert all documents
        if documents:
            result = await collection.insert_many(documents)
            logger.info(f"Inserted {len(result.inserted_ids)} seed records")

            return {
                "status": "success",
                "message": f"Successfully scraped and stored {len(result.inserted_ids)} seeds",
                "count": len(result.inserted_ids),
                "seeds": list(seeds.keys())[:10]  # Show first 10
            }
        else:
            return {
                "status": "error",
                "message": "No documents to insert",
                "count": 0
            }

    except Exception as e:
        logger.error(f"Error in scrape_and_store_seeds: {e}")
        return {
            "status": "error",
            "message": str(e),
            "count": 0
        }


async def get_all_seeds(limit: int = 100):
    """
    Fetch all seeds from MongoDB.

    Args:
        limit: Maximum number of records to return

    Returns:
        list: List of seeds
    """
    try:
        db = get_database()
        collection = db[SEEDS_COLLECTION]

        seeds = await collection.find({}).limit(limit).to_list(None)

        # Convert ObjectId to string
        for seed in seeds:
            if "_id" in seed:
                seed["_id"] = str(seed["_id"])

        return seeds

    except Exception as e:
        logger.error(f"Error fetching seeds: {e}")
        return []


async def search_seeds(query: str):
    """
    Search seeds by name.

    Args:
        query: Search query string

    Returns:
        list: Matching seeds
    """
    try:
        db = get_database()
        collection = db[SEEDS_COLLECTION]

        results = await collection.find({
            "name": {"$regex": query, "$options": "i"}
        }).to_list(None)

        # Convert ObjectId to string
        for seed in results:
            if "_id" in seed:
                seed["_id"] = str(seed["_id"])

        return results

    except Exception as e:
        logger.error(f"Error searching seeds: {e}")
        return []