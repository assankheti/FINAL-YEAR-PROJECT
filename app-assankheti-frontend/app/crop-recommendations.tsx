import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GreenHeader from '@/components/GreenHeader';

type Crop = {
  name: string;
  percentage: number;
  weatherScore: number;
  areaScore: number;
  marketScore: number;
};

const cropData: Crop[] = [
  { name: 'Rice', percentage: 78, weatherScore: 90, areaScore: 70, marketScore: 70 },
  { name: 'Sugarcane', percentage: 65, weatherScore: 75, areaScore: 60, marketScore: 65 },
  { name: 'Wheat', percentage: 52, weatherScore: 50, areaScore: 60, marketScore: 50 },
  { name: 'Corn', percentage: 45, weatherScore: 40, areaScore: 50, marketScore: 45 },
];

export default function CropRecommendations(): JSX.Element {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);
  // Find best crop
  const bestPercentage = Math.max(...cropData.map(c => c.percentage));

  return (
    <SafeAreaView style={styles.container}>
      <GreenHeader title={{ english: 'Recommended Crops', urdu: 'تجویز کردہ فصلیں' }} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Info Cards */}
        <View style={styles.topCardsRow}>
          <View style={[styles.topCard, styles.weatherCard]}>
            <Feather name="cloud" size={20} color="#F9FAF7" />
            <Text style={styles.topCardLabel}>Weather</Text>
            <Text style={styles.topCardValue}>28°C, Sunny</Text>
          </View>

          <View style={[styles.topCard, styles.locationCard]}>
            <MaterialCommunityIcons
              name="map-marker-radius"
              size={20}
              color="#F9FAF7"
            />
            <Text style={styles.topCardLabel}>Location</Text>
            <Text style={styles.topCardValue}>Lahore, Punjab</Text>
          </View>

          <View style={[styles.topCard, styles.seasonCard]}>
            <Feather name="sun" size={20} color="#1F2D1C" />
            <Text style={[styles.topCardLabel, { color: '#1F2D1C' }]}>
              Season
            </Text>
            <Text style={[styles.topCardValue, { color: '#1F2D1C' }]}>
              Kharif
            </Text>
          </View>
        </View>

        {/* Crop Recommendations */}

        <View style={styles.cropList}>
          {cropData.map((crop) => {
            const isBest = crop.percentage === bestPercentage;

            return (
              <TouchableOpacity
                key={crop.name}
                style={[styles.cropRow, isBest && styles.bestCropRow]}
              >
                <View>
                  <Text style={styles.cropName}>
                    {crop.name} {isBest && '⭐'}
                  </Text>
                  {/* Score breakdown */}
                  <Text style={styles.scoreText}>
                    Weather: {crop.weatherScore}% | Area: {crop.areaScore}% | Market: {crop.marketScore}%
                  </Text>
                </View>

                <View style={styles.percentageBadge}>
                  <Text style={styles.cropPercentage}>{crop.percentage}%</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 3;

/* 🌿 Assan Kheti Brand Colors */
const COLORS = {
  background: '#F9FAF7', // --cream
  primary: '#1F4D3A', // --forest-green
  secondary: '#5FA36A', // --leaf-green
  accent: '#F4A226', // --sunrise-orange
  card: '#FFFFFF',
  muted: '#E7EFEA',
  textPrimary: '#1F2D1C',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 18,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  scrollContent: {
    padding: 16,
  },

  /* Top Cards */
  topCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  topCard: {
    width: cardWidth,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  weatherCard: {
    backgroundColor: COLORS.primary,
  },
  locationCard: {
    backgroundColor: COLORS.secondary,
  },
  seasonCard: {
    backgroundColor: COLORS.accent,
  },
  topCardLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.background,
  },
  topCardValue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.background,
    textAlign: 'center',
  },

  /* Section */
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backButtonInline: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(31,77,58,0.06)' },
  headerContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },

  /* Crop List */
  cropList: {
    marginTop: 4,
  },
  cropRow: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 3,
  },
  bestCropRow: {
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  cropName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4A5D4D',
    marginTop: 4,
  },
  percentageBadge: {
    backgroundColor: '#ECF7F0',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  cropPercentage: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.secondary,
  },
});
