import { Feather } from '@expo/vector-icons';
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

// Urdu font detection - best Urdu fonts by platform
const getUrduFont = (weight: string = '400') => {
  if (Platform.OS === 'ios') {
    return 'Noto Naskh Arabic'; // Best Urdu support on iOS
  }
  return 'Roboto'; // Android handles Urdu well with Roboto
};

const isUrduText = (text: string): boolean => {
  return /[\u0600-\u06FF]/.test(text);
};

export function LanguageSelection({
  onComplete,
}: {
  onComplete?: (sel: { textLanguage: Language; voiceLanguage: Language }) => void;
}) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);

  const { width, height } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const logoSize = Math.min(Math.round(width * 0.6), 160);
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 540);
  const isSmallHeight = height < 700;

  // Copy & Translations
  const copy = useMemo(
    () => ({
      title: { english: 'Select Your Language', urdu: 'اپنی زبان منتخب کریں' },
      subtitle: {
        english: 'Customize your experience with your preferred language',
        urdu: 'اپنی پسندیدہ زبان کے ساتھ اپنا تجربہ حسب ضرورت بنائیں',
      },
      english: { english: 'English', urdu: 'انگریزی' },
      urdu: { english: 'Urdu', urdu: 'اردو' },
      englishDesc: {
        english: 'Interface & voice assistance in English',
        urdu: 'انگریزی میں انٹرفیس اور آواز کی مدد',
      },
      urduDesc: {
        english: 'Interface & voice assistance in Urdu',
        urdu: 'اردو میں انٹرفیس اور آواز کی مدد',
      },
      infoTitle: { english: 'Full Language Support', urdu: 'مکمل زبان کی معاونت' },
      infoDesc: {
        english: 'Your selection will apply to the entire app including text and voice features',
        urdu: 'آپ کا انتخاب پوری ایپ میں متن اور آواز کی خصوصیات پر لاگو ہوگا',
      },
      continue: { english: 'Continue', urdu: 'جاری رکھیں' },
    }),
    []
  );

  const t = (obj: { english: string; urdu: string }) =>
    obj[selectedLanguage ?? 'english'];

  const handleContinue = () => {
    if (!selectedLanguage) return;
    onComplete?.({ textLanguage: selectedLanguage, voiceLanguage: selectedLanguage });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <LinearGradient
        colors={['#e8f5e9', '#f5f1e8', '#fff8e1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/images/logo-removebg.png')}
                style={{ width: logoSize, height: logoSize }}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandTitle}>ASSAN KHETI</Text>
            <Text style={[styles.headerSubtitle, isUrduText(t(copy.subtitle)) && { fontFamily: getUrduFont() }]}>
              {t(copy.subtitle)}
            </Text>
          </View>

          {/* CONTENT */}
          <ScrollView
            contentContainerStyle={{ paddingBottom: isSmallHeight ? 120 : 140 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }}>
              {/* TITLE */}
              <View style={styles.titleBlock}>
                <Text
                  style={[
                    styles.title,
                    selectedLanguage === 'urdu' && styles.titleUrdu,
                    isUrduText(t(copy.title)) && { fontFamily: getUrduFont('900') },
                  ]}
                >
                  {t(copy.title)}
                </Text>
              </View>

              {/* ENGLISH OPTION */}
              <LanguageCard
                selected={selectedLanguage === 'english'}
                onPress={() => setSelectedLanguage('english')}
                language="English"
                languageUrdu="انگریزی"
                description={t(copy.englishDesc)}
                icon="globe"
                accentColor="#10b981"
              />

              {/* URDU OPTION */}
              <LanguageCard
                selected={selectedLanguage === 'urdu'}
                onPress={() => setSelectedLanguage('urdu')}
                language="اردو"
                languageUrdu="Urdu"
                description={t(copy.urduDesc)}
                icon="book-open"
                accentColor="#f59e0b"
              />

              {/* INFO CARD */}
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <View style={styles.infoIconBox}>
                    <Feather name="info" size={20} color="#ffffff" />
                  </View>
                  <Text style={[styles.infoTitle, isUrduText(t(copy.infoTitle)) && { fontFamily: getUrduFont('800') }]}>
                    {t(copy.infoTitle)}
                  </Text>
                </View>
                <Text style={[styles.infoDesc, isUrduText(t(copy.infoDesc)) && { fontFamily: getUrduFont() }]}>
                  {t(copy.infoDesc)}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* CONTINUE BUTTON */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              disabled={!selectedLanguage}
              onPress={handleContinue}
              style={[
                styles.continueBtn,
                !selectedLanguage && styles.continueBtnDisabled,
              ]}
              accessible={true}
              accessibilityRole="button"
              accessibilityState={{ disabled: !selectedLanguage }}
              accessibilityLabel={
                selectedLanguage
                  ? `Continue with ${selectedLanguage}`
                  : 'Select a language first'
              }
            >
              <Text style={styles.continueText}>{t(copy.continue)}</Text>
              {selectedLanguage && (
                <Feather name="arrow-right" size={18} color="#0d5c4b" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

  // Language Card Component
function LanguageCard({
  selected,
  onPress,
  language,
  languageUrdu,
  description,
  icon,
  accentColor,
}: {
  selected: boolean;
  onPress: () => void;
  language: string;
  languageUrdu: string;
  description: string;
  icon: 'globe' | 'book-open';
  accentColor: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.languageCard,
        selected && [styles.languageCardSelected, { borderColor: accentColor }],
      ]}
      accessible={true}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`Select ${languageUrdu}`}
      activeOpacity={0.75}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <View
            style={[
              styles.cardIconBox,
              selected && { backgroundColor: accentColor, borderWidth: 0 },
            ]}
          >
            <Feather
              name={icon}
              size={24}
              color={selected ? '#ffffff' : accentColor}
              strokeWidth={1.5}
            />
          </View>
        </View>
        <View style={styles.cardMiddle}>
          <Text style={styles.cardTitle}>{language}</Text>
          <Text style={[styles.cardSubtitle, isUrduText(languageUrdu) && { fontFamily: getUrduFont() }]}>
            {languageUrdu}
          </Text>
          <Text style={[styles.cardDescription, isUrduText(description) && { fontFamily: getUrduFont() }]}>
            {description}
          </Text>
        </View>
        {selected && (
          <View style={[styles.checkMark, { backgroundColor: accentColor }]}>
            <Feather name="check" size={18} color="#ffffff" strokeWidth={2.5} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between' },
  
  // Header section
  header: { alignItems: 'center', paddingTop: 40 },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0d5c4b',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 6,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    lineHeight: 22,
    letterSpacing: 0.3,
  },

  // Title block
  titleBlock: { alignItems: 'center', marginVertical: 28, marginBottom: 36 },
  title: { 
    fontSize: 26, 
    fontWeight: '900', 
    color: '#0d5c4b', 
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    letterSpacing: 0.4,
    lineHeight: 32,
  },
  titleUrdu: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: '#f59e0b', 
    marginTop: 0, 
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },

  // Language cards
  languageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.09,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  languageCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f7fdf8',
    borderWidth: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  cardLeft: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconBox: {
    width: 52,
    height: 52,
    borderRadius: 13,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  cardMiddle: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginBottom: 6,
  },
  checkMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDescription: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6b7280',
    marginTop: 10,
    lineHeight: 17,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    letterSpacing: 0.2,
  },

  // Info card
  infoCard: {
    marginTop: 28,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderLeftWidth: 3.5,
    borderLeftColor: '#0d5c4b',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    flex: 1,
  },
  infoDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6b7280',
    lineHeight: 19,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginLeft: 48,
    letterSpacing: 0.2,
  },

  // Bottom section
  bottomBar: { 
    paddingBottom: Platform.OS === 'ios' ? 30 : 22,
    gap: 12,
  },
  continueBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.11,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  continueBtnDisabled: {
    opacity: 0.55,
  },
  continueText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0d5c4b',
    letterSpacing: 0.6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});