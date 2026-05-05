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
    COMMUNITY_GROUPS_COLLECTION,
    COMMUNITY_GROUP_MEMBERS_COLLECTION,
)
from app.schemas.terms import TermsCreate, TermsDB
from app.schemas.languageVoice import LanguageCreate, LanguageDB
from app.schemas.character import CharacterCreate, CharacterDB
from app.schemas.deviceSettings import FinalSettingsDB
from app.schemas.id_Mobile import mobileid, mobileid_db
from app.schemas.crop_selections import cropSelectionCreate, cropSelectionDB
from app.db.db_connection import get_database
from app.utils.logger import logger


router = APIRouter()
db = get_database()


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

    await db[FINAL_SETTINGS_COLLECTION].update_one(
        {"mobile_id": mobile_id}, {"$set": final_doc}, upsert=True
    )

    saved = await db[FINAL_SETTINGS_COLLECTION].find_one(
        {"mobile_id": mobile_id}, {"_id": 0}
    )
    return saved

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

    # Best-effort auto-join into matching community groups (Piece 6).
    # Crops without a matching group (Wheat etc. in v1) silently no-op.
    # Failures here must not break the response.
    try:
        await _auto_join_community_groups(mobile_id, payload.selected_crops)
    except Exception:
        logger.exception("community_auto_join_failed mobile_id=%s", mobile_id)

    saved = await db[CROP_SELECTION_COLLECTION].find_one(
        {"mobile_id": mobile_id}, {"_id": 0}
    )
    return cropSelectionDB(**saved)


async def _auto_join_community_groups(mobile_id: str, selected_crops):
    """Add the user to every existing community_group whose `crop` matches one
    of the selected crops. Idempotent — re-running with the same crops is a
    no-op and does not double-increment member_count.
    """
    if not selected_crops:
        return
    crop_keys = {c.lower().strip() for c in selected_crops if isinstance(c, str)}
    if not crop_keys:
        return

    cursor = db[COMMUNITY_GROUPS_COLLECTION].find({"crop": {"$in": list(crop_keys)}})
    now = datetime.utcnow()
    async for group in cursor:
        group_id = group.get("group_id")
        if not group_id:
            continue
        # Insert-if-absent; the unique (mobile_id, group_id) index prevents dupes.
        existing = await db[COMMUNITY_GROUP_MEMBERS_COLLECTION].find_one(
            {"group_id": group_id, "mobile_id": mobile_id}
        )
        if existing:
            continue
        try:
            await db[COMMUNITY_GROUP_MEMBERS_COLLECTION].insert_one({
                "group_id": group_id,
                "mobile_id": mobile_id,
                "joined_at": now,
                "last_read_at": None,
                "muted": False,
            })
        except Exception:
            logger.exception(
                "community_member_insert_failed mobile_id=%s group_id=%s",
                mobile_id, group_id,
            )
            continue
        try:
            await db[COMMUNITY_GROUPS_COLLECTION].update_one(
                {"group_id": group_id}, {"$inc": {"member_count": 1}}
            )
        except Exception:
            logger.exception(
                "community_member_count_increment_failed group_id=%s", group_id
            )
        try:
            # Lazy import — keeps deviceSettings out of the socket-gateway dep
            # graph at module load.
            from app.services.notifications import notify  # noqa: WPS433
            crop_label = (group.get("name_en") or group.get("crop") or "Crop").title()
            await notify(
                mobile_id,
                "group_added",
                data={"group_id": group_id, "crop": group.get("crop")},
                crop=crop_label,
            )
        except Exception:
            logger.exception(
                "community_join_notification_failed mobile_id=%s group_id=%s",
                mobile_id, group_id,
            )
        logger.info(
            "community_auto_joined mobile_id=%s group_id=%s crop=%s",
            mobile_id, group_id, group.get("crop"),
        )