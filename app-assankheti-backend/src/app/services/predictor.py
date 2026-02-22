import os
import io
import numpy as np
from PIL import Image
import tensorflow as tf  # use TensorFlow instead of tflite_runtime

# Load model once
MODEL_PATH = os.path.join(os.path.dirname(__file__), "../models/rice_disease_model.tflite")
interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
interpreter.allocate_tensors()

input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

class_names = ["BrownSpot", "Hispa", "Healthy", "LeafBlast"]

def prepare_image(img_bytes):
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    img = img.resize((224, 224))  # adjust if your model expects a different size
    img_array = np.array(img, dtype=np.float32) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

def predict(img_bytes):
    img = prepare_image(img_bytes)
    interpreter.set_tensor(input_details[0]['index'], img)
    interpreter.invoke()
    output_data = interpreter.get_tensor(output_details[0]['index'])
    class_idx = int(np.argmax(output_data))
    confidence = float(np.max(output_data))
    return {"disease": class_names[class_idx], "confidence": confidence}
