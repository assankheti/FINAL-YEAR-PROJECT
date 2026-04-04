import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

type UserType = 'farmer' | 'simple-user' | 'businessman';

const isUrdu = (text: string): boolean => /[\u0600-\u06FF]/.test(text);
const urduFont = () => (Platform.OS === 'ios' ? 'Noto Naskh Arabic' : 'Roboto');

// Responsive scale helper — base design on 375pt width
const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.15);
  const vScale = Math.min(height / 812, 1.1);
  const isSmall = height < 700;
  const isTiny = height < 620;
  const hp = (pct: number) => Math.round((height * pct) / 100);
  const wp = (pct: number) => Math.round((width * pct) / 100);
  const fs = (size: number) => Math.round(size * scale);
  return { width, height, scale, vScale, isSmall, isTiny, hp, wp, fs };
};

export function UserTypeSelection({
  onSelectUserType,
  textLanguage = 'english',
}: {
  onSelectUserType: (t: UserType) => void;
  textLanguage?: 'urdu' | 'english';
}) {
  const router = useRouter();
  const r = useResponsive();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const cardAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const scaleAnims = useRef([0, 1, 2].map(() => new Animated.Value(1))).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    cardAnims.forEach((a) => a.setValue(0));

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.stagger(
      100,
      cardAnims.map((a) =>
        Animated.spring(a, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [fadeAnim, cardAnims]);

  const onPressIn = useCallback(
    (index: number) => {
      Animated.spring(scaleAnims[index], {
        toValue: 0.97,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }).start();
    },
    [scaleAnims]
  );

  const onPressOut = useCallback(
    (index: number) => {
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }).start();
    },
    [scaleAnims]
  );

  const lang: 'urdu' | 'english' =
    (typeof textLanguage === 'string' ? textLanguage.toLowerCase() : 'english') === 'urdu'
      ? 'urdu'
      : 'english';

  const t = (obj: Record<string, string>) => obj?.[lang];

  const translations = useMemo(
    () => ({
      who: { urdu: 'آپ کون ہیں؟', english: 'Who are you?' },
      whoHint: {
        urdu: 'اپنا کردار منتخب کریں اور شروع کریں',
        english: 'Choose your role to personalize your experience',
      },
      continueAs: { urdu: 'جاری رکھیں بطور', english: 'Continue as' },
      selectRole: { urdu: 'کردار منتخب کریں', english: 'Select your role' },
      step: { urdu: 'مرحلہ ۳ / ۴', english: 'Step 3 of 4' },
    }),
    []
  );

  const userTypes = useMemo(
    () => [
      {
        id: 'farmer' as const,
        title: { urdu: 'کسان', english: 'Farmer' },
        subtitle: {
          urdu: 'سمارٹ فارمنگ ٹولز اور براہِ راست بازار رسائی',
          english: 'Smart farming tools & direct market access',
        },
        features: {
          urdu: ['فصل کی بیماری کی شناخت', 'بجٹ کیلکولیٹر', 'مارکیٹ رسائی'],
          english: ['Disease detection', 'Budget calculator', 'Market access'],
        },
        featureIcons: ['shield', 'dollar-sign', 'trending-up'] as const,
        icon: (size: number) => (
          <MaterialCommunityIcons name="account-cowboy-hat" size={size} color="#ffffff" />
        ),
        gradient: ['#f59e0b', '#e67e22'] as const,
        accentLight: '#fef3c7',
        accentMid: '#fde68a',
        accentBorder: '#d97706',
        accentText: '#92400e',
      },
      {
        id: 'simple-user' as const,
        title: { urdu: 'عام صارف', english: 'Simple User' },
        subtitle: {
          urdu: 'تازہ اور معیاری فارم پروڈکٹس گھر بیٹھے',
          english: 'Fresh farm products delivered to your door',
        },
        features: {
          urdu: ['تازہ پروڈکٹس', 'آسان آرڈرنگ', 'گھر تک ترسیل'],
          english: ['Fresh products', 'Easy ordering', 'Home delivery'],
        },
        featureIcons: ['package', 'smartphone', 'truck'] as const,
        icon: (size: number) => (
          <MaterialCommunityIcons name="account-heart" size={size} color="#ffffff" />
        ),
        gradient: ['#10b981', '#059669'] as const,
        accentLight: '#d1fae5',
        accentMid: '#6ee7b7',
        accentBorder: '#059669',
        accentText: '#065f46',
      },
      {
        id: 'businessman' as const,
        title: { urdu: 'تاجر', english: 'Businessman' },
        subtitle: {
          urdu: 'تھوک خریداری اور کاروباری حل',
          english: 'Wholesale purchasing & business solutions',
        },
        features: {
          urdu: ['تھوک خریداری', 'کاروباری تجزیات', 'سپلائر نیٹ ورک'],
          english: ['Wholesale deals', 'Analytics', 'Supplier network'],
        },
        featureIcons: ['layers', 'bar-chart-2', 'users'] as const,
        icon: (size: number) => (
          <MaterialCommunityIcons name="briefcase-account" size={size} color="#ffffff" />
        ),
        gradient: ['#0d5c4b', '#047857'] as const,
        accentLight: '#ccfbf1',
        accentMid: '#5eead4',
        accentBorder: '#0d5c4b',
        accentText: '#134e4a',
      },
    ],
    []
  );

  const maxW = Math.min(480, r.width);
  const selectedUser = userTypes.find((u) => u.id === selectedType);
  const iconSize = r.isSmall ? 26 : 30;
  const cardPad = r.isSmall ? 14 : 18;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8faf9' }}>
      <View style={s.screen}>
        {/* ── Header ── */}
        <LinearGradient
          colors={['#0d5c4b', '#0f7a62', '#10b981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            s.header,
            {
              paddingHorizontal: r.wp(5),
              paddingTop: r.isSmall ? 10 : 16,
              paddingBottom: r.isSmall ? 20 : 28,
            },
          ]}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Top row: back + step */}
            <View style={s.headerTopRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => router.push('/language-selection')}
                style={s.backBtn}
                activeOpacity={0.7}
              >
                <Feather name="chevron-left" size={22} color="#ffffff" />
              </TouchableOpacity>

              <View style={s.stepBadge}>
                <Text style={[s.stepText, isUrdu(t(translations.step)) && { fontFamily: urduFont() }]}>
                  {t(translations.step)}
                </Text>
              </View>
            </View>

            {/* Title */}
            <View style={{ marginTop: r.isSmall ? 12 : 18 }}>
              <Text
                style={[
                  s.headerTitle,
                  { fontSize: r.fs(28) },
                  isUrdu(t(translations.who)) && { fontFamily: urduFont() },
                ]}
              >
                {t(translations.who)}
              </Text>
              <Text
                style={[
                  s.headerHint,
                  { fontSize: r.fs(14) },
                  isUrdu(t(translations.whoHint)) && { fontFamily: urduFont() },
                ]}
              >
                {t(translations.whoHint)}
              </Text>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* ── Cards ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            s.content,
            {
              maxWidth: maxW,
              alignSelf: 'center',
              width: '100%',
              paddingHorizontal: r.wp(4.5),
              paddingTop: r.isSmall ? 16 : 22,
              paddingBottom: 8,
              gap: r.isSmall ? 12 : 16,
            },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {userTypes.map((type, index) => {
            const isSelected = selectedType === type.id;
            const anim = cardAnims[index];

            return (
              <Animated.View
                key={type.id}
                style={{
                  opacity: anim,
                  transform: [
                    { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
                    { scale: scaleAnims[index] },
                  ],
                }}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPressIn={() => onPressIn(index)}
                  onPressOut={() => onPressOut(index)}
                  onPress={() => setSelectedType(type.id)}
                  style={[
                    s.card,
                    { padding: cardPad },
                    isSelected && {
                      borderColor: type.accentBorder,
                      backgroundColor: type.accentLight + '40',
                    },
                  ]}
                >
                  {/* Selected indicator line */}
                  {isSelected && (
                    <View
                      style={[
                        s.selectedLine,
                        { backgroundColor: type.accentBorder },
                      ]}
                    />
                  )}

                  <View style={s.cardRow}>
                    {/* Icon */}
                    <LinearGradient
                      colors={[type.gradient[0], type.gradient[1]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        s.iconBox,
                        {
                          width: r.isSmall ? 52 : 60,
                          height: r.isSmall ? 52 : 60,
                          borderRadius: r.isSmall ? 15 : 18,
                        },
                        isSelected && s.iconBoxSelected,
                      ]}
                    >
                      {type.icon(iconSize)}
                    </LinearGradient>

                    {/* Text content */}
                    <View style={{ flex: 1 }}>
                      <View style={s.cardTopRow}>
                        <Text
                          style={[
                            s.cardTitle,
                            { fontSize: r.fs(17) },
                            isUrdu(t(type.title)) && { fontFamily: urduFont() },
                          ]}
                        >
                          {t(type.title)}
                        </Text>

                        {/* Radio / Check */}
                        <View
                          style={[
                            s.radioOuter,
                            isSelected && {
                              borderColor: type.accentBorder,
                              backgroundColor: type.accentBorder,
                            },
                          ]}
                        >
                          {isSelected && (
                            <Feather name="check" size={13} color="#ffffff" />
                          )}
                        </View>
                      </View>

                      <Text
                        style={[
                          s.cardSubtitle,
                          { fontSize: r.fs(12.5) },
                          isUrdu(t(type.subtitle)) && { fontFamily: urduFont() },
                        ]}
                        numberOfLines={2}
                      >
                        {t(type.subtitle)}
                      </Text>

                      {/* Feature chips */}
                      <View style={s.featureRow}>
                        {type.features[lang].map((feat, i) => (
                          <View
                            key={i}
                            style={[
                              s.featureChip,
                              isSelected && {
                                backgroundColor: type.accentLight,
                                borderColor: type.accentMid,
                              },
                            ]}
                          >
                            <Feather
                              name={type.featureIcons[i]}
                              size={10}
                              color={isSelected ? type.accentText : '#9ca3af'}
                            />
                            <Text
                              style={[
                                s.featureText,
                                { fontSize: r.fs(10.5) },
                                isSelected && { color: type.accentText },
                                isUrdu(feat) && { fontFamily: urduFont() },
                              ]}
                            >
                              {feat}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>

        {/* ── Bottom CTA ── */}
        <View
          style={[
            s.bottomBar,
            {
              maxWidth: maxW,
              alignSelf: 'center',
              width: '100%',
              paddingHorizontal: r.wp(4.5),
              paddingBottom: Platform.OS === 'ios' ? r.hp(2.5) : r.hp(2),
            },
          ]}
        >
          {/* Subtle divider */}
          <View style={s.divider} />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => selectedType && onSelectUserType(selectedType)}
            disabled={!selectedType}
            style={[s.primaryBtn, !selectedType && s.primaryBtnDisabled]}
          >
            <LinearGradient
              colors={
                selectedUser
                  ? [selectedUser.gradient[0], selectedUser.gradient[1]]
                  : ['#c4c4c4', '#a3a3a3']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.primaryBtnGradient, { minHeight: r.isSmall ? 52 : 58 }]}
            >
              {selectedType && (
                <View style={s.btnIconCircle}>
                  {selectedUser!.icon(18)}
                </View>
              )}
              <Text
                style={[
                  s.primaryBtnText,
                  { fontSize: r.fs(16) },
                  isUrdu(
                    selectedType
                      ? `${t(translations.continueAs)} ${t(selectedUser!.title)}`
                      : t(translations.selectRole)
                  ) && { fontFamily: urduFont() },
                ]}
              >
                {selectedType
                  ? `${t(translations.continueAs)} ${t(selectedUser!.title)}`
                  : t(translations.selectRole)}
              </Text>
              <Feather name="arrow-right" size={18} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8faf9' },

  /* ── Header ── */
  header: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#064e3b',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  stepBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  stepText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  headerTitle: {
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  headerHint: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.1,
  },

  /* ── Content ── */
  content: {
    flexGrow: 1,
  },

  /* ── Card ── */
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e8eceb',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0d5c4b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  selectedLine: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3.5,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBoxSelected: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    color: '#111827',
    fontWeight: '700',
    letterSpacing: 0.1,
    flex: 1,
  },
  cardSubtitle: {
    color: '#6b7280',
    marginTop: 3,
    lineHeight: 18,
    letterSpacing: 0.1,
  },

  /* ── Features ── */
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f4f5f5',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e8eceb',
  },
  featureText: {
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.1,
  },

  /* ── Radio ── */
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d4d8d7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: '#f9fafb',
  },

  /* ── Bottom bar ── */
  bottomBar: {
    paddingTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e8eceb',
    marginBottom: 14,
    marginHorizontal: 8,
  },
  primaryBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0d5c4b',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  primaryBtnDisabled: {
    opacity: 0.45,
    ...Platform.select({
      ios: { shadowOpacity: 0.05 },
      android: { elevation: 2 },
    }),
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  btnIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default UserTypeSelection;
