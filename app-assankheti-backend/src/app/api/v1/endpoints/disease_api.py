from fastapi import APIRouter, UploadFile, File
from app.services import predictor

router = APIRouter()

@router.post("/predict_disease")
async def predict_disease(file: UploadFile = File(...)):
    img_bytes = await file.read()
    result = predictor.predict(img_bytes)
    return result
