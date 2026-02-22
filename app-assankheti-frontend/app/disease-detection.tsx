import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import GreenHeader from '@/components/GreenHeader';
import { useRouter } from 'expo-router';

const API_URL = "http://192.168.1.25:8000/api/v1/disease/predict_disease";

export default function DiseaseDetection() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
    if (!image) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', {
      uri: image,
      name: 'leaf.jpg',
      type: 'image/jpeg',
    } as any);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = await response.json();
      setResult(data);
    } catch (e) {
      Alert.alert('Error', 'Disease detection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <GreenHeader title={{ english: 'Crop Disease Detection', urdu: 'فصل کی بیماری کی پہچان' }} onBack={() => router.back()} />

      <Text style={styles.subtitle}>فصل کی بیماری کی پہچان کریں</Text>

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
      <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto}>
        <Feather name="camera" size={18} color="#fff" />
        <Text style={styles.primaryText}> Take Photo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
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
          <Text style={styles.resultTitle}>🌱 Disease Detected</Text>

          <Text style={styles.resultText}>
            {String(result.disease)}
          </Text>


          <Text style={styles.confidence}>
            Confidence: {(result.confidence * 100).toFixed(2)}%
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
      </View>
    </View>
  );
}

/* 🎨 STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f6faf7',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1f4d3f',
  },
  subtitle: {
    textAlign: 'center',
    color: '#4b7c6d',
    marginBottom: 20,
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
  },
  uploadText: {
    marginTop: 10,
    fontWeight: '600',
    color: '#2f6f5f',
  },
  uploadSub: {
    fontSize: 12,
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
    padding: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#2f6f5f',
    padding: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryText: {
    color: '#2f6f5f',
    fontWeight: '600',
    marginLeft: 6,
  },
  detectBtn: {
    backgroundColor: '#1f4d3f',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  detectText: {
    color: '#fff',
    fontWeight: '700',
  },
  resultCard: {
    marginTop: 20,
    backgroundColor: '#e9f5ef',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  resultTitle: {
    fontWeight: '700',
    color: '#1f4d3f',
    marginBottom: 6,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f4d3f',   // 👈 IMPORTANT
  },

  confidence: {
    color: '#4b7c6d',
    marginTop: 4,
  },
  footer: {
    marginTop: 'auto',
    backgroundColor: '#eaf4ef',
    padding: 12,
    borderRadius: 12,
  },
  footerText: {
    fontWeight: '600',
    color: '#1f4d3f',
  },
  footerSub: {
    fontSize: 12,
    color: '#4b7c6d',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  backButtonInline: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(31,77,63,0.08)' },
});
