import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage, useT } from '@/contexts/LanguageContext';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ProfileForm = {
  name: string;
  phone: string;
  location: string;
  farmSize: string;
  crop: string;
  imageUri: string | null;
};

const STORAGE_KEY = 'farmer.profile';

export default function FarmerProfileEditPage() {
  const router = useRouter();
  const { textLanguage } = useLanguage();
  const t = useT();
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const defaultForm = useMemo<ProfileForm>(
    () => ({
      name: 'Muhammad Ahmad',
      phone: '+92 300 1234567',
      location: 'Punjab, Pakistan',
      farmSize: '5 Acres',
      crop: 'Rice',
      imageUri: null,
    }),
    []
  );

  const [form, setForm] = useState<ProfileForm>(defaultForm);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<ProfileForm>;
        if (cancelled) return;
        setForm((prev) => ({ ...prev, ...parsed }));
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [defaultForm]);

  const pickImage = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      setForm((prev) => ({ ...prev, imageUri: uri }));
    } catch {
      // ignore
    }
  }, []);

  const save = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // ignore
    }
    router.back();
  }, [form, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <LinearGradient
            colors={['#0d5c4b', '#10b981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, { paddingHorizontal: horizontalPadding }]}
          >
            <View style={[styles.headerRow, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', justifyContent: 'space-between' }]}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.headerTitle}>{t({ english: 'Edit Profile', urdu: 'پروفائل میں ترمیم' })}</Text>
              </View>

              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.9}
                style={styles.backBtn}
                accessibilityRole="button"
                accessibilityLabel={t({ english: 'Back', urdu: 'واپس' })}
              >
                <Feather name="arrow-left" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
            {/* Profile Picture */}
            <View style={{ paddingHorizontal: horizontalPadding, marginTop: 4, alignItems: 'center' }}>
              <View style={{ maxWidth: contentMaxWidth, width: '100%', alignItems: 'center' }}>
                <View style={{ position: 'relative' }}>
                  <View style={styles.avatarWrap}>
                    {form.imageUri ? (
                      <View style={styles.avatarImage}>
                        {/* react-native <Image> adds a lot of layout variance; use expo-image? keep RN Image to avoid new deps */}
                      </View>
                    ) : (
                      <Feather name="user" size={44} color="#9ca3af" />
                    )}
                  </View>

                  {/* If we have an image, show it using an absolutely positioned Image for better cover */}
                  {form.imageUri ? (
                    // eslint-disable-next-line react-native/no-inline-styles
                    <ImageCover uri={form.imageUri} size={112} />
                  ) : null}

                  <TouchableOpacity activeOpacity={0.9} onPress={pickImage} style={styles.cameraFab}>
                    <Feather name="camera" size={18} color="#0d5c4b" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Form */}
            <View style={{ paddingHorizontal: horizontalPadding, marginTop: 18 }}>
              <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
                <Field
                  label="Full Name"
                  labelUrdu="پورا نام"
                  icon="user"
                  value={form.name}
                  placeholder={t({ english: 'Enter your name', urdu: 'اپنا نام درج کریں' })}
                  onChangeText={(name) => setForm((p) => ({ ...p, name }))}
                />

                <Field
                  label="Phone Number"
                  labelUrdu="فون نمبر"
                  icon="phone"
                  value={form.phone}
                  placeholder="+92 XXX XXXXXXX"
                  keyboardType="phone-pad"
                  onChangeText={(phone) => setForm((p) => ({ ...p, phone }))}
                />

                <Field
                  label="Farm Location"
                  labelUrdu="فارم کا مقام"
                  icon="map-pin"
                  value={form.location}
                  placeholder={t({ english: 'City, Province', urdu: 'شہر، صوبہ' })}
                  onChangeText={(location) => setForm((p) => ({ ...p, location }))}
                />

                <Field
                  label="Farm Size"
                  labelUrdu="فارم کا سائز"
                  icon="map-pin"
                  value={form.farmSize}
                  placeholder={t({ english: 'e.g., 5 Acres', urdu: 'مثال: 5 ایکڑ' })}
                  onChangeText={(farmSize) => setForm((p) => ({ ...p, farmSize }))}
                />

                <Field
                  label="Primary Crop"
                  labelUrdu="بنیادی فصل"
                  icon="sun"
                  value={form.crop}
                  placeholder={t({ english: 'e.g., Rice, Wheat', urdu: 'مثال: چاول، گندم' })}
                  onChangeText={(crop) => setForm((p) => ({ ...p, crop }))}
                />

                <TouchableOpacity activeOpacity={0.9} onPress={save} style={styles.saveBtn}>
                  <Feather name="save" size={18} color="#ffffff" />
                  <Text style={styles.saveText}>{t({ english: 'Save Changes', urdu: 'تبدیلیاں محفوظ کریں' })}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  labelUrdu,
  icon,
  value,
  placeholder,
  onChangeText,
  keyboardType,
}: {
  label: string;
  labelUrdu: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  value: string;
  placeholder: string;
  onChangeText: (v: string) => void;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
}) {
  const { textLanguage } = useLanguage();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>
        {textLanguage === 'urdu' ? labelUrdu : label}
      </Text>

      <View style={styles.inputWrap}>
        <Feather name={icon as any} size={18} color="#9ca3af" style={{ marginLeft: 14 }} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType={keyboardType}
          style={styles.input}
        />
      </View>
    </View>
  );
}

function ImageCover({ uri, size }: { uri: string; size: number }) {
  // Lazy import to keep top imports minimal and avoid unused when no image.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Image } = require('react-native');
  return (
    <Image
      source={{ uri }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
      }}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 18,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.75)', marginTop: 2, fontSize: 13 },

  avatarWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 3,
  },
  avatarImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cameraFab: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.12)',
  },

  fieldLabel: { fontWeight: '800', color: '#111827', marginBottom: 8, fontSize: 13 },
  fieldLabelMuted: { color: '#6b7280', fontWeight: '600' },
  inputWrap: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, height: 48, paddingRight: 14, fontSize: 14, color: '#111827' },

  saveBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0d5c4b',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  saveText: { color: '#ffffff', fontWeight: '900' },
});
