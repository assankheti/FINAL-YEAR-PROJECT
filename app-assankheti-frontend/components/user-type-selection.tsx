import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

type UserType = 'farmer' | 'simple-user' | 'businessman';

export function UserTypeSelection({ onSelectUserType, textLanguage = 'english' }: { onSelectUserType: (t: UserType) => void; textLanguage?: 'urdu' | 'english' }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const containerAnim = useRef(new Animated.Value(0)).current;
  const [selectedType, setSelectedType] = useState<UserType | null>(null);

  const cardAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    containerAnim.setValue(0);
    cardAnims.forEach((a) => a.setValue(0));

    Animated.timing(containerAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();

    Animated.stagger(
      90,
      cardAnims.map((a) =>
        Animated.timing(a, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [containerAnim, cardAnims]);

  const language: 'urdu' | 'english' =
    (typeof textLanguage === 'string' ? textLanguage.toLowerCase() : 'english') === 'urdu' ? 'urdu' : 'english';

  const t = (obj: any) => obj?.[language];

  const translations = useMemo(
    () =>
      ({
        who: { urdu: 'آپ کون ہیں؟', english: 'Who are you?' },
        whoHint: { urdu: 'اپنا کردار منتخب کریں', english: 'Select your role' },
        continueAs: { urdu: 'جاری رکھیں', english: 'Continue as' },
      }) as const,
    []
  );

  const userTypes = useMemo(
    () =>
      [
        {
          id: 'farmer' as const,
          title: { urdu: 'کسان', english: 'Farmer' },
          description: {
            urdu: 'سمارٹ فارمنگ ٹولز کے ساتھ اپنی فصل اگائیں اور بیچیں',
            english: 'Grow & sell your crops with smart farming tools',
          },
          icon: <MaterialCommunityIcons name="account-cowboy-hat" size={22} color="#ffffff" />,
          iconBg: ['#f59e0b', '#10b981', '#06b6d4'] as const,
        },
        {
          id: 'simple-user' as const,
          title: { urdu: 'عام صارف', english: 'Simple User' },
          description: {
            urdu: 'کسانوں سے براہِ راست تازہ فارم پروڈکٹس خریدیں',
            english: 'Buy fresh farm products directly from farmers',
          },
          icon: <MaterialCommunityIcons name="account-tie" size={22} color="#ffffff" />,
          iconBg: ['#10b981', '#06b6d4'] as const,
        },
        {
          id: 'businessman' as const,
          title: { urdu: 'تاجر', english: 'Businessman' },
          description: {
            urdu: 'تھوک خریداری کے لیے کسانوں سے رابطہ کریں',
            english: 'Connect with farmers for bulk purchases',
          },
          icon: <MaterialCommunityIcons name="briefcase" size={22} color="#ffffff" />,
          iconBg: ['#0d5c4b', '#10b981'] as const,
        },
      ],
    []
  );

  const contentMaxWidth = Math.min(420, width);

  const handleContinue = () => {
    if (!selectedType) return;
    onSelectUserType(selectedType);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.screen}>
        {/* Header */}
        <LinearGradient
          colors={['#0d5c4b', '#10b981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <Animated.View style={{ opacity: containerAnim }}>

            <View style={styles.headerCopy}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {t(translations.who)}
                </Text>

                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => router.push('/language-selection')}
                  style={styles.headerBackButtonInline}
                >
                  <Feather name="arrow-left" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <Text style={styles.headerHint}>{t(translations.whoHint)}</Text>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Cards */}
        <View style={[styles.content, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
          <View style={{ gap: 12 }}>
            {userTypes.map((type, index) => {
              const isSelected = selectedType === type.id;
              const anim = cardAnims[index] ?? containerAnim;

              return (
                <Animated.View
                  key={type.id}
                  style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}
                >
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setSelectedType(type.id)}
                    style={[styles.card, isSelected ? styles.cardSelected : styles.cardUnselected]}
                  >
                    <View style={styles.cardRow}>
                      <LinearGradient colors={[type.iconBg[0], type.iconBg[1]]} style={styles.iconBox}>
                        {type.icon}
                      </LinearGradient>

                      <View style={{ flex: 1 }}>
                        <View style={styles.cardTopRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>{t(type.title)}</Text>
                          </View>

                          <View style={[styles.radioOuter, isSelected ? styles.radioOuterSelected : null]}>
                            {isSelected ? <View style={styles.radioInner} /> : null}
                          </View>
                        </View>

                        <Text style={styles.cardDesc}>{t(type.description)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Bottom button */}
        <View style={[styles.bottomBar, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleContinue}
            disabled={!selectedType}
            style={[styles.primaryBtn, !selectedType ? styles.primaryBtnDisabled : null]}
          >
            <View style={styles.primaryBtnRow}>
              <Text style={styles.primaryBtnText}>
                {t(translations.continueAs)} {selectedType ? t(userTypes.find((u) => u.id === selectedType)!.title) : '...'}
              </Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color="#ffffff" style={{ marginLeft: 10 }} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f1e8' },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 26,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  logoImg: { width: 40, height: 40 },
  headerCopy: { marginTop: 0 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800', flex: 1, textAlign: 'left', marginRight: 12 },
  headerUrdu: { color: '#ffffff', marginTop: 4, fontSize: 24, fontWeight: '800' },
  headerHint: { color: 'rgba(255, 255, 255, 1)', marginTop: 14, fontSize: 18, textAlign: 'center' },

  headerBackButtonInline: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12, marginTop: -14 },

  card: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 2,
    padding: 16,
    backgroundColor: '#ffffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardSelected: { borderColor: '#0d5c4b' },
  cardUnselected: { borderColor: '#e5e7eb' },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardTitle: { color: '#111827', fontSize: 16, fontWeight: '900' },
  cardUrdu: { color: '#10b981', marginTop: 2, fontWeight: '700' },
  cardDesc: { color: '#6b7280', marginTop: 8 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginTop: 2,
  },
  radioOuterSelected: { borderColor: '#0d5c4b', backgroundColor: '#0d5c4b' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipSelected: { backgroundColor: 'rgba(13,92,75,0.10)' },
  chipUnselected: { backgroundColor: '#f3f4f6' },
  chipText: { fontSize: 11, fontWeight: '700' },
  chipTextSelected: { color: '#0d5c4b' },
  chipTextUnselected: { color: '#6b7280' },

  infoBox: { marginTop: 4, padding: 14, borderRadius: 16, backgroundColor: 'rgba(16,185,129,0.10)' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stackIcons: { flexDirection: 'row', alignItems: 'center' },
  smallCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  infoText: { color: '#111827' },

  bottomBar: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'android' ? 10 : 12
  },
  primaryBtn: {
    backgroundColor: '#0d5c4b',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#ffffff', fontWeight: '900' },
});

export default UserTypeSelection;