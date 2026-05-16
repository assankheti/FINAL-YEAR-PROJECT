import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.services.security import get_current_mobile_id
from app.utils.logger import logger

router = APIRouter()

def _resolve_upload_root() -> str:
    configured = os.getenv("UPLOAD_ROOT")
    if configured:
        return configured
    if os.path.exists("/.dockerenv"):
        return "/app/uploads"
    return os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "uploads")
    )


UPLOAD_ROOT = _resolve_upload_root()
COMMUNITY_DIR = os.path.join(UPLOAD_ROOT, "community")
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}
EXT_BY_CONTENT_TYPE = {"image/jpeg": "jpg", "image/png": "png"}


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    mobile_id: str = Depends(get_current_mobile_id),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Only image/jpeg and image/png are allowed.",
        )

    contents = await file.read()
    size = len(contents)
    if size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if size > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max {MAX_UPLOAD_BYTES} bytes (5 MB).",
        )

    ext = EXT_BY_CONTENT_TYPE[file.content_type]
    filename = f"{uuid.uuid4().hex}.{ext}"
    dest_path = os.path.join(COMMUNITY_DIR, filename)

    try:
        os.makedirs(COMMUNITY_DIR, exist_ok=True)
        with open(dest_path, "wb") as fh:
            fh.write(contents)
    except OSError:
        logger.exception(
            "media_upload_disk_error mobile_id=%s dest=%s", mobile_id, dest_path
        )
        raise HTTPException(status_code=500, detail="Failed to store uploaded file.")

    url = f"/uploads/community/{filename}"
    logger.info("media_upload mobile_id=%s size=%d url=%s", mobile_id, size, url)
    return {"url": url}
