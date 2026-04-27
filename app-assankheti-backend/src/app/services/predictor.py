import os
import io
import numpy as np
from PIL import Image
import requests

try:
    import tensorflow as tf  # use TensorFlow instead of tflite_runtime
    _tf_import_error = None
except Exception as exc:
    tf = None
    _tf_import_error = exc

# Online model endpoints - comment out the ones you don't want to use
API_KEY = "nKR7maxkLCNkzO6PCUa0"
MODEL_ID = "rice-leaf-disease-twtlz/1"

online_endpoints = [
    #"https://assankheti-assankhetimodel.hf.space/predict",  # Hugging Face
    f"https://classify.roboflow.com/{MODEL_ID}",  # Roboflow
]

# Load model once
MODEL_PATH = os.path.join(os.path.dirname(__file__), "../models/best_float32.tflite")
interpreter = None
input_details = None
output_details = None

class_names = [
    "Bacterial Leaf Blight",
    "Brown Spot",
    "Healthy Rice Leaf",
    "Leaf Blast",
    "Leaf scald",
    "Narrow Brown Leaf Spot",
    "Neck Blast",
    "Rice Hispa",
    "Sheath Blight",
    "Tungro",
]


def confidence_to_percent(value) -> float:
    try:
        c = float(value)
    except (TypeError, ValueError):
        return 0.0
    if c <= 1:
        c *= 100
    return round(c, 2)

def predict_hugging_face(img_bytes):
    url = "https://assankheti-assankhetimodel.hf.space/predict"
    files = {"file": ("image.jpg", img_bytes, "image/jpeg")}
    response = requests.post(url, files=files, timeout=10)
    if response.status_code == 200:
        data = response.json()
        return data  # assume {'disease': str, 'confidence': float}
    else:
        raise Exception(f"Hugging Face failed with status {response.status_code}")

def predict_roboflow(img_bytes):
    API_KEY = "nKR7maxkLCNkzO6PCUa0"
    MODEL_ID = "rice-leaf-disease-twtlz/1"
    url = f"https://classify.roboflow.com/{MODEL_ID}?api_key={API_KEY}"
    files = {"file": ("image.jpg", img_bytes, "image/jpeg")}
    response = requests.post(url, files=files, timeout=30)
    if response.status_code == 200:
        data = response.json()
        # Roboflow response format: {'predictions': [...], 'top': 'disease_name', 'confidence': 0.xx, ...}
        if isinstance(data, dict) and 'top' in data and 'confidence' in data:
            return {'disease': data['top'], 'confidence': data['confidence']}
        elif isinstance(data, dict) and 'predictions' in data and data['predictions']:
            # Fallback: use first prediction if 'top' not available
            pred = data['predictions'][0]
            return {'disease': pred['class'], 'confidence': pred['confidence']}
        else:
            raise Exception(f"Unexpected Roboflow response format: {data}")
    else:
        raise Exception(f"Roboflow failed with status {response.status_code}")
def prepare_image(img_bytes):
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    img = img.resize((224, 224))  # adjust if your model expects a different size
    img_array = np.array(img, dtype=np.float32) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

def predict(img_bytes):
   
   
    # # Try Hugging Face first
    # try:
    #     result = predict_hugging_face(img_bytes)
    #     print("[INFO] Using HUGGING FACE model")
    #     return {
    #         "disease": result.get("disease"),
    #         "confidence": result.get("confidence"),
    #         "model_type": "online",
    #         "model_name": "hugging_face"
    #     }
    # except Exception as e:
    #     print(f"[WARNING] Hugging Face failed: {e}")

    # Try Roboflow - uncomment to use
    try:
        result = predict_roboflow(img_bytes)
        print("[INFO] Using ROBOFLOW model")
        confidence = confidence_to_percent(result.get("confidence"))
        disease = result.get("disease")
        if confidence < 30:
            disease = "Not identifiable"
        return {
            "disease": disease,
            "confidence": confidence,
            "model_type": "online",
            "model_name": "roboflow"
        }
    except Exception as e:
        print(f"[WARNING] Roboflow failed: {e}")
    
    # Fallback to offline model
    print("[INFO] Using OFFLINE model")
    img = prepare_image(img_bytes)
    interpreter.set_tensor(input_details[0]['index'], img)
    interpreter.invoke()
    output_data = interpreter.get_tensor(output_details[0]['index'])
    class_idx = int(np.argmax(output_data))
    confidence = confidence_to_percent(np.max(output_data))
    disease = class_names[class_idx]
    if confidence < 30:
        disease = "Not identifiable"

    return {
        "disease": disease,
        "confidence": confidence,
        "model_type": "offline",
        "model_name": "local_tflite"
    }
