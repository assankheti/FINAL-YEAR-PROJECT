# src/app/services/calculator/irrigation_logic.py

def calculate_irrigation(area, crop_type, area_unit="acre"):
    # Convert area to acres if needed
    if area_unit.lower() == "kanal":
        area = area * 0.125
    elif area_unit.lower() == "marla":
        area = area * 0.0025

    # Example water requirement (liters/acre) - can improve with real data
    water_per_acre = {
        "wheat": 4500,
        "rice": 10000,
        "tomato": 3500,
        "sugarcane": 12000,
        "cotton": 5000,
        "mango": 6000
    }

    water_needed = water_per_acre.get(crop_type.lower(), 4000) * area
    return {"water_needed_liters": water_needed}
