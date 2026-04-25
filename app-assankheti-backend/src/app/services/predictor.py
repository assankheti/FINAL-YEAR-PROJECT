import os
import io
import numpy as np
from PIL import Image
import tensorflow as tf  # use TensorFlow instead of tflite_runtime
import requests

# Online model endpoints - comment out the ones you don't want to use
API_KEY = "nKR7maxkLCNkzO6PCUa0"
MODEL_ID = "rice-leaf-disease-twtlz/1"

online_endpoints = [
    #"https://assankheti-assankhetimodel.hf.space/predict",  # Hugging Face
    f"https://classify.roboflow.com/{MODEL_ID}",  # Roboflow
]

# Load model once
MODEL_PATH = os.path.join(os.path.dirname(__file__), "../models/best_float32.tflite")
interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
interpreter.allocate_tensors()

input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

class_names = [
    "Bacterial Leaf Blight",
    "Brown Spot",
    "Healthy Rice Leaf",
    "Leaf Blast",
    "Leaf scald",
    "Narrow Brown Leaf Spot",
    "Rice Hispa",
    "Sheath Blight",
    "Tungro",
]

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
   
   
    # Try Hugging Face - uncomment to use
    # try:
    #     result = predict_hugging_face(img_bytes)
    #     print("[INFO] Using HUGGING FACE model")
    #     return {
    #         "disease": result.get("disease", "Unknown"),
    #         "confidence": round(float(result.get("confidence", 0)) * 100, 2),
    #         "model_type": "online",
    #         "model_name": "hugging_face"
    #     }
    # except Exception as e:
    #     print(f"[WARNING] Hugging Face failed: {e}")

    # Try Roboflow - uncomment to use
    try:
        result = predict_roboflow(img_bytes)
        print("[INFO] Using ROBOFLOW model")
        confidence = float(result.get("confidence", 0))
        # Roboflow returns confidence as 0-1, convert to 0-100
        if confidence <= 1:
            confidence = confidence * 100
        return {
            "disease": result.get("disease", "Unknown"),
            "confidence": round(confidence, 2),
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
    confidence = float(np.max(output_data))
    # Convert confidence to 0-100 range
    confidence_percent = confidence * 100 if confidence <= 1 else confidence
    
    if confidence >= 0.85:
        return {
            "disease": class_names[class_idx], 
            "confidence": round(confidence_percent, 2),
            "model_type": "offline",
            "model_name": "local_tflite"
        }
    else:
        return {
            "disease": "no disease", 
            "confidence": round(confidence_percent, 2),
            "model_type": "offline",
            "model_name": "local_tflite"
        }
