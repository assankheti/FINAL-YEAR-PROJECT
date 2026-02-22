import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Language = 'urdu' | 'english';

export function LanguageSelection({
  onComplete,
}: {
  onComplete?: (sel: { textLanguage: Language; voiceLanguage: Language }) => void;
}) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);

  const { width, height } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const logoSize = Math.min(Math.round(width * 0.7), 200);
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);
  const isSmallHeight = height < 700;

  // ---------------- COPY ----------------
  const copy = useMemo(
    () => ({
      title: { english: 'Choose Your Language', urdu: 'اپنی زبان منتخب کریں' },
      phoneHint: { english: 'Language & Voice', urdu: 'زبان اور آواز' },
      voiceEnglish: { english: 'Voice assistance in English', urdu: 'انگریزی میں آواز کی مدد' },
      voiceUrdu: { english: 'Voice assistance in Urdu', urdu: 'اردو میں آواز کی مدد' },
      infoTitle: { english: 'Voice Assistance Included', urdu: 'آواز کی مدد شامل ہے' },
      infoDesc: {
        english: 'Your selected language will also be used for voice assistance throughout the app',
        urdu: 'آپ کی منتخب زبان پوری ایپ میں آواز کی مدد کے لیے بھی استعمال ہوگی',
      },
      continue: { english: 'Continue', urdu: 'جاری رکھیں' },
    }),
    []
  );

  // ---------------- TRANSLATION HELPER ----------------
  const t = (obj: { english: string; urdu: string }) =>
    obj[selectedLanguage ?? 'english'];

  const handleContinue = () => {
    if (!selectedLanguage) return;
    onComplete?.({ textLanguage: selectedLanguage, voiceLanguage: selectedLanguage });
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient
        colors={['#e8f5e9', '#f5f1e8', '#fff8e1']}
        style={styles.container}
      >
        <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
          {/* HEADER */}
          <View style={styles.header}>
            <Image
              source={require('../assets/images/logo-removebg.png')}
              style={{ width: logoSize, height: logoSize }}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>ASSAN KHETI</Text>
          </View>

          {/* TITLE */}
          <View style={styles.titleBlock}>
            <Text style={selectedLanguage === 'urdu' ? styles.urduTitle : styles.title}>{t(copy.title)}</Text>
          </View>

          {/* CONTENT */}
          <ScrollView
            contentContainerStyle={{ paddingBottom: isSmallHeight ? 110 : 130 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ maxWidth: contentMaxWidth, width: '100%' }}>
              {/* ENGLISH OPTION */}
              <LanguageOption
                selected={selectedLanguage === 'english'}
                onPress={() => setSelectedLanguage('english')}
                title="English"
                subtitle={copy.phoneHint.english}
                activeColor="green"
              >
                <Text style={[styles.voiceText, { color: '#10b981' }]}>
                  {t(copy.voiceEnglish)}
                </Text>
              </LanguageOption>

              {/* URDU OPTION */}
              <LanguageOption
                selected={selectedLanguage === 'urdu'}
                onPress={() => setSelectedLanguage('urdu')}
                title="اردو"
                subtitle={copy.phoneHint.urdu}
                activeColor="sunrise"
              >
                <Text style={[styles.voiceText, { color: '#f59e0b' }]}>
                  {t(copy.voiceUrdu)}
                </Text>
              </LanguageOption>

              {/* INFO CARD (FIXED) */}
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Feather name="volume-2" size={18} color="#10b981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoTitle}>{t(copy.infoTitle)}</Text>
                    <Text style={styles.infoDesc}>{t(copy.infoDesc)}</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* CONTINUE */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              disabled={!selectedLanguage}
              onPress={handleContinue}
              style={[
                styles.continueBtn,
                !selectedLanguage && { opacity: 0.55 },
                selectedLanguage === 'urdu'
                  ? styles.continueBtnSunrise
                  : styles.continueBtnForest,
              ]}
            >
              <Text style={styles.continueText}>{t(copy.continue)}</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ---------------- OPTION COMPONENT ----------------
function LanguageOption({
  selected,
  onPress,
  title,
  subtitle,
  children,
  activeColor,
}: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.option,
        selected &&
          (activeColor === 'green'
            ? styles.optionSelectedGreen
            : styles.optionSelectedSunrise),
      ]}
    >
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.optionSub}>{subtitle}</Text>
      {selected && <View style={styles.optionExtra}>{children}</View>}
    </TouchableOpacity>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  header: { alignItems: 'center' },
  headerTitle: { marginTop: -75, fontSize: 20, fontWeight: '900', color: '#0d5c4b' },

  titleBlock: { alignItems: 'center', marginVertical: 70 },
  title: { fontSize: 22, fontWeight: '900', color: '#0d5c4b' },
  urduTitle: { fontSize: 22, fontWeight: '900', color: '#10b981', marginTop: 10 ,marginBottom : -40 },

  option: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 14,
  },
  optionSelectedGreen: { borderColor: '#0d5c4b' },
  optionSelectedSunrise: { borderColor: '#f59e0b' },

  optionTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  optionSub: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  optionExtra: { marginTop: 10 },

  voiceText: { fontWeight: '800' },

  infoCard: { marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: '#fff' },
  infoRow: { flexDirection: 'row', gap: 10 },
  infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' },
  infoTitle: { fontWeight: '900', color: '#111827' },
  infoDesc: { fontSize: 12, color: '#6b7280', marginTop: 6 },

  bottomBar: { paddingBottom: Platform.OS === 'ios' ? 18 : 12 },
  continueBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  continueBtnForest: { backgroundColor: '#0d5c4b' },
  continueBtnSunrise: { backgroundColor: '#f59e0b' },
  continueText: { color: '#fff', fontWeight: '900' },
});