# src/app/services/calculator/pesticide_logic.py

def calculate_pesticide(area, crop_type, area_unit="acre"):
    # Convert area to acres
    if area_unit.lower() == "kanal":
        area = area * 0.125
    elif area_unit.lower() == "marla":
        area = area * 0.0025

    # Example pesticide dosage (ml/acre)
    pesticide_per_acre = {
        "wheat": 100,
        "rice": 200,
        "tomato": 150,
        "sugarcane": 250,
        "cotton": 180,
        "mango": 220
    }

    total_dosage = pesticide_per_acre.get(crop_type.lower(), 100) * area
    return {"pesticide_needed_ml": total_dosage}
