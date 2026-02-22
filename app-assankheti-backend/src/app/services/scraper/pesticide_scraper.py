import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}

def scrape_pesticide_prices():
    """
    Scrape pesticide/herbicide names and prices from KissanGhar.

    Returns:
        dict:
        {
            "Weedgrip 13OD 400ML": 1850,
            "Roundup PowerMax 1L": 3200
        }
    """

    url = "https://www.kissanghar.pk/products?category=Pesticides"

    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"[PESTICIDE SCRAPER ERROR] {e}")
        return {}

    soup = BeautifulSoup(response.text, "html.parser")
    pesticides = {}

    products = soup.select(".product_content.grid_content")

    for product in products:
        name_tag = product.select_one(".product_name a")
        price_tag = product.select_one(".current_price")

        if not name_tag or not price_tag:
            continue

        name = name_tag.text.strip()
        price_text = price_tag.text.replace("Rs.", "").replace(",", "").strip()

        try:
            price = float(price_text)
        except ValueError:
            continue

        pesticides[name] = price

    return pesticides
