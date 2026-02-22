# src/app/services/scraper/crop_price_scraper.py
import requests
from bs4 import BeautifulSoup
from collections import defaultdict

HEADERS = {"User-Agent": "Mozilla/5.0"}

def scrape_crop_prices():
    """
    Scrape all crop prices from the Punjab Commodities table.
    Returns a dictionary with {crop_name: average_price_per_unit}.
    """
    url = "https://pccmdpunjab.gov.pk/Commodities/Prices/"
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        r.raise_for_status()
    except requests.RequestException as e:
        print(f"[CROP PRICE SCRAPER ERROR] {e}")
        return {}

    soup = BeautifulSoup(r.text, "html.parser")
    table = soup.find("table", {"id": "dataTable"})
    if not table:
        print("[CROP PRICE SCRAPER ERROR] Table not found")
        return {}

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
