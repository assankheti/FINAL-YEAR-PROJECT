# src/app/api/v1/endpoints/calculator.py
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.calculator.fertilizer_logic import calculate_fertilizer
from app.services.calculator.pesticide_logic import calculate_pesticide
from app.services.calculator.irrigation_logic import calculate_irrigation
from app.services.calculator.budget_logic import calculate_budget

from app.services.scraper.fertilizer_scraper import scrape_fertilizer_prices
from app.services.scraper.pesticide_scraper import scrape_pesticide_prices
from app.services.scraper.seed_scraper import scrape_seed_prices
from app.services.scraper.crop_price_scraper import scrape_crop_prices

from app.data.quantities import (
    SEED_QTY_PER_ACRE,
    FERTILIZER_QTY_PER_ACRE,
    PESTICIDE_QTY_PER_ACRE
)

router = APIRouter(
    tags=["Smart Agriculture Calculator"]
)

# ---------- Crop price mapping ----------
CROP_PRICE_MAPPING = {
    "rice": "rice basmati new (kg)",
    "potato": "potato fresh (kg)",
    "tomato": "tomato (kg)",
    "onion": "onion (kg)",
    "wheat": "atta bag (20kg)"
}

FALLBACK_CROP_PRICES = {
    "Rice": 45,
    "Wheat": 38,
    "Potato": 30,
    "Tomato": 55,
    "Onion": 50,
}

RETAIL_TO_FARM_FACTOR = 0.6

# ---------- Common Input ----------
class CalcInput(BaseModel):
    crop_type: str
    area: float
    area_unit: str = "acre"

# ---------- Fertilizer ----------
@router.post("/fertilizer")
def fertilizer_calc(input: CalcInput):
    return calculate_fertilizer(input.area, input.crop_type, input.area_unit)

# ---------- Pesticide ----------
@router.post("/pesticide")
def pesticide_calc(input: CalcInput):
    return calculate_pesticide(input.area, input.crop_type, input.area_unit)

# ---------- Irrigation ----------
@router.post("/irrigation")
def irrigation_calc(input: CalcInput):
    return calculate_irrigation(input.area, input.crop_type, input.area_unit)

# ---------- Prices ----------
@router.get("/prices/fertilizer")
def fertilizer_prices():
    return scrape_fertilizer_prices()

@router.get("/prices/pesticide")
def pesticide_prices():
    return scrape_pesticide_prices()

@router.get("/prices/seed")
def seed_prices():
    return scrape_seed_prices()

@router.get("/prices/crop")
def crop_prices():
    raw_prices = scrape_crop_prices()

    # Always return stable keys expected by frontend/dashboard.
    normalized = {
        "Rice": raw_prices.get(CROP_PRICE_MAPPING["rice"]),
        "Wheat": raw_prices.get(CROP_PRICE_MAPPING["wheat"]),
        "Potato": raw_prices.get(CROP_PRICE_MAPPING["potato"]),
        "Tomato": raw_prices.get(CROP_PRICE_MAPPING["tomato"]),
        "Onion": raw_prices.get(CROP_PRICE_MAPPING["onion"]),
    }

    # If scraping is empty or any crop is missing, fill with safe fallback values.
    for crop, fallback_value in FALLBACK_CROP_PRICES.items():
        if normalized.get(crop) is None:
            normalized[crop] = fallback_value

    return normalized

# ---------- Budget ----------
class BudgetInput(BaseModel):
    crop_type: str
    area: float
    area_unit: str = "acre"

    seed_name: str
    fertilizer_name: str
    pesticide_name: str

    other_costs: float = 0

EXPECTED_YIELD = {
    "wheat": 1200,
    "rice": 1500,
    "potato": 8000,
    "onion": 7000,
    "tomato": 6000
}

@router.post("/budget")
def budget_calc(input: BudgetInput):

    crop = input.crop_type.lower()

    # Fetch prices
    seed_prices = scrape_seed_prices()
    fert_prices = scrape_fertilizer_prices()
    pest_prices = scrape_pesticide_prices()
    crop_prices = scrape_crop_prices()

    # ---------- Seed cost ----------
    seed_price = seed_prices.get(input.seed_name, 0)
    seed_qty = SEED_QTY_PER_ACRE.get(crop, {}).get(input.seed_name, 0)
    seed_cost = seed_price * seed_qty * input.area

    # ---------- Fertilizer cost ----------
    fert_price = fert_prices.get(input.fertilizer_name, 0)
    fert_qty = FERTILIZER_QTY_PER_ACRE.get(crop, {}).get(input.fertilizer_name, 0)
    fertilizer_cost = fert_price * fert_qty * input.area

    # ---------- Pesticide cost ----------
    pest_price = pest_prices.get(input.pesticide_name, 0)
    pest_qty = PESTICIDE_QTY_PER_ACRE.get(crop, {}).get(input.pesticide_name, 0)
    pesticide_cost = pest_price * pest_qty * input.area

    # ---------- Expected yield ----------
    expected_yield = EXPECTED_YIELD.get(crop, 0) * input.area

    # ---------- Crop selling price (Rs per kg) ----------
    crop_key = CROP_PRICE_MAPPING.get(crop)
    if crop_key:
        retail_price = crop_prices.get(crop_key, 0)
        price_per_unit = retail_price * RETAIL_TO_FARM_FACTOR
    else:
        price_per_unit = 0

    return calculate_budget(
        area=input.area,
        crop_type=input.crop_type,
        area_unit=input.area_unit,
        seed_cost=seed_cost,
        fertilizer_cost=fertilizer_cost,
        pesticide_cost=pesticide_cost,
        other_costs=input.other_costs,
        expected_yield=expected_yield,
        price_per_unit=price_per_unit
    )
