"""
Seed farmer product listings into MongoDB.

Idempotent: skips products already inserted for a farmer+name combo.

Run:
    cd app-assankheti-backend && source venv/bin/activate
    PYTHONPATH=src python scripts/seed_products.py
"""

import asyncio
from datetime import datetime, timezone

from app.db.db_connection import get_database
from app.models.collections import PRODUCT_LISTINGS_COLLECTION

NOW = datetime.now(timezone.utc)


def photo_url(tags: str, lock: int) -> str:
    return f"https://loremflickr.com/640/480/{tags}?lock={lock}"

# ── Products per farmer ────────────────────────────────────────────────────────
PRODUCTS = [
    # ── Ali Hassan (farmer-ali-001) ─ wheat & rice ──────────────────────────
    {
        "farmer_id": "seed-farmer-ali-001",
        "name": "Premium Basmati Rice",
        "category": "grains",
        "price": 280.0,
        "unit": "kg",
        "stock": 500,
        "min_order": "10 kg",
        "delivery_area": "Lahore, Sheikhupura, Narowal",
        "description": "Long-grain aged Basmati, naturally fragrant. Harvested Oct 2024.",
        "images": [photo_url("basmati,rice", 101)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-ali-001",
        "name": "Wheat Flour (Chakki Fresh)",
        "category": "grains",
        "price": 95.0,
        "unit": "kg",
        "stock": 800,
        "min_order": "20 kg",
        "delivery_area": "Lahore, Sheikhupura",
        "description": "Stone-ground whole wheat flour. No additives.",
        "images": [photo_url("wheat,flour", 102)],
        "status": "active",
    },

    # ── Usman Khan (farmer-usman-002) ─ cotton & sugarcane ─────────────────
    {
        "farmer_id": "seed-farmer-usman-002",
        "name": "Raw Cotton Bolls",
        "category": "others",
        "price": 8500.0,
        "unit": "bag",
        "stock": 40,
        "min_order": "5 bags",
        "delivery_area": "Multan, Bahawalpur, Khanewal",
        "description": "High-staple Bt cotton. Each bag ~40 kg. Clean picked.",
        "images": [photo_url("cotton,bolls", 103)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-usman-002",
        "name": "Fresh Sugarcane",
        "category": "others",
        "price": 35.0,
        "unit": "kg",
        "stock": 2000,
        "min_order": "100 kg",
        "delivery_area": "Multan, Sahiwal",
        "description": "Sweet sugarcane, ideal for juice stalls and mills.",
        "images": [photo_url("sugarcane,farm", 104)],
        "status": "active",
    },

    # ── Tariq Mahmood (farmer-tariq-003) ─ maize & vegetables ──────────────
    {
        "farmer_id": "seed-farmer-tariq-003",
        "name": "Hybrid Maize (Corn)",
        "category": "grains",
        "price": 65.0,
        "unit": "kg",
        "stock": 1200,
        "min_order": "50 kg",
        "delivery_area": "Faisalabad, Jhang, Toba Tek Singh",
        "description": "Yellow hybrid maize, suitable for poultry feed and flour.",
        "images": [photo_url("maize,corn", 105)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-tariq-003",
        "name": "Fresh Tomatoes",
        "category": "veggies",
        "price": 80.0,
        "unit": "kg",
        "stock": 300,
        "min_order": "5 kg",
        "delivery_area": "Faisalabad, Chiniot",
        "description": "Desi red tomatoes, farm-fresh, no pesticide residue.",
        "images": [photo_url("tomatoes,vegetable", 106)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-tariq-003",
        "name": "Green Chilies",
        "category": "veggies",
        "price": 120.0,
        "unit": "kg",
        "stock": 150,
        "min_order": "2 kg",
        "delivery_area": "Faisalabad",
        "description": "Long green chilies, medium heat. Great for cooking.",
        "images": [photo_url("green,chili", 107)],
        "status": "active",
    },

    # ── Bilal Ahmed (farmer-bilal-004) ─ rice ───────────────────────────────
    {
        "farmer_id": "seed-farmer-bilal-004",
        "name": "Irri-6 Rice",
        "category": "grains",
        "price": 145.0,
        "unit": "kg",
        "stock": 700,
        "min_order": "25 kg",
        "delivery_area": "Gujranwala, Sialkot, Hafizabad",
        "description": "Medium-grain Irri-6, ideal for everyday cooking and biryani.",
        "images": [photo_url("rice,grain", 108)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-bilal-004",
        "name": "Rice Husk (Thoosi)",
        "category": "others",
        "price": 12.0,
        "unit": "bag",
        "stock": 200,
        "min_order": "10 bags",
        "delivery_area": "Gujranwala",
        "description": "Dry rice husk, used as fuel or animal bedding.",
        "images": [photo_url("rice,husk", 109)],
        "status": "active",
    },

    # ── Zubair Iqbal (farmer-zubair-005) ─ wheat & cotton ──────────────────
    {
        "farmer_id": "seed-farmer-zubair-005",
        "name": "Wheat Grain (Sowing Quality)",
        "category": "grains",
        "price": 115.0,
        "unit": "kg",
        "stock": 600,
        "min_order": "10 kg",
        "delivery_area": "Okara, Pakpattan, Sahiwal",
        "description": "Certified wheat seed for next season sowing. High germination rate.",
        "images": [photo_url("wheat,grain", 110)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-zubair-005",
        "name": "Cotton Seed Cake",
        "category": "others",
        "price": 4200.0,
        "unit": "bag",
        "stock": 30,
        "min_order": "3 bags",
        "delivery_area": "Okara, Sahiwal",
        "description": "Oil-extracted cotton seed cake, high protein animal feed.",
        "images": [photo_url("cotton,seed,cake", 111)],
        "status": "active",
    },

    # ── Kamran Aslam (farmer-kamran-007) ─ maize & wheat ───────────────────
    {
        "farmer_id": "seed-farmer-kamran-007",
        "name": "Sweet Corn Cobs",
        "category": "grains",
        "price": 30.0,
        "unit": "piece",
        "stock": 400,
        "min_order": "20 pieces",
        "delivery_area": "Rawalpindi, Attock, Chakwal",
        "description": "Fresh sweet corn harvested daily. Perfect for grilling.",
        "images": [photo_url("sweet,corn", 112)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-kamran-007",
        "name": "Wheat Straw (Toori)",
        "category": "others",
        "price": 18.0,
        "unit": "bundle",
        "stock": 500,
        "min_order": "50 bundles",
        "delivery_area": "Rawalpindi, Attock",
        "description": "Dry wheat straw bundles for animal fodder.",
        "images": [photo_url("wheat,straw", 113)],
        "status": "active",
    },

    # ── Imran Siddiqui (farmer-imran-008) ─ rice & vegetables ──────────────
    {
        "farmer_id": "seed-farmer-imran-008",
        "name": "Super Kernel Basmati",
        "category": "grains",
        "price": 320.0,
        "unit": "kg",
        "stock": 400,
        "min_order": "5 kg",
        "delivery_area": "Sheikhupura, Nankana Sahib",
        "description": "Super Kernel variety, extra-long grain, export quality.",
        "images": [photo_url("basmati,rice", 114)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-imran-008",
        "name": "Fresh Spinach (Palak)",
        "category": "veggies",
        "price": 60.0,
        "unit": "kg",
        "stock": 100,
        "min_order": "2 kg",
        "delivery_area": "Sheikhupura",
        "description": "Tender baby spinach leaves. Harvested twice a week.",
        "images": [photo_url("spinach,leaf", 115)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-imran-008",
        "name": "Bitter Gourd (Karela)",
        "category": "veggies",
        "price": 95.0,
        "unit": "kg",
        "stock": 80,
        "min_order": "2 kg",
        "delivery_area": "Sheikhupura",
        "description": "Fresh bitter gourd, small variety, ideal for cooking.",
        "images": [photo_url("bitter,gourd", 116)],
        "status": "active",
    },

    # ── Shahid Raza (farmer-shahid-010) ─ wheat, rice, maize ───────────────
    {
        "farmer_id": "seed-farmer-shahid-010",
        "name": "Mixed Grain Bundle",
        "category": "grains",
        "price": 4500.0,
        "unit": "bag",
        "stock": 50,
        "min_order": "2 bags",
        "delivery_area": "Sargodha, Khushab, Mianwali",
        "description": "Assorted grain bag: 15 kg wheat + 10 kg rice + 10 kg maize.",
        "images": [photo_url("mixed,grain,sack", 117)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-shahid-010",
        "name": "Desi Wheat (Chakwal-50)",
        "category": "grains",
        "price": 108.0,
        "unit": "kg",
        "stock": 900,
        "min_order": "10 kg",
        "delivery_area": "Sargodha, Khushab",
        "description": "Traditional Chakwal-50 variety, strong gluten, great for bread.",
        "images": [photo_url("wheat,farm", 118)],
        "status": "active",
    },

    # ── Asif Mehmood (farmer-asif-011) ─ wheat & sugarcane ─────────────────
    {
        "farmer_id": "seed-farmer-asif-011",
        "name": "Sugarcane Juice (Jarred)",
        "category": "others",
        "price": 150.0,
        "unit": "piece",
        "stock": 120,
        "min_order": "6 pieces",
        "delivery_area": "Rahim Yar Khan, Sadiqabad",
        "description": "Fresh-pressed sugarcane juice, 1-litre sealed jars. No preservatives.",
        "images": [photo_url("sugarcane,juice", 119)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-asif-011",
        "name": "Whole Wheat Grain",
        "category": "grains",
        "price": 102.0,
        "unit": "kg",
        "stock": 750,
        "min_order": "20 kg",
        "delivery_area": "Rahim Yar Khan",
        "description": "Sun-dried, cleaned whole wheat. Ready for milling.",
        "images": [photo_url("wheat,grain", 120)],
        "status": "active",
    },

    # ── Waseem Baig (farmer-waseem-013) ─ vegetables & maize ────────────────
    {
        "farmer_id": "seed-farmer-waseem-013",
        "name": "Onions (Piyaz)",
        "category": "veggies",
        "price": 55.0,
        "unit": "kg",
        "stock": 600,
        "min_order": "5 kg",
        "delivery_area": "Hyderabad, Mirpurkhas, Badin",
        "description": "Red onions, medium-large size, firm skin, long shelf life.",
        "images": [photo_url("onion,vegetable", 121)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-waseem-013",
        "name": "Garlic (Lehsan)",
        "category": "veggies",
        "price": 380.0,
        "unit": "kg",
        "stock": 200,
        "min_order": "2 kg",
        "delivery_area": "Hyderabad",
        "description": "Desi garlic, strong aroma, large cloves. Naturally dried.",
        "images": [photo_url("garlic,bulb", 122)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-waseem-013",
        "name": "Bottle Gourd (Lauki)",
        "category": "veggies",
        "price": 45.0,
        "unit": "kg",
        "stock": 180,
        "min_order": "3 kg",
        "delivery_area": "Hyderabad, Badin",
        "description": "Tender bottle gourds, harvested young for best taste.",
        "images": [photo_url("bottle,gourd", 123)],
        "status": "active",
    },

    # ── Salman Qureshi (farmer-salman-017) ─ maize, wheat, cotton ───────────
    {
        "farmer_id": "seed-farmer-salman-017",
        "name": "Popcorn Maize",
        "category": "grains",
        "price": 90.0,
        "unit": "kg",
        "stock": 250,
        "min_order": "5 kg",
        "delivery_area": "Peshawar, Nowshera, Mardan",
        "description": "Special popcorn variety, high pop rate, no hulls.",
        "images": [photo_url("popcorn,maize", 124)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-salman-017",
        "name": "Cotton Lint (Cleaned)",
        "category": "others",
        "price": 9200.0,
        "unit": "bag",
        "stock": 25,
        "min_order": "2 bags",
        "delivery_area": "Peshawar, Charsadda",
        "description": "Ginned cotton lint, ready for spinning. Each bag ~35 kg.",
        "images": [photo_url("cotton,fiber", 125)],
        "status": "active",
    },

    # ── Faisal Chaudhry (farmer-faisal-019) ─ wheat & vegetables ────────────
    {
        "farmer_id": "seed-farmer-faisal-019",
        "name": "Potatoes (Aloo)",
        "category": "veggies",
        "price": 70.0,
        "unit": "kg",
        "stock": 1000,
        "min_order": "10 kg",
        "delivery_area": "Okara, Depalpur, Renala Khurd",
        "description": "Red-skin potatoes, uniform size, low moisture, ideal for chips.",
        "images": [photo_url("potatoes,vegetable", 126)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-faisal-019",
        "name": "Cauliflower (Phool Gobhi)",
        "category": "veggies",
        "price": 65.0,
        "unit": "piece",
        "stock": 250,
        "min_order": "10 pieces",
        "delivery_area": "Okara",
        "description": "Large white cauliflower heads, fresh-cut daily.",
        "images": [photo_url("cauliflower,vegetable", 127)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-faisal-019",
        "name": "Premium Wheat (Sehar-2006)",
        "category": "grains",
        "price": 112.0,
        "unit": "kg",
        "stock": 550,
        "min_order": "20 kg",
        "delivery_area": "Okara, Sahiwal",
        "description": "Sehar-2006 variety, high yield, strong disease resistance.",
        "images": [photo_url("wheat,field", 128)],
        "status": "active",
    },

    # ── Hamid Mirza (farmer-hamid-020) ─ sugarcane & maize ──────────────────
    {
        "farmer_id": "seed-farmer-hamid-020",
        "name": "Jaggery (Gur)",
        "category": "others",
        "price": 220.0,
        "unit": "kg",
        "stock": 300,
        "min_order": "5 kg",
        "delivery_area": "Kasur, Chunian, Pattoki",
        "description": "Pure cane jaggery, dark brown, rich molasses flavour. No chemicals.",
        "images": [photo_url("jaggery,gur", 129)],
        "status": "active",
    },
    {
        "farmer_id": "seed-farmer-hamid-020",
        "name": "Maize Silage",
        "category": "others",
        "price": 28.0,
        "unit": "kg",
        "stock": 3000,
        "min_order": "200 kg",
        "delivery_area": "Kasur",
        "description": "Fermented maize silage for dairy cattle. High energy fodder.",
        "images": [photo_url("maize,silage", 130)],
        "status": "active",
    },
]
# ──────────────────────────────────────────────────────────────────────────────


async def seed():
    db = get_database()
    col = db[PRODUCT_LISTINGS_COLLECTION]

    await col.create_index([("farmer_id", 1), ("name", 1)])

    inserted = updated = skipped = 0

    for p in PRODUCTS:
        existing = await col.find_one({"farmer_id": p["farmer_id"], "name": p["name"]})
        if existing:
            await col.update_one(
                {"_id": existing["_id"]},
                {"$set": {**p, "updated_at": NOW}},
            )
            updated += 1
            print(f"  ↺ Updated [{p['farmer_id']}] {p['name']}")
            continue

        doc = {**p, "views": 0, "created_at": NOW, "updated_at": NOW}
        await col.insert_one(doc)
        inserted += 1
        print(f"  ✓ Inserted [{p['farmer_id']}] {p['name']}")

    print(f"""
────────────────────────────────────────────────────────────────────
  Inserted : {inserted}
  Updated  : {updated}
  Skipped  : {skipped}
  Total    : {len(PRODUCTS)} products
────────────────────────────────────────────────────────────────────""")


if __name__ == "__main__":
    asyncio.run(seed())
