# src/app/services/calculator/fertilizer_logic.py

def calculate_fertilizer(area, crop_type, area_unit="acre"):
    """
    Calculate fertilizer requirements based on crop type and area, and suggest fertilizers.

    Args:
        area (float): The area of land.
        crop_type (str): Type of crop (wheat, rice, tomato, sugarcane, cotton, mango).
        area_unit (str): Unit of area ("acre", "kanal", "marla").

    Returns:
        dict: Fertilizer requirements in kg for N, P, K and suggested fertilizers.
    """
    # Convert area to acres
    if area_unit.lower() == "kanal":
        area = area * 0.125
    elif area_unit.lower() == "marla":
        area = area * 0.0025

    # Fertilizer requirement per acre (N-P-K in kg)
    fertilizer_requirements = {
        "wheat": {"N": 120, "P": 60, "K": 40},
        "rice": {"N": 150, "P": 70, "K": 50},
        "tomato": {"N": 100, "P": 50, "K": 50},
        "sugarcane": {"N": 180, "P": 80, "K": 60},
        "cotton": {"N": 130, "P": 60, "K": 50},
        "mango": {"N": 80, "P": 40, "K": 50},
    }

    crop_fertilizer = fertilizer_requirements.get(
        crop_type.lower(), {"N": 100, "P": 50, "K": 50}
    )

    # Multiply by area to get total nutrient requirement
    total_nutrients = {k: round(v * area, 2) for k, v in crop_fertilizer.items()}

    # Fertilizer composition (fraction of N, P, K in fertilizer)
    FERTILIZERS = {
        "Urea": {"N": 0.46, "P": 0, "K": 0},  # 46% N
        "DAP": {"N": 0.18, "P": 0.46, "K": 0},  # 18% N, 46% P2O5
        "MOP": {"N": 0, "P": 0, "K": 0.60},  # 60% K2O
    }

    # Calculate fertilizer quantities
    urea_needed = round(total_nutrients["N"] / FERTILIZERS["Urea"]["N"], 2) if total_nutrients["N"] > 0 else 0
    dap_needed = round(total_nutrients["P"] / FERTILIZERS["DAP"]["P"], 2) if total_nutrients["P"] > 0 else 0
    mop_needed = round(total_nutrients["K"] / FERTILIZERS["MOP"]["K"], 2) if total_nutrients["K"] > 0 else 0

    # Suggest which fertilizers are needed
    suggested_fertilizers = []
    if urea_needed > 0:
        suggested_fertilizers.append("Urea")
    if dap_needed > 0:
        suggested_fertilizers.append("DAP")
    if mop_needed > 0:
        suggested_fertilizers.append("MOP")

    return {
        "area_acres": area,
        "crop_type": crop_type,
        "total_nutrients_kg": total_nutrients,
        "fertilizers_kg": {"Urea": urea_needed, "DAP": dap_needed, "MOP": mop_needed},
        "suggested_fertilizers": suggested_fertilizers
    }
