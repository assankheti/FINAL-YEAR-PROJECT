from datetime import datetime
import os

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from app.services import predictor
from app.db.db_connection import get_database
from app.models.collections import DISEASE_SCANS_COLLECTION
import traceback
from app.utils.logger import logger

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

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
            "available": predictor.tf is not None,
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
    """Get treatment advice for a detected disease using OpenAI"""
    try:
        if not request.disease or not request.disease.strip():
            raise HTTPException(status_code=400, detail="disease name is required")
        
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured on backend")
        
        if not OpenAI:
            raise HTTPException(status_code=500, detail="OpenAI library not installed")
        
        client = OpenAI(api_key=api_key)
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
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful agricultural expert."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.2
        )
        
        treatment_text = response.choices[0].message.content
        logger.info(f"OpenAI treatment advice for {request.disease}: {treatment_text[:100]}...")
        
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
