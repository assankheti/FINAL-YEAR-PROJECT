import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { useT } from '@/contexts/LanguageContext';
import {
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
  icon: string;
  available: boolean;
  comingSoon?: boolean;
};

const CROPS: Crop[] = [
  { id: 'rice', name: 'Rice', urduName: 'چاول', icon: '🌾', available: true },
  { id: 'wheat', name: 'Wheat', urduName: 'گندم', icon: '🌾', available: false, comingSoon: true },
  { id: 'cotton', name: 'Cotton', urduName: 'کپاس', icon: '🌿', available: false, comingSoon: true },
  { id: 'sugarcane', name: 'Sugarcane', urduName: 'گنا', icon: '🎋', available: false, comingSoon: true },
  { id: 'corn', name: 'Corn', urduName: 'مکئی', icon: '🌽', available: false, comingSoon: true },
  { id: 'vegetables', name: 'Vegetables', urduName: 'سبزیاں', icon: '🥬', available: false, comingSoon: true },
];

export function CropSelection({
  onContinue,
}: {
  onContinue: (selectedCrop: CropId) => void;
}) {
  const router = useRouter();
  const t = useT();
  const [selectedCrop, setSelectedCrop] = useState<CropId | null>(null);
  const { width, height } = useWindowDimensions();

  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);
  const isSmallHeight = height < 700;

  const selected = useMemo(() => CROPS.find((c) => c.id === selectedCrop) ?? null, [selectedCrop]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.root}>
        {/* Header */}
        <LinearGradient
          colors={['#0d5c4b', '#10b981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingHorizontal: horizontalPadding }]}
        >
          <View style={{ maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.pageTitle} numberOfLines={1}>
                {t({ english: 'Select Your Crop', urdu: 'اپنی فصل منتخب کریں' })}
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => router.back()}
                style={styles.headerBackButtonInline}
              >
                <Feather name="arrow-left" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Content */}
        <ScrollView
          contentContainerStyle={{ paddingBottom: isSmallHeight ? 120 : 140 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contentWrap, { paddingHorizontal: horizontalPadding }]}
          >
            <View style={{ maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }}>
              <View style={styles.grid}>
                {CROPS.map((crop) => {
                  const isSelected = selectedCrop === crop.id;
                  const isDisabled = !crop.available;

                  return (
                    <TouchableOpacity
                      key={crop.id}
                      activeOpacity={0.9}
                      disabled={isDisabled}
                      onPress={() => {
                        if (!crop.available) return;
                        setSelectedCrop(crop.id);
                      }}
                      style={[
                        styles.cropCard,
                        isSelected ? styles.cropCardSelected : styles.cropCardNormal,
                        isDisabled ? styles.cropCardDisabled : null,
                      ]}
                    >
                      {crop.comingSoon ? (
                        <View style={styles.soonBadge}>
                          <Feather name="clock" size={12} color="#111827" />
                          <Text style={styles.soonText}>{t({ english: 'Soon', urdu: 'جلد' })}</Text>
                        </View>
                      ) : null}

                      {isSelected ? (
                        <View style={styles.selectedDot}>
                          <Feather name="check" size={14} color="#ffffff" />
                        </View>
                      ) : null}

                      {isDisabled ? (
                        <View style={styles.lockDot}>
                          <Feather name="lock" size={12} color="#6b7280" />
                        </View>
                      ) : null}

                      <Text style={styles.cropEmoji}>{crop.icon}</Text>
                      <Text style={styles.cropName}>{t({ english: crop.name, urdu: crop.urduName })}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>


              {/* Rice features */}
              {selectedCrop === 'rice' ? (
                <View style={styles.featuresCard}>
                  <View style={{ gap: 10, marginTop: 10 }}>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>

        {/* Bottom button */}
        <View style={[styles.bottomBar, { paddingHorizontal: horizontalPadding }]}>
          <View style={{ maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }}>
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={!selectedCrop}
              onPress={() => {
                if (!selectedCrop) return;
                onContinue(selectedCrop);
              }}
              style={[styles.continueBtn, !selectedCrop ? styles.continueBtnDisabled : styles.continueBtnEnabled]}
            >
              <Text style={styles.continueText}>
                {selected
                  ? t({ english: `Continue with ${selected.name}`, urdu: `${selected.urduName} کے ساتھ جاری رکھیں` })
                  : t({ english: 'Continue', urdu: 'جاری رکھیں' })}
              </Text>
              <Feather name="arrow-right" size={18} color="#ffffff" style={{ marginLeft: 10 }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f1e8' },
  header: {
    paddingTop: 18,
    paddingBottom: 32,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  brandTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  brandSub: { color: 'rgba(255,255,255,0.82)', fontSize: 11, marginTop: 2 },

  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', flex: 1, marginRight: 12, textAlign: 'left' },
  pageSub: { color: '#ffffff', marginTop: 4 ,fontSize: 18, fontWeight: '900'},

  headerBackButtonInline: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)'
  },

  contentWrap: { paddingTop: 0, marginTop: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  cropCard: {
    width: '48%',
    borderRadius: 18,
    borderWidth: 2,
    padding: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  cropCardNormal: { borderColor: '#e5e7eb' },
  cropCardSelected: { borderColor: '#0d5c4b'},
  cropCardDisabled: { opacity: 0.6 },

  soonBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#f59e0b',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  soonText: { fontSize: 10, fontWeight: '900', color: '#111827' },

  selectedDot: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: '#0d5c4b', alignItems: 'center', justifyContent: 'center' },
  lockDot: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },

  cropEmoji: { fontSize: 36, marginBottom: 10 },
  cropName: { fontWeight: '900', color: '#111827' },
  cropUrdu: { marginTop: 4, color: '#6b7280', fontWeight: '700' },

  infoCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    backgroundColor: 'rgba(245,158,11,0.10)',
    padding: 14,
  },
  infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245,158,11,0.20)', alignItems: 'center', justifyContent: 'center' },
  infoTitle: { fontWeight: '900', color: '#111827' },
  infoDesc: { color: '#6b7280', marginTop: 6, lineHeight: 16, fontSize: 12 },
  infoUrdu: { color: '#f59e0b', marginTop: 6, fontWeight: '900', fontSize: 12 },

  featuresCard: { marginTop: 12, borderRadius: 16, padding: 14,},
  featuresTitle: { fontWeight: '900', color: '#111827' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  featureText: { color: '#111827', fontWeight: '700' },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 18 : 12,
  },
  continueBtn: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  continueBtnEnabled: { backgroundColor: '#0d5c4b' },
  continueBtnDisabled: { backgroundColor: '#9ca3af' },
  continueText: { color: '#ffffff', fontWeight: '900' },
});
