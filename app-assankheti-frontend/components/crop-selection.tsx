import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/contexts/LanguageContext';
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

export type CropId = 'rice' | 'wheat' | 'cotton' | 'sugarcane' | 'corn' | 'vegetables';

type Crop = {
  id: CropId;
  name: string;
  urduName: string;
  emoji: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  available: boolean;
  color: string;
  lightColor: string;
};

const CROPS: Crop[] = [
  { id: 'rice', name: 'Rice', urduName: 'چاو��', emoji: '🌾', icon: 'grain', available: true, color: '#059669', lightColor: '#d1fae5' },
  { id: 'wheat', name: 'Wheat', urduName: 'گندم', emoji: '🌾', icon: 'barley', available: false, color: '#d97706', lightColor: '#fef3c7' },
  { id: 'cotton', name: 'Cotton', urduName: 'کپاس', emoji: '🌿', icon: 'flower-tulip', available: false, color: '#7c3aed', lightColor: '#ede9fe' },
  { id: 'sugarcane', name: 'Sugarcane', urduName: 'گنا', emoji: '🎋', icon: 'grass', available: false, color: '#0d9488', lightColor: '#ccfbf1' },
  { id: 'corn', name: 'Corn', urduName: 'مکئی', emoji: '🌽', icon: 'corn', available: false, color: '#ea580c', lightColor: '#fff7ed' },
  { id: 'vegetables', name: 'Vegetables', urduName: 'سبزیاں', emoji: '🥬', icon: 'food-apple', available: false, color: '#16a34a', lightColor: '#dcfce7' },
];

const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.15);
  const isSmall = height < 700;
  const isTiny = height < 620;
  const hp = (pct: number) => Math.round((height * pct) / 100);
  const wp = (pct: number) => Math.round((width * pct) / 100);
  const fs = (size: number) => Math.round(size * scale);
  return { width, height, scale, isSmall, isTiny, hp, wp, fs };
};

export function CropSelection({ onContinue }: { onContinue: (selectedCrop: CropId) => void }) {
  const router = useRouter();
  const t = useT();
  const r = useResponsive();
  const [selectedCrop, setSelectedCrop] = useState<CropId | null>(null);
  const [sortAZ, setSortAZ] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(CROPS.map(() => new Animated.Value(0))).current;
  const scaleAnims = useRef(CROPS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    cardAnims.forEach((a) => a.setValue(0));

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    Animated.stagger(
      70,
      cardAnims.map((a) =>
        Animated.spring(a, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true })
      )
    ).start();
  }, [fadeAnim, cardAnims]);

  const onPressIn = useCallback(
    (i: number) => {
      Animated.spring(scaleAnims[i], { toValue: 0.95, tension: 100, friction: 10, useNativeDriver: true }).start();
    },
    [scaleAnims]
  );

  const onPressOut = useCallback(
    (i: number) => {
      Animated.spring(scaleAnims[i], { toValue: 1, tension: 40, friction: 6, useNativeDriver: true }).start();
    },
    [scaleAnims]
  );

  const selected = useMemo(() => CROPS.find((c) => c.id === selectedCrop) ?? null, [selectedCrop]);

  const sortFn = (a: Crop, b: Crop) => (sortAZ ? a.name.localeCompare(b.name) : 0);
  const availableCrops = useMemo(() => CROPS.filter((c) => c.available).sort(sortFn), [sortAZ]);
  const comingSoonCrops = useMemo(() => CROPS.filter((c) => !c.available).sort(sortFn), [sortAZ]);

  const maxW = Math.min(480, r.width);
  const cardSize = (r.width - r.wp(9) - 14) / 2; // 2 columns with gap

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8faf9' }}>
      <View style={s.screen}>
        {/* Header */}
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
            <View style={s.headerTopRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => router.push('/user-type-selection')}
                style={s.backBtn}
                activeOpacity={0.7}
              >
                <Feather name="chevron-left" size={22} color="#ffffff" />
              </TouchableOpacity>

              <View style={s.stepBadge}>
                <Text style={s.stepText}>
                  {t({ english: 'Step 4 of 4', urdu: '��رحلہ ۴ / ۴' })}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: r.isSmall ? 12 : 18 }}>
              <Text style={[s.headerTitle, { fontSize: r.fs(26) }]}>
                {t({ english: 'Select Your Crop', urdu: 'اپنی فصل منتخب کریں' })}
              </Text>
              <Text style={[s.headerHint, { fontSize: r.fs(13.5) }]}>
                {t({
                  english: 'Choose the crop you want to manage',
                  urdu: 'وہ فصل منتخب کریں جسے آپ منظم کرنا چاہتے ہیں',
                })}
              </Text>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Crop grid */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            maxWidth: maxW,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: r.wp(4.5),
            paddingTop: r.isSmall ? 16 : 22,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
          bounces
        >
          {/* Sort toggle + Available label */}
          <View style={s.sectionRow}>
            <Text style={[s.sectionLabel, { fontSize: r.fs(13), marginBottom: 0 }]}>
              {t({ english: 'Available', urdu: 'دستیاب' })}
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSortAZ((prev) => !prev)}
              style={[s.sortBtn, sortAZ && s.sortBtnActive]}
            >
              <Feather
                name={sortAZ ? 'check-circle' : 'arrow-down'}
                size={13}
                color={sortAZ ? '#0d5c4b' : '#6b7280'}
              />
              <Text style={[s.sortBtnText, sortAZ && s.sortBtnTextActive]}>
                A-Z
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[s.grid, { gap: 14 }]}>
            {availableCrops.map((crop) => {
              const index = CROPS.indexOf(crop);
              const isSelected = selectedCrop === crop.id;
              const anim = cardAnims[index];

              return (
                <Animated.View
                  key={crop.id}
                  style={{
                    width: cardSize,
                    opacity: anim,
                    transform: [
                      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                      { scale: scaleAnims[index] },
                    ],
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={1}
                    onPressIn={() => onPressIn(index)}
                    onPressOut={() => onPressOut(index)}
                    onPress={() => setSelectedCrop(crop.id)}
                    style={[
                      s.cropCard,
                      { minHeight: r.isSmall ? 120 : 140 },
                      isSelected && { borderColor: crop.color, backgroundColor: crop.lightColor + '60' },
                    ]}
                  >
                    {isSelected && (
                      <View style={[s.checkBadge, { backgroundColor: crop.color }]}>
                        <Feather name="check" size={12} color="#ffffff" />
                      </View>
                    )}

                    <View
                      style={[
                        s.emojiCircle,
                        {
                          backgroundColor: isSelected ? crop.lightColor : '#f3f4f6',
                          width: r.isSmall ? 48 : 56,
                          height: r.isSmall ? 48 : 56,
                          borderRadius: r.isSmall ? 14 : 16,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: r.isSmall ? 24 : 28 }}>{crop.emoji}</Text>
                    </View>

                    <Text
                      style={[
                        s.cropName,
                        { fontSize: r.fs(14) },
                        isSelected && { color: crop.color },
                      ]}
                    >
                      {t({ english: crop.name, urdu: crop.urduName })}
                    </Text>
                    <Text style={[s.cropSub, { fontSize: r.fs(11) }]}>
                      {t({ english: crop.urduName, urdu: crop.name })}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* Coming Soon section */}
          <Text style={[s.sectionLabel, { fontSize: r.fs(13), marginTop: 24 }]}>
            {t({ english: 'Coming Soon', urdu: 'جلد آرہا ہے' })}
          </Text>

          <View style={[s.grid, { gap: 14 }]}>
            {comingSoonCrops.map((crop) => {
              const index = CROPS.indexOf(crop);
              const anim = cardAnims[index];

              return (
                <Animated.View
                  key={crop.id}
                  style={{
                    width: cardSize,
                    opacity: anim,
                    transform: [
                      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                    ],
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={1}
                    disabled
                    style={[
                      s.cropCard,
                      { minHeight: r.isSmall ? 120 : 140 },
                      s.cropCardDisabled,
                    ]}
                  >
                    <View style={s.soonBadge}>
                      <Feather name="clock" size={9} color="#92400e" />
                      <Text style={s.soonText}>
                        {t({ english: 'Soon', urdu: 'جلد' })}
                      </Text>
                    </View>

                    <View style={s.lockBadge}>
                      <Feather name="lock" size={11} color="#9ca3af" />
                    </View>

                    <View
                      style={[
                        s.emojiCircle,
                        {
                          backgroundColor: '#f3f4f6',
                          width: r.isSmall ? 48 : 56,
                          height: r.isSmall ? 48 : 56,
                          borderRadius: r.isSmall ? 14 : 16,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: r.isSmall ? 24 : 28 }}>{crop.emoji}</Text>
                    </View>

                    <Text style={[s.cropName, { fontSize: r.fs(14) }]}>
                      {t({ english: crop.name, urdu: crop.urduName })}
                    </Text>
                    <Text style={[s.cropSub, { fontSize: r.fs(11) }]}>
                      {t({ english: crop.urduName, urdu: crop.name })}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom CTA */}
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
          <View style={s.divider} />

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!selectedCrop}
            onPress={() => selectedCrop && onContinue(selectedCrop)}
            style={[s.continueBtn, !selectedCrop && s.continueBtnDisabled]}
          >
            <LinearGradient
              colors={
                selected
                  ? [selected.color, selected.color + 'dd']
                  : ['#c4c4c4', '#a3a3a3']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.continueBtnGradient, { minHeight: r.isSmall ? 52 : 58 }]}
            >
              {selected && (
                <View style={s.btnIconCircle}>
                  <Text style={{ fontSize: 16 }}>{selected.emoji}</Text>
                </View>
              )}
              <Text style={[s.continueText, { fontSize: r.fs(15.5) }]}>
                {selected
                  ? t({
                      english: `Continue with ${selected.name}`,
                      urdu: `${selected.urduName} کے ساتھ جاری رکھیں`,
                    })
                  : t({ english: 'Select a crop', urdu: 'فصل منتخب کریں' })}
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

  /* Header */
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

  /* Section */
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionLabel: {
    color: '#6b7280',
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sortBtnActive: {
    backgroundColor: '#d1fae5',
    borderColor: '#0d5c4b',
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.3,
  },
  sortBtnTextActive: {
    color: '#0d5c4b',
  },

  /* Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  /* Crop card */
  cropCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e8eceb',
    backgroundColor: '#ffffff',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  cropCardDisabled: { opacity: 0.55 },

  /* Badges */
  soonBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#fde68a',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  soonText: { fontSize: 9, fontWeight: '800', color: '#92400e', letterSpacing: 0.3 },

  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Emoji */
  emojiCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  /* Text */
  cropName: {
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  cropSub: {
    color: '#9ca3af',
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },

  /* Bottom */
  bottomBar: {
    paddingTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e8eceb',
    marginBottom: 14,
    marginHorizontal: 8,
  },
  continueBtn: {
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
  continueBtnDisabled: {
    opacity: 0.45,
    ...Platform.select({
      ios: { shadowOpacity: 0.05 },
      android: { elevation: 2 },
    }),
  },
  continueBtnGradient: {
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
  continueText: {
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
