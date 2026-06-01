import os
import io
import numpy as np
from PIL import Image
import requests

tf = None
_tf_import_error = None
_tf_import_attempted = False
tflite_interpreter = None
_tflite_import_error = None
_tflite_import_attempted = False

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


def _env_flag(name: str, default: str = "true") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


def is_offline_model_enabled() -> bool:
    return _env_flag("ENABLE_OFFLINE_DISEASE_MODEL")


def offline_model_file_exists() -> bool:
    return os.path.exists(MODEL_PATH)


def is_tensorflow_loaded() -> bool:
    return tf is not None


def is_tflite_runtime_loaded() -> bool:
    return tflite_interpreter is not None


def _load_tensorflow():
    global tf, _tf_import_error, _tf_import_attempted

    if not is_offline_model_enabled():
        raise RuntimeError("Offline disease model is disabled.")

    if _tf_import_attempted:
        if tf is None:
            raise RuntimeError(f"TensorFlow is unavailable: {_tf_import_error}")
        return tf

    _tf_import_attempted = True
    try:
        import tensorflow as tensorflow_module
    except Exception as exc:
        _tf_import_error = exc
        raise RuntimeError(f"TensorFlow is unavailable: {exc}") from exc

    tf = tensorflow_module
    _tf_import_error = None
    return tf


def _load_tflite_runtime():
    global tflite_interpreter, _tflite_import_error, _tflite_import_attempted

    if not is_offline_model_enabled():
        raise RuntimeError("Offline disease model is disabled.")

    if _tflite_import_attempted:
        if tflite_interpreter is None:
            raise RuntimeError(f"tflite-runtime is unavailable: {_tflite_import_error}")
        return tflite_interpreter

    _tflite_import_attempted = True
    try:
        from tflite_runtime import interpreter as tflite_runtime_interpreter
    except Exception as exc:
        _tflite_import_error = exc
        raise RuntimeError(f"tflite-runtime is unavailable: {exc}") from exc

    tflite_interpreter = tflite_runtime_interpreter
    _tflite_import_error = None
    return tflite_interpreter


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


def _ensure_interpreter():
    global interpreter, input_details, output_details

    if interpreter is not None:
        return interpreter, input_details, output_details

    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(f"Offline model file not found at {MODEL_PATH}")

    backend_error_messages = []

    # Prefer TensorFlow when available; fallback to tflite-runtime for lightweight deploys.
    tensorflow_module = None
    try:
        tensorflow_module = _load_tensorflow()
    except Exception as exc:
        backend_error_messages.append(str(exc))

    runtime_module = None
    if tensorflow_module is None:
        try:
            runtime_module = _load_tflite_runtime()
        except Exception as exc:
            backend_error_messages.append(str(exc))

    if tensorflow_module is None and runtime_module is None:
        raise RuntimeError(
            "Failed to load offline model runtime. " + " | ".join(backend_error_messages)
        )

    try:
        if tensorflow_module is not None:
            interpreter = tensorflow_module.lite.Interpreter(model_path=MODEL_PATH)
        else:
            interpreter = runtime_module.Interpreter(model_path=MODEL_PATH)
        interpreter.allocate_tensors()
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        return interpreter, input_details, output_details
    except Exception as exc:
        interpreter = None
        input_details = None
        output_details = None
        raise RuntimeError(f"Failed to initialize TFLite interpreter: {exc}") from exc

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

    if not is_offline_model_enabled():
        raise RuntimeError("Roboflow failed and offline disease model is disabled.")
    
    # Fallback to offline model
    print("[INFO] Using OFFLINE model")
    img = prepare_image(img_bytes)
    local_interpreter, local_input_details, local_output_details = _ensure_interpreter()
    local_interpreter.set_tensor(local_input_details[0]['index'], img)
    local_interpreter.invoke()
    output_data = local_interpreter.get_tensor(local_output_details[0]['index'])
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
