import NetInfo from '@react-native-community/netinfo';
import { Asset } from 'expo-asset';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Buffer } from 'buffer';

if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer as any;
}

// Some React Native runtimes use `global` instead of `globalThis` for polyfills.
if (typeof (global as any).Buffer === 'undefined') {
  (global as any).Buffer = Buffer as any;
}

const modelAssetModule = require('../assets/models/best_float32.tflite');
const modelAsset = Asset.fromModule(modelAssetModule);

const MODEL_LABELS = [
  'Bacterial Leaf Blight',
  'Brown Spot',
  'Healthy Rice Leaf',
  'Leaf Blast',
  'Leaf scald',
  'Narrow Brown Leaf Spot',
  'Neck Blast',
  'Rice Hispa',
  'Sheath Blight',
  'Tungro',
];

// The backend uses the same TFLite model and preprocesses images as:
// 1) convert to RGB
// 2) resize to 224x224
// 3) normalize to float32 / 255.0
// 4) expand dims to [1, 224, 224, 3]
const MODEL_INPUT_SIZE = 224;

let tfModel: any = null;
let loadTensorflowModel: ((source: any, env: any[]) => Promise<any>) | null = null;
let modelLoaded = false;
let loadPromise: Promise<void> | null = null;

const loadLocalModel = async () => {
  if (modelLoaded) {
    return;
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      if (!loadTensorflowModel) {
        try {
          const fastTfliteModule: any = await import('react-native-fast-tflite');
          const candidate =
            fastTfliteModule.loadTensorflowModel ??
            fastTfliteModule.loadModel ??
            fastTfliteModule.default ??
            null;
          loadTensorflowModel = typeof candidate === 'function' ? candidate : null;
        } catch (loadError) {
          throw new Error(
            `Cannot load react-native-fast-tflite. Ensure the native module is installed, linked, and built for your app. ${String(loadError)}`
          );
        }
      }

      if (!loadTensorflowModel) {
        throw new Error('react-native-fast-tflite did not export a valid model loader.');
      }

      await modelAsset.downloadAsync();
      const modelUri = modelAsset.localUri ?? modelAsset.uri;
      if (!modelUri) {
        throw new Error('Unable to resolve local model URI.');
      }

      const normalizedModelUri = /^\w+:/.test(modelUri)
        ? modelUri
        : `file://${modelUri}`;

      try {
        tfModel = await loadTensorflowModel({ url: normalizedModelUri }, []);
      } catch (loadError) {
        console.warn('Offline model URL load failed, retrying with bundled require asset.', loadError);
        tfModel = await loadTensorflowModel(modelAssetModule, []);
      }

      if (!tfModel || typeof tfModel.run !== 'function') {
        throw new Error('react-native-fast-tflite did not return a usable model instance.');
      }

      console.log(
        `Loaded TFLite model, inputs=${JSON.stringify(tfModel.inputs)}, outputs=${JSON.stringify(
          tfModel.outputs
        )}`
      );

      modelLoaded = true;
    } catch (error) {
      loadPromise = null;
      throw error;
    }
  })();

  return loadPromise;
};

export type LocalDiseaseResult = {
  disease: string;
  confidence: number;
  model_type: 'offline';
  model_name: 'local_tflite';
};

export type DiseaseResult = LocalDiseaseResult | {
  disease: string;
  confidence: number;
  model_type: 'online';
  model_name: string;
};

const buildImageTensor = async (imageUri: string): Promise<ArrayBuffer> => {
  const resized = await manipulateAsync(
    imageUri,
    [{ resize: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE } }],
    { base64: true, format: SaveFormat.PNG }
  );

  if (!resized.base64) {
    throw new Error('Image resize returned no base64 payload.');
  }

  const pngModule = await import('pngjs/browser');
  const PNG = pngModule.PNG;
  const pngBytes = Buffer.from(resized.base64, 'base64');
  const png = PNG.sync.read(pngBytes);
  if (png.width !== MODEL_INPUT_SIZE || png.height !== MODEL_INPUT_SIZE) {
    throw new Error(`Resized image has wrong dimensions ${png.width}x${png.height}.`);
  }

  const rgba = png.data;
  const pixelCount = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
  const bufferSize = pixelCount * 3 * Float32Array.BYTES_PER_ELEMENT;
  const inputBuffer = new ArrayBuffer(bufferSize);
  const floatData = new Float32Array(inputBuffer);

  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    floatData[j] = rgba[i] / 255;
    floatData[j + 1] = rgba[i + 1] / 255;
    floatData[j + 2] = rgba[i + 2] / 255;
  }

  console.log(
    `Offline model input converted to float tensor, length=${floatData.length}, bytes=${inputBuffer.byteLength}`
  );
  return inputBuffer;
};

const parseModelOutput = (output: unknown): LocalDiseaseResult => {
  const values: number[] = [];

  const collectNumbers = (value: unknown): void => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      values.push(value);
      return;
    }
    if (value instanceof ArrayBuffer) {
      values.push(...Array.from(new Float32Array(value)));
      return;
    }
    if (ArrayBuffer.isView(value)) {
      const view = new Float32Array(
        (value as ArrayBufferView).buffer,
        (value as ArrayBufferView).byteOffset,
        (value as ArrayBufferView).byteLength / 4
      );
      values.push(...Array.from(view));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collectNumbers);
      return;
    }
    if (value && typeof value === 'object') {
      Object.values(value).forEach(collectNumbers);
    }
  };

  collectNumbers(output);

  if (!values.length) {
    throw new Error('Offline model returned no numeric output.');
  }

  const maxScore = Math.max(...values);
  const maxIndex = values.indexOf(maxScore);

  let confidence: number;
  let disease: string;

  if (values.length === 1) {
    confidence = Number((Math.max(0, Math.min(maxScore, 1)) * 100).toFixed(2));
    disease = maxScore >= 0.3 ? 'Leaf disease detected' : 'Not identifiable';
  } else {
    const shifted = values.map((score) => Math.exp(score - maxScore));
    const sum = shifted.reduce((sumSoFar, value) => sumSoFar + value, 0);
    const softmax = shifted.map((value) => value / sum);
    confidence = Number((softmax[maxIndex] * 100).toFixed(2));
    disease = MODEL_LABELS[maxIndex] ?? 'Unknown leaf condition';
  }

  return {
    disease,
    confidence,
    model_type: 'offline',
    model_name: 'local_tflite',
  };
};

export const detectDiseaseOffline = async (imageUri: string): Promise<LocalDiseaseResult> => {
  await loadLocalModel();

  if (!tfModel) {
    throw new Error('Local TFLite model is not loaded.');
  }

  try {
    const imageTensor = await buildImageTensor(imageUri);
    console.log(
      `Offline model input ready: instanceof ArrayBuffer=${imageTensor instanceof ArrayBuffer}, ` +
        `isView=${ArrayBuffer.isView(imageTensor)}, type=${typeof imageTensor}, byteLength=${imageTensor.byteLength}`
    );

    if (!(imageTensor instanceof ArrayBuffer)) {
      throw new Error(
        `Offline model input is not a raw ArrayBuffer. Received ${Object.prototype.toString.call(
          imageTensor
        )}`
      );
    }

    try {
      const output = await tfModel.run([imageTensor]);
      return parseModelOutput(output);
    } catch (runError) {
      console.warn('Offline model run() failed, attempting runSync() fallback.', runError);
      if (typeof tfModel.runSync === 'function') {
        const output = tfModel.runSync([imageTensor]);
        return parseModelOutput(output);
      }
      throw runError;
    }
  } catch (error) {
    throw new Error(`Local model inference failed: ${String(error)}`);
  }
};

const performOnlineDetection = async (imageUri: string): Promise<DiseaseResult> => {
  // TODO: Replace this placeholder with your existing API upload + prediction logic.
  // Example: upload an image file to `${API_BASE}/api/v1/disease/predict_disease`
  // and return a normalized payload with {
  //   disease: 'Bacterial leaf blight',
  //   confidence: 87.4,
  //   model_type: 'online',
  //   model_name: 'online_api',
  // };
  throw new Error('Online disease detection is not implemented in detectDiseaseHybrid yet.');
};

export const detectDiseaseHybrid = async (imageUri: string): Promise<DiseaseResult> => {
  const netState = await NetInfo.fetch();
  const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

  if (!isOnline) {
    return await detectDiseaseOffline(imageUri);
  }

  try {
    return await performOnlineDetection(imageUri);
  } catch (error) {
    console.warn('Online disease detection failed, falling back to offline model.', error);
    return await detectDiseaseOffline(imageUri);
  }
};
