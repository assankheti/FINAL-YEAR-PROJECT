from uuid import uuid4
from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.models.collections import (
    TERMS_COLLECTION,
    LANGUAGEVOICE_COLLECTION,
    CHARACTER_COLLECTION,
    FINAL_SETTINGS_COLLECTION,
    MOBILE_DEVICES_COLLECTION,
    CROP_SELECTION_COLLECTION,
)
from app.schemas.terms import TermsCreate, TermsDB
from app.schemas.languageVoice import LanguageCreate, LanguageDB
from app.schemas.character import CharacterCreate, CharacterDB
from app.schemas.deviceSettings import FinalSettingsDB, UserSettingsUpdate
from app.schemas.id_Mobile import mobileid, mobileid_db
from app.schemas.crop_selections import cropSelectionCreate, cropSelectionDB
from app.db.db_connection import get_database
from app.utils.logger import logger


router = APIRouter()
db = get_database()

DEFAULT_USER_SETTINGS = {
    "selected_crops": [],
    "voice_assistant": True,
    "dark_mode": False,
    "push_notifications": True,
    "weather_alerts": True,
    "price_updates": True,
}


def with_user_setting_defaults(doc: dict) -> dict:
    return {
        **DEFAULT_USER_SETTINGS,
        "terms_accepted": False,
        "language": "en",
        "voice": "english",
        "character_id": "farmer",
        "created_at": datetime.utcnow(),
        **doc,
    }


async def build_user_settings_doc(mobile_id: str) -> dict:
    now = datetime.utcnow()
    terms = await db[TERMS_COLLECTION].find_one({"mobile_id": mobile_id}, {"_id": 0})
    lang = await db[LANGUAGEVOICE_COLLECTION].find_one(
        {"mobile_id": mobile_id}, {"_id": 0}
    )
    char = await db[CHARACTER_COLLECTION].find_one({"mobile_id": mobile_id}, {"_id": 0})
    crop = await db[CROP_SELECTION_COLLECTION].find_one(
        {"mobile_id": mobile_id}, {"_id": 0}
    )

    return {
        **DEFAULT_USER_SETTINGS,
        "mobile_id": mobile_id,
        "terms_accepted": bool(terms.get("terms_accepted")) if terms else False,
        "language": lang.get("language", "en") if lang else "en",
        "voice": lang.get("voice", "english") if lang else "english",
        "character_id": char.get("character_id", "farmer") if char else "farmer",
        "selected_crops": crop.get("selected_crops", []) if crop else [],
        "created_at": now,
        "updated_at": now,
    }


async def ensure_user_settings_doc(mobile_id: str) -> dict:
    saved = await db[FINAL_SETTINGS_COLLECTION].find_one(
        {"mobile_id": mobile_id}, {"_id": 0}
    )
    if saved:
        return with_user_setting_defaults(saved)

    doc = await build_user_settings_doc(mobile_id)
    await db[FINAL_SETTINGS_COLLECTION].update_one(
        {"mobile_id": mobile_id}, {"$setOnInsert": doc}, upsert=True
    )
    saved = await db[FINAL_SETTINGS_COLLECTION].find_one(
        {"mobile_id": mobile_id}, {"_id": 0}
    )
    return with_user_setting_defaults(saved or doc)


@router.post("/generate/mobileid", response_model=mobileid_db)
async def bootstrap(payload: mobileid):
    now = datetime.utcnow()

    mobile_id_value = payload.mobile_id.strip() if payload.mobile_id else ""
    if not mobile_id_value:
        mobile_id_value = str(uuid4())

    existing = await db[MOBILE_DEVICES_COLLECTION].find_one(
        {"mobile_id": mobile_id_value}, {"_id": 0}
    )
    created_new = existing is None

    await db[MOBILE_DEVICES_COLLECTION].update_one(
        {"mobile_id": mobile_id_value},
        {
            "$set": {"last_seen_at": now},
            "$setOnInsert": {"mobile_id": mobile_id_value, "created_at": now},
        },
        upsert=True,
    )

    return mobileid_db(
        mobile_id=mobile_id_value,
        created_new=created_new,
        server_time=now,
    )


@router.post("/accept-terms/", response_model=TermsDB)
async def save_terms(payload: TermsCreate):
    doc = {
        "mobile_id": payload.mobile_id,
        "terms_accepted": payload.terms_accepted,
        "accepted_at": datetime.utcnow() if payload.terms_accepted else None,
        "created_at": datetime.utcnow(),
    }

    # Upsert = update if exists, else insert
    await db[TERMS_COLLECTION].update_one(
        {"mobile_id": payload.mobile_id}, {"$set": doc}, upsert=True
    )
    await ensure_user_settings_doc(payload.mobile_id)
    await db[FINAL_SETTINGS_COLLECTION].update_one(
        {"mobile_id": payload.mobile_id},
        {
            "$set": {
                "terms_accepted": payload.terms_accepted,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    saved = await db[TERMS_COLLECTION].find_one(
        {"mobile_id": payload.mobile_id}, {"_id": 0}
    )
    return TermsDB(**saved)


@router.post("/language-voice/", response_model=LanguageDB)
async def save_language(payload: LanguageCreate):
    doc = {
        "mobile_id": payload.mobile_id,
        "language": payload.language,
        "voice": payload.voice,
        "created_at": datetime.utcnow(),
    }

    await db[LANGUAGEVOICE_COLLECTION].update_one(
        {"mobile_id": payload.mobile_id}, {"$set": doc}, upsert=True
    )
    await ensure_user_settings_doc(payload.mobile_id)
    await db[FINAL_SETTINGS_COLLECTION].update_one(
        {"mobile_id": payload.mobile_id},
        {
            "$set": {
                "language": payload.language,
                "voice": payload.voice,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    saved = await db[LANGUAGEVOICE_COLLECTION].find_one(
        {"mobile_id": payload.mobile_id}, {"_id": 0}
    )
    return LanguageDB(**saved)


@router.get("/language-voice/{mobile_id}", response_model=LanguageDB)
async def get_language_voice(mobile_id: str):
    saved = await db[LANGUAGEVOICE_COLLECTION].find_one(
        {"mobile_id": mobile_id}, {"_id": 0}
    )
    if not saved:
        raise HTTPException(
            status_code=404, detail="Language and voice settings not found"
        )
    return LanguageDB(**saved)


@router.post("/character/", response_model=CharacterDB)
async def save_character(payload: CharacterCreate):
    doc = {
        "mobile_id": payload.mobile_id,
        "character_id": payload.character_id,
        "created_at": datetime.utcnow(),
    }

    await db[CHARACTER_COLLECTION].update_one(
        {"mobile_id": payload.mobile_id}, {"$set": doc}, upsert=True
    )
    await ensure_user_settings_doc(payload.mobile_id)
    await db[FINAL_SETTINGS_COLLECTION].update_one(
        {"mobile_id": payload.mobile_id},
        {
            "$set": {
                "character_id": payload.character_id,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    saved = await db[CHARACTER_COLLECTION].find_one(
        {"mobile_id": payload.mobile_id}, {"_id": 0}
    )
    return saved


@router.post("/devicesetting/{mobile_id}", response_model=FinalSettingsDB)
async def finalize_settings(mobile_id: str):
    terms = await db[TERMS_COLLECTION].find_one({"mobile_id": mobile_id}, {"_id": 0})
    lang = await db[LANGUAGEVOICE_COLLECTION].find_one(
        {"mobile_id": mobile_id}, {"_id": 0}
    )
    voice = await db[LANGUAGEVOICE_COLLECTION].find_one(
        {"mobile_id": mobile_id}, {"_id": 0}
    )
    char = await db[CHARACTER_COLLECTION].find_one({"mobile_id": mobile_id}, {"_id": 0})

    missing = []
    if not terms or not terms.get("terms_accepted"):
        missing.append("terms")
    if not lang:
        missing.append("language")
    if not voice:
        missing.append("voice")
    if not char:
        missing.append("character")

    if missing:
        raise HTTPException(
            status_code=400, detail=f"Cannot finalize. Missing: {', '.join(missing)}"
        )

    final_doc = {
        "mobile_id": mobile_id,
        "terms_accepted": terms["terms_accepted"],
        "language": lang["language"],
        "voice": voice["voice"],
        "character_id": char["character_id"],
        "created_at": datetime.utcnow(),
    }
    existing_settings = await db[FINAL_SETTINGS_COLLECTION].find_one(
        {"mobile_id": mobile_id}, {"_id": 0}
    )
    if existing_settings:
        final_doc.update(
            {
                key: existing_settings.get(key, default)
                for key, default in DEFAULT_USER_SETTINGS.items()
            }
        )
        final_doc["created_at"] = existing_settings.get(
            "created_at", final_doc["created_at"]
        )
        final_doc["updated_at"] = datetime.utcnow()
    else:
        final_doc.update(DEFAULT_USER_SETTINGS)

    await db[FINAL_SETTINGS_COLLECTION].update_one(
        {"mobile_id": mobile_id}, {"$set": final_doc}, upsert=True
    )

    saved = await db[FINAL_SETTINGS_COLLECTION].find_one(
        {"mobile_id": mobile_id}, {"_id": 0}
    )
    return FinalSettingsDB(**with_user_setting_defaults(saved))


@router.get("/devicesetting/{mobile_id}", response_model=FinalSettingsDB)
async def get_final_settings(mobile_id: str):
    saved = await ensure_user_settings_doc(mobile_id)
    return FinalSettingsDB(**saved)


@router.patch("/devicesetting/{mobile_id}", response_model=FinalSettingsDB)
async def update_user_settings(mobile_id: str, payload: UserSettingsUpdate):
    update_doc = payload.model_dump(exclude_unset=True)
    if not update_doc:
        raise HTTPException(status_code=400, detail="No settings to update")

    await ensure_user_settings_doc(mobile_id)
    update_doc["updated_at"] = datetime.utcnow()
    await db[FINAL_SETTINGS_COLLECTION].update_one(
        {"mobile_id": mobile_id}, {"$set": update_doc}
    )

    saved = await db[FINAL_SETTINGS_COLLECTION].find_one(
        {"mobile_id": mobile_id}, {"_id": 0}
    )
    return FinalSettingsDB(**with_user_setting_defaults(saved))

@router.post("/crop-selection/{mobile_id}", response_model=cropSelectionDB)
async def save_crop_selection(mobile_id: str, payload: cropSelectionCreate):
    doc = {
        "mobile_id": mobile_id,
        "selected_crops": payload.selected_crops,
        "created_at": datetime.utcnow(),
    }

    await db[CROP_SELECTION_COLLECTION].update_one(
        {"mobile_id": mobile_id}, {"$set": doc}, upsert=True
    )
    await ensure_user_settings_doc(mobile_id)
    await db[FINAL_SETTINGS_COLLECTION].update_one(
        {"mobile_id": mobile_id},
        {
            "$set": {
                "selected_crops": payload.selected_crops,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    saved = await db[CROP_SELECTION_COLLECTION].find_one(
        {"mobile_id": mobile_id}, {"_id": 0}
    )
    return cropSelectionDB(**saved)
