# src/app/services/scraper/crop_price_scraper.py
import json
from collections import defaultdict
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from app.utils.logger import logger

URL = "https://pccmdpunjab.gov.pk/Commodities/Prices/"
CACHE_PATH = Path(__file__).resolve().parents[2] / "data" / "crop_prices_cache.json"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Last known stable values keep calculators usable when the source site is down
# or blocks Render's outbound network. Keys intentionally match column_map below.
FALLBACK_CROP_PRICES = {
    "atta bag (20kg)": 1810.0,
    "rice basmati new (kg)": 305.0,
    "potato fresh (kg)": 20.0,
    "tomato (kg)": 70.0,
    "onion (kg)": 73.0,
}


def _default_prices() -> dict[str, float]:
    return FALLBACK_CROP_PRICES.copy()


def _load_cached_prices() -> dict[str, float] | None:
    if not CACHE_PATH.exists():
      return None

    try:
        with CACHE_PATH.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return None

    if not isinstance(data, dict):
        return None

    cached: dict[str, float] = {}
    for key, value in data.items():
        try:
            cached[str(key).lower()] = float(value)
        except (TypeError, ValueError):
            continue

    return cached or None


def _save_cached_prices(prices: dict[str, float]) -> None:
    try:
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        with CACHE_PATH.open("w", encoding="utf-8") as handle:
            json.dump(prices, handle, indent=2, sort_keys=True)
    except OSError:
        pass


def _fallback_prices(reason: str) -> dict[str, float]:
    cached = _load_cached_prices()
    if cached:
        logger.info("Crop price cache used: %s", reason)
        return cached

    logger.warning("Crop price scraper fallback used: %s", reason)
    return _default_prices()


def scrape_crop_prices():
    """
    Scrape all crop prices from the Punjab Commodities table.
    Returns a dictionary with {crop_name: average_price_per_unit}.
    """
    cached = _load_cached_prices()
    if cached:
        return cached

    try:
        r = requests.get(URL, headers=HEADERS, timeout=10)
        r.raise_for_status()
    except requests.RequestException as e:
        return _fallback_prices(str(e))

    soup = BeautifulSoup(r.text, "html.parser")
    table = soup.find("table", {"id": "dataTable"})
    if not table:
        return _fallback_prices("price table not found")

    prices = defaultdict(list)
    rows = table.select("tbody tr")

    # Column mapping based on table header (0-indexed)
    column_map = {
        "atta bag (20kg)": 3,
        "moong washed (kg)": 4,
        "gram pulse fine(kg)": 5,
        "mash washed (local) (kg)": 6,
        "milk": 7,
        "mutton (kg)": 8,
        "beef (kg)": 9,
        "roti": 10,
        "red chillies (kg)": 11,
        "rice basmati new (kg)": 12,
        "sugar(kg)": 13,
        "vegetable ghee(kg)": 14,
        "chicken meat (kg)": 15,
        "masoor imported (kg)": 16,
        "potato store": 17,
        "potato fresh (kg)": 18,
        "tomato (kg)": 19,
        "onion (kg)": 20,
        "eggs": 21
    }

    for row in rows:
        cols = row.find_all("td")
        for crop_name, idx in column_map.items():
            try:
                price_text = cols[idx].text.strip().replace(",", "")
                price = float(price_text)
                if price > 0:
                    prices[crop_name.lower()].append(price)
            except (IndexError, ValueError):
                continue

    # Compute average price per crop
    avg_prices = {crop: round(sum(vals)/len(vals), 2) for crop, vals in prices.items() if vals}
    if not avg_prices:
        return _fallback_prices("price table contained no parseable prices")

    _save_cached_prices(avg_prices)
    return avg_prices


def scrape_wheat_prices():
    """
    Fetch wheat price specifically as a convenience function.
    Returns dictionary with {'average_price': value}.
    """
    all_prices = scrape_crop_prices()
    wheat_cols = ["atta bag (20kg)", "moong washed (kg)", "gram pulse fine(kg)"]
    wheat_prices = [all_prices[crop] for crop in wheat_cols if crop in all_prices]

    if not wheat_prices:
        return {}

    avg_wheat_price = round(sum(wheat_prices)/len(wheat_prices), 2)
    return {"average_price": avg_wheat_price}
