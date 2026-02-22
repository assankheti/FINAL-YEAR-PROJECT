# src/app/services/pricing/price_service.py
from app.services.scraper.fertilizer_scraper import scrape_fertilizer_prices
from app.services.scraper.pesticide_scraper import scrape_pesticide_prices
from app.services.scraper.crop_price_scraper import scrape_crop_prices

def get_latest_prices():
    """
    Fetch latest prices for fertilizer, pesticide, and crops.
    Returns a dictionary:
    {
        "fertilizer": {...},
        "pesticide": {...},
        "crops": {...}
    }
    """
    fertilizer_prices = scrape_fertilizer_prices()
    pesticide_prices = scrape_pesticide_prices()
    crop_prices = scrape_crop_prices()

    # You can calculate average prices for fertilizer/pesticide if needed
    avg_fertilizer_price = (
        sum(fertilizer_prices.values()) / len(fertilizer_prices)
        if fertilizer_prices else 150
    )

    avg_pesticide_price = (
        sum(pesticide_prices.values()) / len(pesticide_prices)
        if pesticide_prices else 1800
    )

    return {
        "fertilizer": {"average_per_kg": avg_fertilizer_price},
        "pesticide": {"average_per_unit": avg_pesticide_price},
        "crops": crop_prices
    }
