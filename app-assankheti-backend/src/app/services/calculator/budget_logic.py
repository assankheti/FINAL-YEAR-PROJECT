
def calculate_budget(
    area,
    crop_type,
    area_unit,
    seed_cost,
    fertilizer_cost,
    pesticide_cost,
    other_costs,
    expected_yield,
    price_per_unit
):
    total_cost = (
        seed_cost +
        fertilizer_cost +
        pesticide_cost +
        other_costs
    )

    total_yield = expected_yield * area
    revenue = total_yield * price_per_unit
    profit = revenue - total_cost

    return {
        "total_cost": round(total_cost, 2),
        "expected_revenue": round(revenue, 2),
        "estimated_profit": round(profit, 2),
        "breakdown": {
            "seed_cost": seed_cost,
            "fertilizer_cost": fertilizer_cost,
            "pesticide_cost": pesticide_cost,
            "other_costs": other_costs
        }
    }
