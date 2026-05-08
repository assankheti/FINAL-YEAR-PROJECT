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

// Component to parse and display treatment content with sections and bullet points
function TreatmentContent({ content }: { content: string }) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  const sections: { title: string; items: string[] }[] = [];
  let currentSection: { title: string; items: string[] } | null = null;

  for (const line of lines) {
    if (line.startsWith('##')) {
      // Section header
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace(/^##\s*/, '').trim(),
        items: []
      };
    } else if (line.startsWith('-')) {
      // Bullet point
      if (currentSection) {
        currentSection.items.push(line.replace(/^-\s*/, '').trim());
      }
    } else if (line && currentSection) {
      // Regular text within section
      currentSection.items.push(line);
    }
  }
  if (currentSection) {
    sections.push(currentSection);
  }

  return (
    <View>
      {sections.map((section, idx) => (
        <View key={idx} style={styles.treatmentSection}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item, itemIdx) => (
            <View key={itemIdx} style={styles.treatmentItemContainer}>
              {item.startsWith('•') || /^\d+\./.test(item) ? (
                <Text style={styles.bulletText}>{"• " + item.replace(/^[•\d.]\s*/, '')}</Text>
              ) : section.title.includes('Solutions') || section.title.includes('Medicines') ? (
                <Text style={styles.highlightedText}>{item}</Text>
              ) : (
                <Text style={styles.treatmentText}>{item}</Text>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function DiseaseDetection() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [treatment, setTreatment] = useState<string | null>(null);
  const [treatmentLoading, setTreatmentLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
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
      setErrorText(null);
      setStatusText(null);
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
      setErrorText(null);
      setStatusText(null);
    }
  };

  // 🚀 Detect
  const detectDisease = async () => {
    if (loading) return; // prevent accidental double-submit race on rapid taps

    if (!image) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setErrorText(null);
    setStatusText('Analyzing crop image...');
    setLoading(true);

    try {
      console.log('🔍 Starting disease detection...');
      console.log('Image URI:', image);

      await performUpload(image);
      setStatusText('Analysis complete. Scroll down to view results.');
    } catch (e) {
      console.error('❌ Error:', e);
      const message = e instanceof Error ? e.message : String(e);
      const isNetworkIssue = /network request failed/i.test(message);
      const uiError = isNetworkIssue
        ? `Cannot reach backend server at ${API_BASE}. Check backend and network connectivity.`
        : `Disease detection failed: ${message}`;

      setErrorText(uiError);
      setStatusText(null);

      Alert.alert(
        isNetworkIssue ? 'Connection Error' : 'Error',
        isNetworkIssue
          ? `${uiError}\n\n1) Ensure backend is running on port 8000\n2) Ensure phone and laptop are on same Wi-Fi\n3) Restart Expo with cache clear (npx expo start -c)`
          : uiError
      );
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
    const mimeType = guessMimeType(fileName);

    // For web environment: fetch and convert URI to Blob
    // For native: use the file object directly
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('file', blob, fileName);
    } catch (e) {
      // Fallback for native environments
      const filePart = {
        uri: imageUri,
        name: fileName,
        type: mimeType,
      } as any;
      formData.append('file', filePart);
    }

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
      // Recreate form data for retry
      const retryFormData = new FormData();
      try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        retryFormData.append('file', blob, fileName);
      } catch (e) {
        const filePart = {
          uri: imageUri,
          name: fileName,
          type: guessMimeType(fileName),
        } as any;
        retryFormData.append('file', filePart);
      }
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

    // Normalize and validate payload before rendering UI.
    const normalized = {
      ...data,
      disease: String(data?.disease ?? '').trim(),
      confidence: Number(data?.confidence ?? 0),
    };

    if (!normalized.disease) {
      throw new Error('No disease prediction returned from server.');
    }

    setResult(normalized);
    // clear any previous treatment when new result arrives
    setTreatment(null);
    // automatically fetch treatment advice using configured OpenAI key
    fetchTreatment(normalized.disease).catch((e) => console.warn('treatment fetch failed', e));
  };

  // Fetch treatment advice from backend (which calls OpenAI)
  const fetchTreatment = async (diseaseName: string) => {
    setTreatmentLoading(true);
    setTreatment(null);
    try {
      const cropName = typeof params?.selectedCrop === 'string' ? params.selectedCrop : 'the crop';
      
      const treatmentApiUrl = `${API_BASE}/api/v1/disease/treatment`;
      const res = await fetch(treatmentApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disease: diseaseName,
          crop_name: cropName,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Backend error: ${res.status} ${txt}`);
      }

      const body = await res.json();
      const treatmentText = body?.treatment || null;
      setTreatment(treatmentText ? String(treatmentText).trim() : 'No advice returned.');
    } catch (e) {
      console.error('Treatment fetch error', e);
      setTreatment(e instanceof Error ? e.message : String(e));
    } finally {
      setTreatmentLoading(false);
    }
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
            style={[styles.detectBtn, loading && styles.detectBtnDisabled]}
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

        {statusText && <Text style={styles.statusText}>{statusText}</Text>}
        {errorText && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
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

        {/* Treatment / Advice from OpenAI (auto-fetched) */}
        {result && (
          <View style={styles.treatmentCard}>
            <Text style={styles.treatmentTitle}>💊 Treatment & Advice (✨ AI-Powered Analysis)</Text>

            {treatmentLoading && <ActivityIndicator color="#2f6f5f" />}

            {treatment && (
              <View style={styles.treatmentOutput}>
                <TreatmentContent content={treatment} />
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
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
  detectBtnDisabled: {
    opacity: 0.75,
  },
  detectText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  statusText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#245748',
    fontSize: 13,
    fontWeight: '600',
  },
  errorCard: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f7c7c7',
    backgroundColor: '#fff4f4',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: {
    color: '#9a1f1f',
    fontSize: 13,
    lineHeight: 18,
  },
  resultCard: {
    marginTop: 20,
    backgroundColor: '#ecf9f2',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d2efe3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontWeight: '800',
    color: '#1f4d3f',
    marginBottom: 6,
    textAlign: 'center',
  },
  resultText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f4d3f',
    textAlign: 'center',
  },

  confidence: {
    color: '#4b7c6d',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  modelIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  treatmentCard: {
    marginTop: 14,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6efe9',
  },
  treatmentTitle: {
    fontWeight: '800',
    color: '#184e3f',
    marginBottom: 8,
  },
  treatmentOutput: {
    backgroundColor: '#f6fff8',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e1f3e6',
  },
  treatmentText: {
    color: '#163f33',
    lineHeight: 20,
  },
  treatmentSection: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1f3e6',
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 14,
    color: '#1f4d3f',
    marginBottom: 8,
  },
  treatmentItemContainer: {
    marginBottom: 6,
  },
  bulletText: {
    fontSize: 13,
    color: '#2a6b5e',
    lineHeight: 18,
    fontWeight: '500',
  },
  highlightedText: {
    fontSize: 13,
    color: '#0d7e3f',
    lineHeight: 18,
    fontWeight: '700',
    backgroundColor: '#e8f5e9',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
});
