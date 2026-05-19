"""
Seed 20 farmer accounts + 10 customer accounts into MongoDB.

Idempotent: uses upsert on mobile_id so re-running is safe.

Run:
    cd app-assankheti-backend && source venv/bin/activate
    PYTHONPATH=src python scripts/seed_all.py
"""

import asyncio
from datetime import datetime, timezone

from app.db.db_connection import get_database
from app.models.collections import AUTH_COLLECTION, FINAL_SETTINGS_COLLECTION

NOW = datetime.now(timezone.utc)

# ── Farmers ───────────────────────────────────────────────────────────────────
FARMERS = [
    {"mobile_id": "farmer-ali-001",    "name": "Ali Hassan",       "phone": "+923001234501", "crops": ["wheat", "rice"],               "lang": "ur"},
    {"mobile_id": "farmer-usman-002",  "name": "Usman Khan",       "phone": "+923001234502", "crops": ["cotton", "sugarcane"],         "lang": "ur"},
    {"mobile_id": "farmer-tariq-003",  "name": "Tariq Mahmood",    "phone": "+923001234503", "crops": ["maize", "vegetables"],         "lang": "en"},
    {"mobile_id": "farmer-bilal-004",  "name": "Bilal Ahmed",      "phone": "+923001234504", "crops": ["rice"],                        "lang": "ur"},
    {"mobile_id": "farmer-zubair-005", "name": "Zubair Iqbal",     "phone": "+923001234505", "crops": ["wheat", "cotton"],             "lang": "ur"},
    {"mobile_id": "farmer-rashid-006", "name": "Rashid Nawaz",     "phone": "+923001234506", "crops": ["sugarcane"],                   "lang": "en"},
    {"mobile_id": "farmer-kamran-007", "name": "Kamran Aslam",     "phone": "+923001234507", "crops": ["maize", "wheat"],              "lang": "ur"},
    {"mobile_id": "farmer-imran-008",  "name": "Imran Siddiqui",   "phone": "+923001234508", "crops": ["rice", "vegetables"],          "lang": "ur"},
    {"mobile_id": "farmer-nadeem-009", "name": "Nadeem Akhtar",    "phone": "+923001234509", "crops": ["cotton"],                      "lang": "en"},
    {"mobile_id": "farmer-shahid-010", "name": "Shahid Raza",      "phone": "+923001234510", "crops": ["wheat", "rice", "maize"],      "lang": "ur"},
    {"mobile_id": "farmer-asif-011",   "name": "Asif Mehmood",     "phone": "+923001234511", "crops": ["wheat", "sugarcane"],          "lang": "ur"},
    {"mobile_id": "farmer-tahir-012",  "name": "Tahir Butt",       "phone": "+923001234512", "crops": ["rice", "cotton"],              "lang": "ur"},
    {"mobile_id": "farmer-waseem-013", "name": "Waseem Baig",      "phone": "+923001234513", "crops": ["vegetables", "maize"],         "lang": "en"},
    {"mobile_id": "farmer-sajid-014",  "name": "Sajid Hussain",    "phone": "+923001234514", "crops": ["wheat"],                       "lang": "ur"},
    {"mobile_id": "farmer-arif-015",   "name": "Arif Javed",       "phone": "+923001234515", "crops": ["cotton", "vegetables"],        "lang": "ur"},
    {"mobile_id": "farmer-naeem-016",  "name": "Naeem Sheikh",     "phone": "+923001234516", "crops": ["sugarcane", "rice"],           "lang": "en"},
    {"mobile_id": "farmer-salman-017", "name": "Salman Qureshi",   "phone": "+923001234517", "crops": ["maize", "wheat", "cotton"],    "lang": "ur"},
    {"mobile_id": "farmer-waqas-018",  "name": "Waqas Malik",      "phone": "+923001234518", "crops": ["rice"],                        "lang": "ur"},
    {"mobile_id": "farmer-faisal-019", "name": "Faisal Chaudhry",  "phone": "+923001234519", "crops": ["wheat", "vegetables"],         "lang": "ur"},
    {"mobile_id": "farmer-hamid-020",  "name": "Hamid Mirza",      "phone": "+923001234520", "crops": ["sugarcane", "maize"],          "lang": "en"},
]

# ── Customers ─────────────────────────────────────────────────────────────────
CUSTOMERS = [
    {"mobile_id": "customer-sara-001",    "name": "Sara Malik",      "phone": "+923009876501", "interests": ["wheat", "rice"],          "lang": "ur"},
    {"mobile_id": "customer-ayesha-002",  "name": "Ayesha Noor",     "phone": "+923009876502", "interests": ["vegetables", "cotton"],   "lang": "ur"},
    {"mobile_id": "customer-zara-003",    "name": "Zara Hussain",    "phone": "+923009876503", "interests": ["maize", "sugarcane"],     "lang": "en"},
    {"mobile_id": "customer-hina-004",    "name": "Hina Baig",       "phone": "+923009876504", "interests": ["rice"],                   "lang": "ur"},
    {"mobile_id": "customer-sana-005",    "name": "Sana Iqbal",      "phone": "+923009876505", "interests": ["wheat", "maize"],         "lang": "ur"},
    {"mobile_id": "customer-omar-006",    "name": "Omar Farooq",     "phone": "+923009876506", "interests": ["cotton", "wheat"],        "lang": "en"},
    {"mobile_id": "customer-hassan-007",  "name": "Hassan Raza",     "phone": "+923009876507", "interests": ["vegetables"],             "lang": "ur"},
    {"mobile_id": "customer-nadia-008",   "name": "Nadia Khan",      "phone": "+923009876508", "interests": ["rice", "sugarcane"],      "lang": "ur"},
    {"mobile_id": "customer-adnan-009",   "name": "Adnan Siddiqui",  "phone": "+923009876509", "interests": ["wheat", "cotton"],        "lang": "en"},
    {"mobile_id": "customer-farah-010",   "name": "Farah Ahmed",     "phone": "+923009876510", "interests": ["maize", "vegetables"],    "lang": "ur"},
]
# ──────────────────────────────────────────────────────────────────────────────


async def upsert_account(auth_col, settings_col, mid: str, name: str, phone: str,
                          role: str, crops: list, lang: str) -> bool:
    auth_result = await auth_col.update_one(
        {"mobile_id": mid},
        {
            "$set": {
                "phone_number": phone,
                "user_id": f"seed-{mid}",
                "is_active": True,
                "last_login_at": NOW,
                "role": role,
            },
            "$setOnInsert": {
                "mobile_id": mid,
                "created_at": NOW,
            },
        },
        upsert=True,
    )

    await settings_col.update_one(
        {"mobile_id": mid},
        {
            "$set": {
                "terms_accepted": True,
                "language": lang,
                "voice": "urdu" if lang == "ur" else "english",
                "character_id": "default",
                "selected_crops": crops,
                "role": role,
                "name": name,
                "voice_assistant": True,
                "dark_mode": False,
                "push_notifications": True,
                "weather_alerts": role == "farmer",
                "price_updates": True,
                "updated_at": NOW,
            },
            "$setOnInsert": {
                "mobile_id": mid,
                "created_at": NOW,
            },
        },
        upsert=True,
    )

    return bool(auth_result.upserted_id)


async def seed():
    db = get_database()
    auth_col = db[AUTH_COLLECTION]
    settings_col = db[FINAL_SETTINGS_COLLECTION]

    f_created = f_updated = 0
    c_created = c_updated = 0

    print("\n── Farmers ─────────────────────────────────────────────────────────")
    for f in FARMERS:
        created = await upsert_account(
            auth_col, settings_col,
            f["mobile_id"], f["name"], f["phone"],
            "farmer", f["crops"], f["lang"],
        )
        if created:
            f_created += 1
            print(f"  ✓ Created  [{f['mobile_id']}] {f['name']}")
        else:
            f_updated += 1
            print(f"  ~ Updated  [{f['mobile_id']}] {f['name']}")

    print("\n── Customers ───────────────────────────────────────────────────────")
    for c in CUSTOMERS:
        created = await upsert_account(
            auth_col, settings_col,
            c["mobile_id"], c["name"], c["phone"],
            "customer", c["interests"], c["lang"],
        )
        if created:
            c_created += 1
            print(f"  ✓ Created  [{c['mobile_id']}] {c['name']}")
        else:
            c_updated += 1
            print(f"  ~ Updated  [{c['mobile_id']}] {c['name']}")

    print(f"""
────────────────────────────────────────────────────────────────────
  Farmers  : {f_created} created, {f_updated} updated  (total {len(FARMERS)})
  Customers: {c_created} created, {c_updated} updated  (total {len(CUSTOMERS)})
  Grand total: {len(FARMERS) + len(CUSTOMERS)} accounts
────────────────────────────────────────────────────────────────────""")


if __name__ == "__main__":
    asyncio.run(seed())
