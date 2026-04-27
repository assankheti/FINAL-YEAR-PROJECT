import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GreenHeader from '@/components/GreenHeader';
import { getOrCreateMobileId } from '@/lib/deviceId';
import { API_BASE } from '@/config/env';

const API_URL = `${API_BASE}/api/v1/disease/predict_disease`;

export default function DiseaseDetection() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const REQUEST_TIMEOUT_MS = 30000;

  const guessMimeType = (uri: string): string => {
    const lower = uri.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.heic')) return 'image/heic';
    if (lower.endsWith('.heif')) return 'image/heif';
    return 'image/jpeg';
  };

  // 📷 Camera
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Camera access is needed');
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!res.canceled) {
      setImage(res.assets[0].uri);
      setResult(null);
    }
  };

  // 🖼 Gallery
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Gallery access is needed');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!res.canceled) {
      setImage(res.assets[0].uri);
      setResult(null);
    }
  };

  // 🚀 Detect
  const detectDisease = async () => {
    if (loading) return; // prevent accidental double-submit race on rapid taps

    if (!image) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔍 Starting disease detection...');
      console.log('Image URI:', image);

      await performUpload(image);
      
    } catch (e) {
      console.error('❌ Error:', e);
      const message = e instanceof Error ? e.message : String(e);
      const isNetworkIssue = /network request failed/i.test(message);
      if (isNetworkIssue) {
        Alert.alert(
          'Connection Error',
          `Cannot reach backend server at ${API_BASE}.\n\n1) Ensure backend is running on port 8000\n2) Ensure phone and laptop are on same Wi-Fi\n3) Restart Expo with cache clear (npx expo start -c)`
        );
      } else {
        Alert.alert('Error', `Disease detection failed: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadOnce = async (formData: FormData) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const uploadResponse = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      return uploadResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const isTransientNetworkError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      /network request failed/i.test(msg) ||
      /aborted/i.test(msg) ||
      /timeout/i.test(msg)
    );
  };

  // Helper function to perform the upload
  const performUpload = async (imageUri: string) => {
    const mobileId = await getOrCreateMobileId();
    const selectedCrop = typeof params?.selectedCrop === 'string' ? params.selectedCrop : undefined;

    // Create FormData
    const formData = new FormData();
    const fileName = imageUri.split('/').pop() || 'leaf.jpg';
    const filePart = {
      uri: imageUri,
      name: fileName,
      type: guessMimeType(fileName),
    } as any;
    formData.append('file', filePart);
    formData.append('mobile_id', mobileId);
    if (selectedCrop) {
      formData.append('crop_name', selectedCrop);
    }

    console.log('📤 Sending request to:', API_URL);
    let uploadResponse: Response;
    try {
      uploadResponse = await uploadOnce(formData);
    } catch (err) {
      if (!isTransientNetworkError(err)) throw err;
      console.warn('⚠️ Upload transient error, retrying once...');
      // Recreate form data for retry to avoid consumed body edge-cases.
      const retryFormData = new FormData();
      retryFormData.append('file', filePart);
      retryFormData.append('mobile_id', mobileId);
      if (selectedCrop) retryFormData.append('crop_name', selectedCrop);
      uploadResponse = await uploadOnce(retryFormData);
    }

    console.log('📨 Response status:', uploadResponse.status, uploadResponse.statusText);
    
    if (!uploadResponse.ok) {
      const contentType = uploadResponse.headers.get('content-type');
      let errorText = '';
      
      if (contentType?.includes('application/json')) {
        const errorData = await uploadResponse.json();
        errorText = errorData.detail || JSON.stringify(errorData);
      } else {
        errorText = await uploadResponse.text();
      }
      
      console.error('❌ API error response:', errorText);
      throw new Error(`API error: ${uploadResponse.status} - ${errorText}`);
    }

    const data = await uploadResponse.json();
    console.log('✅ Disease Detection Result:', JSON.stringify(data, null, 2));
    
    // Ensure confidence is a number
    if (data.confidence && typeof data.confidence === 'string') {
      data.confidence = parseFloat(data.confidence);
    }
    
    setResult(data);
  };

  return (
    <SafeAreaView style={styles.container}>
      <GreenHeader title={{ english: 'Disease Detection', urdu: 'فصل کی بیماری کی پہچان' }} onBack={() => router.back()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.introBlock}>
          <Text style={styles.subtitle}>Scan your crop for smart disease analysis</Text>
          <Text style={styles.subtitleUrdu}>فصل کی بیماری کی پہچان کریں</Text>
        </View>

        {/* Upload Box */}
        <View style={styles.uploadBox}>
          {image ? (
            <Image source={{ uri: image }} style={styles.preview} />
          ) : (
            <>
              <Feather name="camera" size={40} color="#2f6f5f" />
              <Text style={styles.uploadText}>Crop Image</Text>
              <Text style={styles.uploadSub}>فصل کی تصویر اسکین کریں</Text>
            </>
          )}
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto} activeOpacity={0.9}>
          <Feather name="camera" size={18} color="#fff" />
          <Text style={styles.primaryText}> Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage} activeOpacity={0.9}>
          <Feather name="image" size={18} color="#2f6f5f" />
          <Text style={styles.secondaryText}> Upload from Gallery</Text>
        </TouchableOpacity>

        {/* Detect */}
        {image && (
          <TouchableOpacity
            style={styles.detectBtn}
            onPress={detectDisease}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.detectText}>Analyze Crop</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Result */}
        {result && (
          <View style={styles.resultCard}>
            {/* Model Indicator */}
            <View style={[
              styles.modelIndicator,
              { backgroundColor: result.model_type === 'online' ? '#E0F7E9' : '#E3F2FD' }
            ]}>
              <View style={[
                styles.modelDot,
                { backgroundColor: result.model_type === 'online' ? '#4CAF50' : '#2196F3' }
              ]} />
              <Text style={[
                styles.modelText,
                { color: result.model_type === 'online' ? '#2E7D32' : '#1565C0' }
              ]}>
                {result.model_type === 'online' ? '🌐 Online Model' : '📱 Offline Model'}
              </Text>
            </View>

            <Text style={styles.resultTitle}>🌱 Disease Detected</Text>

            <Text style={styles.resultText}>
              {String(result?.disease ?? '').trim() || 'Healthy'}
            </Text>

            <Text style={styles.confidence}>
              Confidence: {result.confidence}%
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ✨ AI-Powered Analysis
          </Text>
          <Text style={styles.footerSub}>
            Our AI identifies crop diseases & suggests treatments
          </Text>
          {result && (
            <TouchableOpacity 
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.backBtnText}>← Back to Dashboard</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* 🎨 STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6faf7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 44,
  },
  introBlock: {
    marginBottom: 14,
    alignItems: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#225447',
    fontSize: 15,
    fontWeight: '700',
  },
  subtitleUrdu: {
    textAlign: 'center',
    color: '#4b7c6d',
    marginTop: 4,
    fontSize: 14,
  },
  uploadBox: {
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#9fc7b8',
    backgroundColor: '#eaf4ef',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  uploadText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#2f6f5f',
  },
  uploadSub: {
    marginTop: 4,
    fontSize: 13,
    color: '#4b7c6d',
  },
  preview: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#2f6f5f',
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#0d5c4b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
    marginLeft: 6,
  },
  secondaryBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#2f6f5f',
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryText: {
    color: '#2f6f5f',
    fontWeight: '700',
    fontSize: 17,
    marginLeft: 6,
  },
  detectBtn: {
    backgroundColor: '#1f4d3f',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  detectText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  resultCard: {
    marginTop: 20,
    backgroundColor: '#ecf9f2',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d2efe3',
    alignItems: 'flex-start',
  },
  resultTitle: {
    fontWeight: '800',
    color: '#1f4d3f',
    marginBottom: 6,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f4d3f',
  },

  confidence: {
    color: '#4b7c6d',
    marginTop: 4,
  },
  modelIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  modelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    marginTop: 30,
    backgroundColor: '#eaf4ef',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d7eee4',
  },
  footerText: {
    fontWeight: '800',
    fontSize: 16,
    color: '#1f4d3f',
  },
  footerSub: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
    color: '#4b7c6d',
  },
  backBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#2f6f5f',
    borderRadius: 10,
    alignItems: 'center',
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
