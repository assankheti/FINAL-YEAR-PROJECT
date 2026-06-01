from datetime import datetime
import os
import requests

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from app.services import predictor
from app.db.db_connection import get_database
from app.models.collections import DISEASE_SCANS_COLLECTION
import traceback
from app.utils.logger import logger

router = APIRouter()
db = get_database()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

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
        raise HTTPException(
            status_code=500,
            detail="Disease detection failed. Please try again with a clear image.",
        )


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
            "enabled": predictor.is_offline_model_enabled(),
            "available": predictor.is_offline_model_enabled() and predictor.offline_model_file_exists(),
            "tensorflow_loaded": predictor.is_tensorflow_loaded(),
            "tflite_runtime_loaded": predictor.is_tflite_runtime_loaded(),
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


class TreatmentRequest(BaseModel):
    disease: str
    crop_name: str | None = None


@router.post("/treatment")
async def get_disease_treatment(request: TreatmentRequest):
    """Get treatment advice for a detected disease using Gemini."""
    try:
        if not request.disease or not request.disease.strip():
            raise HTTPException(status_code=400, detail="disease name is required")
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Gemini API key not configured on backend")

        crop_name = request.crop_name or "the crop"
        
        prompt = f"""You are an agricultural expert. Provide treatment and preventative measures for the following crop disease in structured format:

Disease: {request.disease}
Crop: {crop_name}

Format your response EXACTLY like this:

## Symptoms
- Brief symptom 1
- Brief symptom 2
- Brief symptom 3

## Recommended Solutions (Medicines & Treatments)
Highlight the most effective medicines and treatments here in 2-3 sentences. Include specific product names or chemical treatments if applicable.

## Steps to Treat
- Step 1 with specific action
- Step 2 with specific action
- Step 3 with specific action
- Step 4 with specific action

## Prevention Tips
- Prevention tip 1
- Prevention tip 2
- Prevention tip 3
- Prevention tip 4

Keep it concise and practical."""

        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
            headers={
                "x-goog-api-key": api_key,
                "Content-Type": "application/json",
            },
            json={
                "system_instruction": {
                    "parts": [
                        {"text": "You are a helpful agricultural expert."}
                    ]
                },
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 500,
                },
            },
            timeout=30,
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Gemini API request failed: {response.text}",
            )

        body = response.json()
        candidates = body.get("candidates") or []
        parts = (((candidates[0] or {}).get("content") or {}).get("parts") or []) if candidates else []
        treatment_text = "\n".join(
            part.get("text", "").strip()
            for part in parts
            if isinstance(part, dict) and part.get("text")
        ).strip()

        if not treatment_text:
            raise HTTPException(status_code=502, detail="Gemini returned no treatment text")

        logger.info(f"Gemini treatment advice for {request.disease}: {treatment_text[:100]}...")
        
        return {"treatment": treatment_text}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching treatment advice: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch treatment advice: {str(e)}"
        )
