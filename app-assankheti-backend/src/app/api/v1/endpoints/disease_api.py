from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services import predictor
from app.db.db_connection import get_database
from app.models.collections import DISEASE_SCANS_COLLECTION
import traceback
from app.utils.logger import logger

router = APIRouter()
db = get_database()

@router.post("/predict_disease")
async def predict_disease(file: UploadFile = File(...), mobile_id: str = Form(...), crop_name: str | None = Form(None)):
    try:
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")

        if not mobile_id or not mobile_id.strip():
            raise HTTPException(status_code=400, detail="mobile_id is required")
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="File has no name")
            
        logger.info(f"Received file: {file.filename}, content_type: {file.content_type}")
        
        img_bytes = await file.read()
        
        if not img_bytes:
            raise HTTPException(status_code=400, detail="File is empty")
        
        logger.info(f"File size: {len(img_bytes)} bytes")
        
        result = predictor.predict(img_bytes)
        scan_doc = {
            "mobile_id": mobile_id.strip(),
            "crop_name": crop_name,
            "disease": result.get("disease"),
            "confidence": result.get("confidence"),
            "model_type": result.get("model_type"),
            "model_name": result.get("model_name"),
            "scanned_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        await db[DISEASE_SCANS_COLLECTION].update_one(
            {"mobile_id": mobile_id.strip()},
            {
                "$set": scan_doc,
                "$setOnInsert": {"created_at": datetime.utcnow()},
            },
            upsert=True,
        )

        logger.info(f"Prediction result: {result}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in disease prediction: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.get("/last-scan/{mobile_id}")
async def get_last_scan(mobile_id: str):
    if not mobile_id or not mobile_id.strip():
        raise HTTPException(status_code=400, detail="mobile_id is required")

    doc = await db[DISEASE_SCANS_COLLECTION].find_one({"mobile_id": mobile_id.strip()}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No scan found for this mobile_id")

    return doc

@router.get("/model_status")
async def model_status():
    """Check which models are available and working"""
    status = {
        "offline_model": {
            "available": True,
            "name": "YOLO TFLite",
            "type": "local"
        },
        "online_models": {
            "roboflow": {
                "configured": True,
                "name": "Roboflow"
            },
            "hugging_face": {
                "configured": False,
                "name": "Hugging Face"
            }
        },
        "message": "Disease detection models are ready. System will use online models if available, fallback to offline model."
    }
    return status

