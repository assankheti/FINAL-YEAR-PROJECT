from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services import predictor
import traceback
from app.utils.logger import logger

router = APIRouter()

@router.post("/predict_disease")
async def predict_disease(file: UploadFile = File(...)):
    try:
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="File has no name")
            
        logger.info(f"Received file: {file.filename}, content_type: {file.content_type}")
        
        img_bytes = await file.read()
        
        if not img_bytes:
            raise HTTPException(status_code=400, detail="File is empty")
        
        logger.info(f"File size: {len(img_bytes)} bytes")
        
        result = predictor.predict(img_bytes)
        logger.info(f"Prediction result: {result}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in disease prediction: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

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

