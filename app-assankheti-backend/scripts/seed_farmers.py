"""
Seed multiple farmer accounts directly into MongoDB.

Idempotent: uses upsert on mobile_id so re-running is safe.

Run:
    cd app-assankheti-backend && PYTHONPATH=src python scripts/seed_farmers.py
"""

import asyncio
from datetime import datetime, timezone

from app.db.db_connection import get_database
from app.models.collections import AUTH_COLLECTION, FINAL_SETTINGS_COLLECTION

NOW = datetime.now(timezone.utc)

# ── Edit this list to add / change farmers ─────────────────────────────────
FARMERS = [
    {
        "mobile_id": "farmer-ali-001",
        "name": "Ali Hassan",
        "phone_number": "+923001234501",
        "selected_crops": ["wheat", "rice"],
        "language": "ur",
    },
    {
        "mobile_id": "farmer-usman-002",
        "name": "Usman Khan",
        "phone_number": "+923001234502",
        "selected_crops": ["cotton", "sugarcane"],
        "language": "ur",
    },
    {
        "mobile_id": "farmer-tariq-003",
        "name": "Tariq Mahmood",
        "phone_number": "+923001234503",
        "selected_crops": ["maize", "vegetables"],
        "language": "en",
    },
    {
        "mobile_id": "farmer-bilal-004",
        "name": "Bilal Ahmed",
        "phone_number": "+923001234504",
        "selected_crops": ["rice"],
        "language": "ur",
    },
    {
        "mobile_id": "farmer-zubair-005",
        "name": "Zubair Iqbal",
        "phone_number": "+923001234505",
        "selected_crops": ["wheat", "cotton"],
        "language": "ur",
    },
    {
        "mobile_id": "farmer-rashid-006",
        "name": "Rashid Nawaz",
        "phone_number": "+923001234506",
        "selected_crops": ["sugarcane"],
        "language": "en",
    },
    {
        "mobile_id": "farmer-kamran-007",
        "name": "Kamran Aslam",
        "phone_number": "+923001234507",
        "selected_crops": ["maize", "wheat"],
        "language": "ur",
    },
    {
        "mobile_id": "farmer-imran-008",
        "name": "Imran Siddiqui",
        "phone_number": "+923001234508",
        "selected_crops": ["rice", "vegetables"],
        "language": "ur",
    },
    {
        "mobile_id": "farmer-nadeem-009",
        "name": "Nadeem Akhtar",
        "phone_number": "+923001234509",
        "selected_crops": ["cotton"],
        "language": "en",
    },
    {
        "mobile_id": "farmer-shahid-010",
        "name": "Shahid Raza",
        "phone_number": "+923001234510",
        "selected_crops": ["wheat", "rice", "maize"],
        "language": "ur",
    },
]
# ──────────────────────────────────────────────────────────────────────────


async def seed():
    db = get_database()
    auth_col = db[AUTH_COLLECTION]
    settings_col = db[FINAL_SETTINGS_COLLECTION]

    inserted = 0
    updated = 0

    for f in FARMERS:
        mid = f["mobile_id"]

        # auth_credentials
        auth_result = await auth_col.update_one(
            {"mobile_id": mid},
            {
                "$set": {
                    "phone_number": f["phone_number"],
                    "user_id": f"seed-{mid}",
                    "is_active": True,
                    "last_login_at": NOW,
                    "role": "farmer",
                },
                "$setOnInsert": {
                    "mobile_id": mid,
                    "created_at": NOW,
                },
            },
            upsert=True,
        )

        # user_settings
        await settings_col.update_one(
            {"mobile_id": mid},
            {
                "$set": {
                    "terms_accepted": True,
                    "language": f["language"],
                    "voice": "urdu" if f["language"] == "ur" else "english",
                    "character_id": "default",
                    "selected_crops": f["selected_crops"],
                    "role": "farmer",
                    "name": f["name"],
                    "voice_assistant": True,
                    "dark_mode": False,
                    "push_notifications": True,
                    "weather_alerts": True,
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

        if auth_result.upserted_id:
            inserted += 1
            print(f"  ✓ Created  [{mid}] {f['name']}")
        else:
            updated += 1
            print(f"  ~ Updated  [{mid}] {f['name']}")

    print(f"\nDone — {inserted} created, {updated} updated (total {len(FARMERS)} farmers).")


if __name__ == "__main__":
    asyncio.run(seed())
