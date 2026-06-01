import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GreenHeader from '@/components/GreenHeader';
import { SpeechHighlight } from '@/components/SpeechHighlight';
import { useLanguage } from '@/contexts/LanguageContext';
import { getOrCreateMobileId } from '@/lib/deviceId';
import { API_BASE } from '@/config/env';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';

const API_URL = `${API_BASE}/api/v1/disease/predict_disease`;

type TreatmentSection = {
  title: string;
  items: string[];
  tone?: 'normal' | 'highlight' | 'warning';
};

function parseTreatment(content: string): TreatmentSection[] {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  const sections: TreatmentSection[] = [];
  let currentSection: TreatmentSection | null = null;

  const openSection = (title: string, tone: TreatmentSection['tone'] = 'normal') => {
    if (currentSection && (currentSection.title || currentSection.items.length)) {
      sections.push(currentSection);
    }
    currentSection = { title, items: [], tone };
  };

  for (const line of lines) {
    if (line.startsWith('##')) {
      const title = line.replace(/^##\s*/, '').trim() || 'Advice';
      const normalized = title.toLowerCase();
      const tone =
        normalized.includes('solution') || normalized.includes('medicine')
          ? 'highlight'
          : normalized.includes('warning') || normalized.includes('caution')
            ? 'warning'
            : 'normal';
      openSection(title, tone);
      continue;
    }

    if (/^[A-Za-z][A-Za-z\s/&()-]+:$/.test(line)) {
      openSection(line.replace(/:$/, '').trim());
      continue;
    }

    let activeSection: TreatmentSection | null = currentSection;
    if (!activeSection) {
      activeSection = { title: 'Recommended Treatment', items: [], tone: 'highlight' };
      currentSection = activeSection;
    }

    activeSection.items.push(line.replace(/^[-*]\s*/, '').trim());
  }

  if (currentSection && (currentSection.title || currentSection.items.length)) {
    sections.push(currentSection);
  }

  return sections.length ? sections : [{ title: 'Recommended Treatment', items: [content.trim()] }];
}

export default function DiseaseDetection() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { textLanguage } = useLanguage();
  const { enabled: voiceEnabled, activeHighlightId, startGuidedSequence, cancelGuidedSequence } =
    useVoiceGuidance();
  const selectedCrop = typeof params?.selectedCrop === 'string' ? params.selectedCrop : null;
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [treatment, setTreatment] = useState<string | null>(null);
  const [treatmentLoading, setTreatmentLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const REQUEST_TIMEOUT_MS = 30000;

  const parsedTreatmentSections = useMemo(
    () => (treatment ? parseTreatment(treatment) : []),
    [treatment]
  );
  const tText = useMemo(
    () =>
      textLanguage === 'urdu'
        ? {
            title: 'بیماری کی تشخیص',
            subtitle: 'تصویر لیں یا گیلری سے منتخب کریں، پھر بیماری اور علاج دیکھیں۔',
            heroBadge: 'AI فصل صحت مددگار',
            heroTitle: 'صاف پتوں کی تصویر اپلوڈ کریں تاکہ بیماری اور علاج معلوم ہو سکے۔',
            cropChip: 'منتخب فصل',
            uploadTitle: 'فصل کی تصویر',
            uploadSub: 'فصل کی تصویر اسکین کریں',
            uploadHint: 'دن کی روشنی استعمال کریں اور متاثرہ حصہ درمیان میں رکھیں',
            takePhoto: 'تصویر لیں',
            uploadGallery: 'گیلری سے اپلوڈ کریں',
            analyze: 'فصل تجزیہ کریں',
            analyzeScroll: 'تجزیہ مکمل۔ نتائج نیچے دیکھیں۔',
            resultTitle: 'بیماری کی شناخت',
            confidence: 'اعتماد',
            treatmentTitle: 'علاج اور بچاؤ کی ہدایت',
            treatmentE: 'دیکھ بھال کا منصوبہ',
            treatmentLoading: 'مکمل علاجی منصوبہ تیار ہو رہا ہے...',
            resultModelOnline: 'آن لائن ماڈل',
            resultModelOffline: 'آف لائن ماڈل',
            back: 'ڈیش بورڈ پر واپس جائیں',
          }
        : {
            title: 'Disease Detection',
            subtitle: 'Take a photo or choose one from the gallery, then review the disease and treatment.',
            heroBadge: 'AI crop health assistant',
            heroTitle: 'Upload a clear leaf photo to get disease detection and a treatment plan.',
            cropChip: 'Selected crop',
            uploadTitle: 'Crop Image',
            uploadSub: 'Scan your crop image',
            uploadHint: 'Use daylight and keep the infected area centered',
            takePhoto: 'Take Photo',
            uploadGallery: 'Upload from Gallery',
            analyze: 'Analyze Crop',
            analyzeScroll: 'Analysis complete. Scroll down to view results.',
            resultTitle: 'Disease Detected',
            confidence: 'Confidence',
            treatmentTitle: 'Treatment & prevention guidance',
            treatmentE: 'Care Plan',
            treatmentLoading: 'Generating a complete treatment plan...',
            resultModelOnline: 'Online Model',
            resultModelOffline: 'Offline Model',
            back: 'Back to Dashboard',
          },
    [textLanguage]
  );

  const guidedSteps = useMemo(
    () => [
      {
        id: 'disease.header',
        text:
          textLanguage === 'urdu'
            ? 'بیماری کی تشخیص۔ تصویر لیں یا گیلری سے منتخب کریں، پھر بیماری اور علاج دیکھیں۔'
            : 'Disease detection. Take a photo or choose one from the gallery, then review the disease and treatment.',
      },
      {
        id: 'disease.hero',
        text:
          textLanguage === 'urdu'
            ? 'اے آئی فصل صحت مددگار۔ صاف پتوں کی تصویر اپلوڈ کریں۔'
            : 'AI crop health assistant. Upload a clear leaf photo.',
      },
      {
        id: 'disease.upload',
        text:
          textLanguage === 'urdu'
            ? 'فصل کی تصویر کا خانہ۔ فصل اسکین کرنے کے لیے تصویر اپلوڈ کریں۔'
            : 'Crop image box. Upload a photo to scan your crop.',
      },
      {
        id: 'disease.button.camera',
        text:
          textLanguage === 'urdu'
            ? 'تصویر لیں بٹن۔ کیمرے سے تصویر لیں۔'
            : 'Take Photo button. Open the camera and capture an image.',
      },
      {
        id: 'disease.button.gallery',
        text:
          textLanguage === 'urdu'
            ? 'گیلری سے اپلوڈ کریں بٹن۔ گیلری سے تصویر منتخب کریں۔'
            : 'Upload from Gallery button. Pick an image from your gallery.',
      },
      {
        id: 'disease.button.analyze',
        text:
          textLanguage === 'urdu'
            ? 'فصل تجزیہ کریں بٹن۔ بیماری کی تشخیص شروع کریں۔'
            : 'Analyze Crop button. Start disease detection.',
      },
    ],
    [textLanguage]
  );

  const resultGuidedSteps = useMemo(
    () =>
      result
        ? [
            {
              id: 'disease.result.model',
              text:
                textLanguage === 'urdu'
                  ? `ماڈل۔ ${result.model_type === 'online' ? 'آن لائن ماڈل' : 'آف لائن ماڈل'}۔`
                  : `Model. ${result.model_type === 'online' ? 'Online model' : 'Offline model'}.`,
            },
            {
              id: 'disease.result.title',
              text:
                textLanguage === 'urdu'
                  ? 'بیماری کی شناخت'
                  : 'Disease detected',
            },
            {
              id: 'disease.result.name',
              text:
                textLanguage === 'urdu'
                  ? `بیماری۔ ${String(result.disease).trim()}۔`
                  : `Disease. ${String(result.disease).trim()}.`,
            },
            {
              id: 'disease.result.confidence',
              text:
                textLanguage === 'urdu'
                  ? `اعتماد۔ ${Number(result.confidence) || 0} فیصد۔`
                  : `Confidence. ${Number(result.confidence) || 0} percent.`,
            },
          ]
        : [],
    [result, textLanguage]
  );

  const treatmentGuidedSteps = useMemo(
    () =>
      parsedTreatmentSections.flatMap((section, sectionIndex) => {
        const titleStep = {
          id: `disease.treatment.${sectionIndex}.title`,
          text:
            textLanguage === 'urdu'
              ? `${section.title}۔`
              : `${section.title}.`,
        };

        const itemSteps = section.items.map((item, itemIndex) => ({
          id: `disease.treatment.${sectionIndex}.item.${itemIndex}`,
          text:
            textLanguage === 'urdu'
              ? item
              : item,
        }));

        return [titleStep, ...itemSteps];
      }),
    [parsedTreatmentSections, textLanguage]
  );

  useFocusEffect(
    React.useCallback(() => {
      if (!voiceEnabled) return undefined;
      startGuidedSequence(guidedSteps);
      return () => {
        cancelGuidedSequence();
      };
    }, [cancelGuidedSequence, guidedSteps, startGuidedSequence, voiceEnabled])
  );

  useEffect(() => {
    if (!voiceEnabled || resultGuidedSteps.length === 0) return;
    startGuidedSequence(resultGuidedSteps);
  }, [resultGuidedSteps, startGuidedSequence, voiceEnabled]);

  useEffect(() => {
    if (!voiceEnabled || treatmentGuidedSteps.length === 0) return;
    startGuidedSequence(treatmentGuidedSteps);
  }, [startGuidedSequence, treatmentGuidedSteps, voiceEnabled]);

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
    setStatusText(tText.analyzeScroll);
    setLoading(true);

    try {
      console.log('🔍 Starting disease detection...');
      console.log('Image URI:', image);

      await performUpload(image);
      setStatusText(tText.analyzeScroll);
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

    const fileName = imageUri.split('/').pop() || 'leaf.jpg';
    const mimeType = guessMimeType(fileName);

    const buildFormData = async () => {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        let blob = await response.blob();
        if (!blob.type) {
          blob = new Blob([blob], { type: mimeType });
        }
        formData.append('file', blob, fileName);
      } else {
        formData.append('file', {
          uri: imageUri,
          name: fileName,
          type: mimeType,
        } as any);
      }

      formData.append('mobile_id', mobileId);
      if (selectedCrop) {
        formData.append('crop_name', selectedCrop);
      }

      return formData;
    };

    console.log('📤 Sending request to:', API_URL);
    let uploadResponse: Response;
    try {
      uploadResponse = await uploadOnce(await buildFormData());
    } catch (err) {
      if (!isTransientNetworkError(err)) throw err;
      console.warn('⚠️ Upload transient error, retrying once...');
      uploadResponse = await uploadOnce(await buildFormData());
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
    // automatically fetch treatment advice using the backend Gemini integration
    fetchTreatment(normalized.disease).catch((e) => console.warn('treatment fetch failed', e));
  };

  // Fetch treatment advice from backend (which calls Gemini)
  const fetchTreatment = async (diseaseName: string) => {
    setTreatmentLoading(true);
    setTreatment(null);
    try {
      const cropName = selectedCrop || 'the crop';
      
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
      <SpeechHighlight
        active={activeHighlightId === 'disease.header'}
        style={styles.headerHighlight}
        highlightStyle={styles.headerHighlightBorder}
      >
        <GreenHeader title={{ english: 'Disease Detection', urdu: 'فصل کی بیماری کی پہچان' }} onBack={() => router.back()} />
      </SpeechHighlight>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <SpeechHighlight
          active={activeHighlightId === 'disease.hero'}
          style={styles.heroHighlight}
          highlightStyle={styles.heroHighlightBorder}
        >
          <View style={styles.introBlock}>
            <Text style={styles.subtitle}>{tText.subtitle}</Text>
            <Text style={styles.subtitleUrdu}>{textLanguage === 'urdu' ? 'فصل کی بیماری کی پہچان کریں' : 'Disease detection for your crop'}</Text>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <Feather name="shield" size={14} color="#1f4d3f" />
              <Text style={styles.heroBadgeText}>{tText.heroBadge}</Text>
            </View>
            <Text style={styles.heroTitle}>{tText.heroTitle}</Text>
            {selectedCrop ? (
              <View style={styles.cropChip}>
                <Feather name="tag" size={13} color="#2f6f5f" />
                <Text style={styles.cropChipText}>{selectedCrop}</Text>
              </View>
            ) : null}
          </View>
        </SpeechHighlight>

        {/* Upload Box */}
        <SpeechHighlight
          active={activeHighlightId === 'disease.upload'}
          style={styles.uploadHighlight}
          highlightStyle={styles.uploadHighlightBorder}
        >
          <View style={styles.uploadBox}>
            {image ? (
              <Image source={{ uri: image }} style={styles.preview} />
            ) : (
              <>
                <Feather name="camera" size={40} color="#2f6f5f" />
                <Text style={styles.uploadText}>{tText.uploadTitle}</Text>
                <Text style={styles.uploadSub}>{tText.uploadSub}</Text>
                <Text style={styles.uploadHint}>{tText.uploadHint}</Text>
              </>
            )}
          </View>
        </SpeechHighlight>

        {/* Buttons */}
        <SpeechHighlight
          active={activeHighlightId === 'disease.button.camera'}
          style={styles.buttonHighlight}
          highlightStyle={styles.buttonHighlightBorder}
        >
          <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto} activeOpacity={0.9}>
            <Feather name="camera" size={18} color="#fff" />
            <Text style={styles.primaryText}> {tText.takePhoto}</Text>
          </TouchableOpacity>
        </SpeechHighlight>

        <SpeechHighlight
          active={activeHighlightId === 'disease.button.gallery'}
          style={styles.buttonHighlight}
          highlightStyle={styles.buttonHighlightBorder}
        >
          <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage} activeOpacity={0.9}>
            <Feather name="image" size={18} color="#2f6f5f" />
            <Text style={styles.secondaryText}> {tText.uploadGallery}</Text>
          </TouchableOpacity>
        </SpeechHighlight>

        {/* Detect */}
        {image && (
          <SpeechHighlight
            active={activeHighlightId === 'disease.button.analyze'}
            style={styles.buttonHighlight}
            highlightStyle={styles.buttonHighlightBorder}
          >
            <TouchableOpacity
              style={[styles.detectBtn, loading && styles.detectBtnDisabled]}
              onPress={detectDisease}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.detectText}>{tText.analyze}</Text>
              )}
            </TouchableOpacity>
          </SpeechHighlight>
        )}

        {statusText && <Text style={styles.statusText}>{statusText}</Text>}
        {errorText && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        )}

        {/* Result */}
        {result && (
          <SpeechHighlight
            active={String(activeHighlightId || '').startsWith('disease.result')}
            style={styles.resultHighlight}
            highlightStyle={styles.resultHighlightBorder}
          >
          <View style={styles.resultCard}>
            {/* Model Indicator */}
            <SpeechHighlight
              active={activeHighlightId === 'disease.result.model'}
              style={styles.resultLineHighlight}
              highlightStyle={styles.resultLineHighlightBorder}
            >
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
                {result.model_type === 'online' ? `🌐 ${tText.resultModelOnline}` : `📱 ${tText.resultModelOffline}`}
                </Text>
              </View>
            </SpeechHighlight>

            <SpeechHighlight
              active={activeHighlightId === 'disease.result.title'}
              style={styles.resultLineHighlight}
              highlightStyle={styles.resultLineHighlightBorder}
            >
              <Text style={styles.resultTitle}>🌱 {tText.resultTitle}</Text>
            </SpeechHighlight>

            <SpeechHighlight
              active={activeHighlightId === 'disease.result.name'}
              style={styles.resultLineHighlight}
              highlightStyle={styles.resultLineHighlightBorder}
            >
              <Text style={styles.resultText}>
                {String(result?.disease ?? '').trim() || 'Healthy'}
              </Text>
            </SpeechHighlight>

            <SpeechHighlight
              active={activeHighlightId === 'disease.result.confidence'}
              style={styles.resultLineHighlight}
              highlightStyle={styles.resultLineHighlightBorder}
            >
              <Text style={styles.confidence}>
                {tText.confidence}: {result.confidence}%
              </Text>
            </SpeechHighlight>

            <View style={styles.confidenceBarTrack}>
              <View
                style={[
                  styles.confidenceBarFill,
                  { width: `${Math.max(6, Math.min(100, Number(result.confidence) || 0))}%` },
                ]}
              />
            </View>

            <View style={styles.resultMetaRow}>
              <View style={styles.resultMetaCard}>
                <Text style={styles.resultMetaLabel}>Model</Text>
                <Text style={styles.resultMetaValue}>
                  {result.model_type === 'online' ? 'Online' : result.model_type === 'offline' ? 'Offline' : 'Unknown'}
                </Text>
              </View>
              <View style={styles.resultMetaCard}>
                <Text style={styles.resultMetaLabel}>Crop</Text>
                <Text style={styles.resultMetaValue}>{selectedCrop || 'General'}</Text>
              </View>
            </View>
          </View>
          </SpeechHighlight>
        )}

        {/* Treatment / Advice from Gemini (auto-fetched) */}
        {result && (
          <SpeechHighlight
            active={String(activeHighlightId || '').startsWith('disease.treatment')}
            style={styles.treatmentHighlight}
            highlightStyle={styles.treatmentHighlightBorder}
          >
          <View style={styles.treatmentCard}>
            <View style={styles.treatmentHeader}>
              <View>
                <Text style={styles.treatmentEyebrow}>{tText.treatmentE}</Text>
                <Text style={styles.treatmentTitle}>{tText.treatmentTitle}</Text>
              </View>
              <View style={styles.treatmentHeaderIcon}>
                <Feather name="activity" size={18} color="#1f4d3f" />
              </View>
            </View>

            {treatmentLoading && (
              <View style={styles.treatmentLoadingCard}>
                <ActivityIndicator color="#2f6f5f" />
                <Text style={styles.treatmentLoadingText}>{tText.treatmentLoading}</Text>
              </View>
            )}

            {treatment && (
              <View style={styles.treatmentOutput}>
                {parsedTreatmentSections.map((section, idx) => (
                  <SpeechHighlight
                    key={idx}
                    active={String(activeHighlightId || '').startsWith(`disease.treatment.${idx}`)}
                    style={styles.treatmentSectionHighlightWrap}
                    highlightStyle={section.tone === 'warning' ? styles.treatmentSectionWarningHighlight : styles.treatmentSectionHighlightBorder}
                  >
                    <View
                      style={[
                        styles.treatmentSection,
                        section.tone === 'highlight' ? styles.treatmentSectionHighlight : null,
                        section.tone === 'warning' ? styles.treatmentSectionWarning : null,
                      ]}
                    >
                      <SpeechHighlight
                        active={activeHighlightId === `disease.treatment.${idx}.title`}
                        style={styles.treatmentLineHighlight}
                        highlightStyle={styles.treatmentLineHighlightBorder}
                      >
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                      </SpeechHighlight>
                      {section.items.map((item, itemIdx) => (
                        <SpeechHighlight
                          key={itemIdx}
                          active={activeHighlightId === `disease.treatment.${idx}.item.${itemIdx}`}
                          style={styles.treatmentLineHighlight}
                          highlightStyle={section.tone === 'warning' ? styles.treatmentLineWarningBorder : styles.treatmentLineHighlightBorder}
                        >
                          <View style={styles.treatmentItemContainer}>
                          {/^\d+\./.test(item) ? (
                            <Text style={styles.bulletText}>{item}</Text>
                          ) : section.tone === 'highlight' ? (
                            <Text style={styles.highlightedText}>{item}</Text>
                          ) : (
                            <Text style={styles.bulletText}>{"• " + item.replace(/^[•-]\s*/, '')}</Text>
                          )}
                          </View>
                        </SpeechHighlight>
                      ))}
                    </View>
                  </SpeechHighlight>
                ))}
              </View>
            )}
          </View>
          </SpeechHighlight>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {result && (
            <SpeechHighlight
              active={activeHighlightId === 'disease.button.back'}
              style={styles.buttonHighlight}
              highlightStyle={styles.buttonHighlightBorder}
            >
              <TouchableOpacity 
                style={styles.backBtn}
                onPress={() => router.back()}
              >
                <Text style={styles.backBtnText}>← {tText.back}</Text>
              </TouchableOpacity>
            </SpeechHighlight>
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
  headerHighlight: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  headerHighlightBorder: {
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  introBlock: {
    marginBottom: 12,
    alignItems: 'center',
  },
  heroHighlight: {
    marginBottom: 16,
  },
  heroHighlightBorder: {
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#2f6f5f',
  },
  heroCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#dff1e8',
    borderWidth: 1,
    borderColor: '#c9e6d8',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f7fffb',
    borderRadius: 999,
    marginBottom: 10,
  },
  heroBadgeText: {
    color: '#1f4d3f',
    fontWeight: '700',
    fontSize: 12,
  },
  heroTitle: {
    color: '#173f33',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
  },
  cropChip: {
    alignSelf: 'flex-start',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f5fbf8',
    borderWidth: 1,
    borderColor: '#bfdccc',
  },
  cropChipText: {
    color: '#2f6f5f',
    fontWeight: '700',
    fontSize: 12,
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
  uploadHighlight: {
    marginBottom: 16,
  },
  uploadHighlightBorder: {
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#2f6f5f',
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
  uploadHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#557f71',
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
  buttonHighlight: {
    marginBottom: 10,
  },
  buttonHighlightBorder: {
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#2f6f5f',
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
  resultHighlight: {
    marginTop: 20,
  },
  resultHighlightBorder: {
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#2f6f5f',
  },
  resultLineHighlight: {
    marginBottom: 10,
  },
  resultLineHighlightBorder: {
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2f6f5f',
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
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  confidenceBarTrack: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: '#d9eee4',
    marginTop: 12,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2f6f5f',
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
  resultMetaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  resultMetaCard: {
    flex: 1,
    backgroundColor: '#f8fffb',
    borderWidth: 1,
    borderColor: '#d2efe3',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  resultMetaLabel: {
    color: '#5b7f73',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  resultMetaValue: {
    marginTop: 4,
    color: '#173f33',
    fontWeight: '800',
    fontSize: 13,
  },
  footer: {
    marginTop: 30,
    backgroundColor: 'transparent',
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
    marginTop: 16,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dcece3',
    shadowColor: '#0d5c4b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  treatmentHighlight: {
    marginTop: 16,
  },
  treatmentHighlightBorder: {
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#1f4d3f',
  },
  treatmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  treatmentEyebrow: {
    color: '#5c8174',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  treatmentHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#edf8f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  treatmentTitle: {
    fontWeight: '800',
    color: '#184e3f',
    fontSize: 17,
  },
  treatmentOutput: {
    backgroundColor: '#f8fcfa',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e3f0e8',
  },
  treatmentLoadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f6fbf8',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e4efe8',
  },
  treatmentLoadingText: {
    flex: 1,
    color: '#355f53',
    fontSize: 13,
    fontWeight: '600',
  },
  treatmentText: {
    color: '#163f33',
    lineHeight: 20,
  },
  treatmentSection: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5efe8',
  },
  treatmentSectionHighlightWrap: {
    marginBottom: 12,
  },
  treatmentSectionHighlightBorder: {
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#cfe8d5',
  },
  treatmentSectionWarningHighlight: {
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#f3dfba',
  },
  treatmentLineHighlight: {
    marginBottom: 8,
  },
  treatmentLineHighlightBorder: {
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cfe8d5',
  },
  treatmentLineWarningBorder: {
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#f3dfba',
  },
  treatmentSectionHighlight: {
    backgroundColor: '#f1fbf4',
    borderColor: '#cfe8d5',
  },
  treatmentSectionWarning: {
    backgroundColor: '#fff9f1',
    borderColor: '#f3dfba',
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 15,
    color: '#1f4d3f',
    marginBottom: 8,
  },
  treatmentItemContainer: {
    marginBottom: 8,
  },
  bulletText: {
    fontSize: 13,
    color: '#244d42',
    lineHeight: 20,
    fontWeight: '500',
  },
  highlightedText: {
    fontSize: 13,
    color: '#11653e',
    lineHeight: 20,
    fontWeight: '700',
    backgroundColor: '#e8f5e9',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
});
