import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity } from 'react-native';

import { useT } from '@/contexts/LanguageContext';
import { SESSION_EXPIRED_ERROR, uploadImage } from '@/lib/uploadImage';

type Props = {
  onUploaded: (url: string) => void;
  disabled?: boolean;
};

export default function ImagePickerButton({ onUploaded, disabled }: Props) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handlePress = async () => {
    if (busy || disabled) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          t({ english: 'Permission required', urdu: 'اجازت درکار' }),
          t({
            english: 'Please allow photo library access to share an image.',
            urdu: 'تصویر بھیجنے کے لیے گیلری کی اجازت دیں۔',
          })
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setBusy(true);
      const url = await uploadImage(asset.uri);
      onUploaded(url);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.warn('[ImagePickerButton] failed', msg);
      if (msg === SESSION_EXPIRED_ERROR) {
        Alert.alert(
          t({ english: 'Session expired', urdu: 'سیشن ختم ہو گیا' }),
          t({
            english: 'Please log in again to continue.',
            urdu: 'جاری رکھنے کے لیے دوبارہ لاگ ان کریں۔',
          }),
          [
            {
              text: t({ english: 'Log in', urdu: 'لاگ ان' }),
              onPress: () => router.replace('/login'),
            },
          ]
        );
        return;
      }
      Alert.alert(
        t({ english: 'Upload failed', urdu: 'اپ لوڈ ناکام' }),
        msg || t({ english: 'Please try again.', urdu: 'دوبارہ کوشش کریں۔' })
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.btn, disabled && styles.disabled]}
      onPress={handlePress}
      disabled={busy || disabled}
      accessibilityRole="button"
      accessibilityLabel={t({ english: 'Attach photo', urdu: 'تصویر منسلک کریں' })}
    >
      {busy ? (
        <ActivityIndicator size="small" color="#0d5c4b" />
      ) : (
        <Feather name="image" size={20} color="#0d5c4b" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
});
