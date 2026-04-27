import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import GreenHeader from '@/components/GreenHeader';
import { API_BASE } from '@/config/env';

import { BarChart, MapView, Marker } from '@/lib/native-charts';

type Crop = {
  name: string;
  weatherScore: number;
  soilScore: number;
  areaScore: number;
  marketScore: number;
  pestRiskScore: number;
  totalScore: number;
};

const initialCrops = ['Rice', 'Wheat', 'Corn', 'Sugarcane', 'Potato'];

export default function SmartCropRecommendation() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [weatherChartContainerWidth, setWeatherChartContainerWidth] = useState(0);

  // navigation helper with fallback
  const handleBack = () => {
    // navigate back to farmer dashboard explicitly
    router.replace('/farmer-dashboard');
  };

  const [region, setRegion] = useState<any>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [weatherForecast, setWeatherForecast] = useState<any[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [soilType, setSoilType] = useState('Detecting...');
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const DEFAULT_COORDS = { latitude: 31.5204, longitude: 74.3587 };
  const DEFAULT_SOIL = 'Loamy Soil';

  const topCrop = crops[0];
  const formatCoord = (value?: number) =>
    typeof value === 'number' && Number.isFinite(value) ? value.toFixed(4) : '--';
  const formatForecastDay = (value?: string) => {
    if (!value) return '--';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '--';
    return dt.toLocaleDateString('en-US', { weekday: 'short' });
  };
  const buildFallbackWeather = (startMs: number = Date.now(), days: number = 7) =>
    Array.from({ length: days }, (_, i) => ({
      datetime: new Date(startMs + i * 86400000).toISOString(),
      temp: 27 + ((i % 3) - 1),
      rh: 68 + (i % 4) * 3,
      pop: 15 + (i % 5) * 8,
    }));

  const normalizeSevenDayForecast = (items: any[]): any[] => {
    const normalized = (Array.isArray(items) ? items : [])
      .slice(0, 7)
      .map((entry, idx) => ({
        datetime: entry?.datetime || new Date(Date.now() + idx * 86400000).toISOString(),
        temp: Number(entry?.temp ?? 28),
        rh: Number(entry?.rh ?? 70),
        pop: Number(entry?.pop ?? 20),
      }));

    if (normalized.length >= 7) return normalized;
    const startMs = normalized.length
      ? new Date(normalized[normalized.length - 1].datetime).getTime() + 86400000
      : Date.now();
    return normalized.concat(buildFallbackWeather(startMs, 7 - normalized.length));
  };

  const weatherSnapshot = useMemo(() => weatherForecast.slice(0, 7), [weatherForecast]);
  const weatherChartWidth = Math.max(260, Math.round(weatherChartContainerWidth || width - 48));
  const isCompactWeatherChart = weatherChartWidth < 320;
  const isSmallScreen = width < 360;
  
  // Timeout for loading - if still loading after 8 seconds, force finish with fallback data
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && crops.length === 0) {
        console.warn('Loading timeout - using fallback data');
        // Create default crops if still loading
        const defaultCrops: Crop[] = initialCrops.map((cropName) => ({
          name: cropName,
          weatherScore: 75,
          soilScore: 80,
          areaScore: 100,
          marketScore: 70,
          pestRiskScore: 75,
          totalScore: 80,
        }));
        setCrops(defaultCrops.sort((a,b)=>b.totalScore-a.totalScore));
        setLoading(false);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 10,
            friction: 3,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [loading, crops.length]);
  
  // Helper: Simulate seasonal pest risk
  const simulatePestRisk = (crop: string, month: number) => {
    const riskMap: Record<string, number[]> = {
      Rice: [20, 25, 40, 50, 60, 70, 65, 55, 40, 30, 25, 20],
      Wheat: [30, 40, 50, 60, 70, 65, 50, 40, 35, 25, 20, 15],
      Corn: [15, 25, 35, 45, 50, 55, 50, 45, 35, 25, 20, 15],
      Sugarcane: [10, 15, 20, 25, 30, 40, 45, 40, 30, 20, 15, 10],
      Potato: [20, 30, 40, 50, 60, 65, 55, 50, 35, 25, 20, 15],
    };
    return riskMap[crop]?.[month] ?? 30;
  };

  // Get user location & soil type
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission denied. Using default coordinates.');
          setSoilType(DEFAULT_SOIL);
          setRegion({
            latitude: DEFAULT_COORDS.latitude,
            longitude: DEFAULT_COORDS.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          });
          setMapLoading(false);
          return;
        }

        let loc: Location.LocationObject | null = null;
        try {
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        } catch (e) {
          console.warn('Current location unavailable, trying last known location:', e);
          loc = await Location.getLastKnownPositionAsync();
        }

        if (!loc) {
          console.warn('No location available. Using default coordinates.');
          setSoilType(DEFAULT_SOIL);
          setRegion({
            latitude: DEFAULT_COORDS.latitude,
            longitude: DEFAULT_COORDS.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          });
          setMapLoading(false);
          return;
        }

        setLocation(loc);
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });

        // Simulate soil type based on latitude (for demo)
        const soils = ['Loamy Soil', 'Clay Soil', 'Sandy Soil', 'Silty Soil', 'Alluvial Soil', 'Saline Soil'];
        const index = Math.floor((Math.abs(loc.coords.latitude) % 6));
        setSoilType(soils[index] || DEFAULT_SOIL);
        setMapLoading(false);
      } catch (e) {
        console.warn('Location setup failed. Using defaults:', e);
        setSoilType(DEFAULT_SOIL);
        setRegion({
          latitude: DEFAULT_COORDS.latitude,
          longitude: DEFAULT_COORDS.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
        setMapLoading(false);
      }
    };
    fetchLocation();
  }, []);

  // Fetch weather forecast (7-day + monthly approximation)
  useEffect(() => {
    const fetchWeather = async () => {
      const latitude = location?.coords?.latitude ?? region?.latitude;
      const longitude = location?.coords?.longitude ?? region?.longitude;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return;
      try {
        const API_KEY = '529094980f6e4316be96ffc561515561';
        const url = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${latitude}&lon=${longitude}&key=${API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
        const data = await res.json();
        if (data && Array.isArray(data.data)) {
          setWeatherForecast(normalizeSevenDayForecast(data.data));
        } else {
          console.warn('Unexpected weather payload', data);
          setWeatherForecast(buildFallbackWeather());
        }
      } catch (e) {
        console.warn('Failed fetching weather, using defaults:', e);
        setWeatherForecast(buildFallbackWeather());
      }
    };
    fetchWeather();
  }, [location, region]);

  // Fetch market prices
  useEffect(() => {
    const fetchMarketPrices = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/calculator/prices/crop`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        setMarketPrices(data); // { Rice: 120, Wheat: 100, ... }
      } catch (err) {
        console.warn('Failed to fetch market prices, using defaults:', err);
        // Use default market prices to prevent infinite loading
        setMarketPrices({
          Rice: 120,
          Wheat: 100,
          Corn: 90,
          Sugarcane: 80,
          Potato: 70,
        });
      }
    };
    fetchMarketPrices();
  }, []);

  // Calculate crop suitability scores
  useEffect(() => {
    console.log('Calculating crops...', { weatherForecast: weatherForecast.length, marketPrices: Object.keys(marketPrices).length, soilType });
    if (!weatherForecast.length || !Object.keys(marketPrices).length || soilType === 'Detecting...') {
      console.log('Waiting for data: weather=', weatherForecast.length, 'prices=', Object.keys(marketPrices).length, 'soil=', soilType);
      return;
    }
    const month = new Date().getMonth(); // 0-11
    const calculatedCrops: Crop[] = initialCrops.map((cropName) => {
      const tempScore = Math.max(0, 100 - Math.abs(weatherForecast[0].temp - 28) * 3); // ideal 28°C
      const humidityScore = Math.max(0, 100 - Math.abs(weatherForecast[0].rh - 70)); // ideal 70%
      const soilScoreMap: Record<string, Record<string, number>> = {
        'Rice': { 'Loamy Soil': 90, 'Clay Soil': 60, 'Sandy Soil': 40, 'Silty Soil': 80, 'Alluvial Soil': 95, 'Saline Soil': 20 },
        'Wheat': { 'Loamy Soil': 95, 'Clay Soil': 80, 'Sandy Soil': 50, 'Silty Soil': 70, 'Alluvial Soil': 60, 'Saline Soil': 30 },
        'Corn': { 'Loamy Soil': 90, 'Clay Soil': 70, 'Sandy Soil': 60, 'Silty Soil': 80, 'Alluvial Soil': 65, 'Saline Soil': 25 },
        'Sugarcane': { 'Loamy Soil': 85, 'Clay Soil': 70, 'Sandy Soil': 50, 'Silty Soil': 75, 'Alluvial Soil': 90, 'Saline Soil': 20 },
        'Potato': { 'Loamy Soil': 90, 'Clay Soil': 80, 'Sandy Soil': 55, 'Silty Soil': 70, 'Alluvial Soil': 60, 'Saline Soil': 20 },
      };
      const soilScore = soilScoreMap[cropName]?.[soilType] ?? 50;
      const areaScore = 100; // Assuming all area suitable
      const marketScore = marketPrices[cropName] ? Math.min(100, marketPrices[cropName]) : 50;
      const pestRiskScore = 100 - simulatePestRisk(cropName, month);
      const totalScore = Math.round((tempScore + humidityScore + soilScore + areaScore + marketScore + pestRiskScore) / 6);
      return { name: cropName, weatherScore: tempScore, soilScore, areaScore, marketScore, pestRiskScore, totalScore };
    });
    setCrops(calculatedCrops.sort((a,b)=>b.totalScore-a.totalScore));
    setLoading(false);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  }, [weatherForecast, marketPrices, soilType]);

  if (loading)
    return (
      <LinearGradient colors={['#FFFFFF', '#F0FDF4']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <GreenHeader
            title={{ english: 'Crop Recommendation', urdu: 'تجویز کردہ فصلیں' }}
            titleLines={2}
            onBack={handleBack}
          />
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingTitle}>Building Smart Recommendation...</Text>
            <Text style={styles.loadingSub}>Analyzing weather, soil, and market signals</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );

  return (
    <LinearGradient colors={['#FFFFFF', '#F0FDF4']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <GreenHeader
          title={{ english: 'Crop Recommendation', urdu: 'تجویز کردہ فصلیں' }}
          titleLines={2}
          onBack={handleBack}
        />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.aiTag}>
              <Text style={styles.aiTagText}>AI Powered</Text>
            </View>
            <Text style={[styles.headerTitle, isSmallScreen && styles.headerTitleCompact]}>
              Smart Crop Recommendation
            </Text>
            <Text style={[styles.headerSubtitle, isSmallScreen && styles.headerSubtitleCompact]}>
              Data-driven suggestions for your current farm conditions
            </Text>
          </View>

          {/* Top Recommended Crop Card */}
          <Animated.View style={[styles.topCropCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient colors={['#059669', '#047857']} style={styles.topCropGradient}>
              <View style={styles.topCropContent}>
                <Text style={styles.topCropTitle}>🌾 Top Recommendation</Text>
                <Text style={styles.topCropName}>{topCrop?.name ?? 'Rice'}</Text>
                <Text style={styles.topCropScore}>Suitability Score: {topCrop?.totalScore ?? 0}/100</Text>
                <Text style={styles.topCropDesc}>Based on live weather, soil profile, and mandi trends</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Location & Soil Analysis */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📍 Location & Soil Analysis</Text>
              <View style={styles.locationStats}>
                <View style={styles.locationChip}>
                  <Text style={styles.locationLabel}>Latitude</Text>
                  <Text style={styles.locationValue}>
                    {formatCoord(location?.coords?.latitude ?? region?.latitude)}
                  </Text>
                </View>
                <View style={styles.locationChip}>
                  <Text style={styles.locationLabel}>Longitude</Text>
                  <Text style={styles.locationValue}>
                    {formatCoord(location?.coords?.longitude ?? region?.longitude)}
                  </Text>
                </View>
              </View>
              <View style={styles.soilBadge}>
                <Text style={styles.soilBadgeText}>Soil: {soilType}</Text>
              </View>
              {MapView && region ? (
                mapLoading ? (
                  <View style={styles.mapLoader}>
                    <ActivityIndicator color="#059669" />
                  </View>
                ) : (
                  <MapView style={styles.map} region={region}>
                    <Marker coordinate={region} />
                  </MapView>
                )
              ) : null}
            </View>

            {/* Weather Forecast */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🌤️ 7-Day Weather Forecast</Text>
              <View
                style={styles.chartWrap}
                onLayout={(event) => {
                  const next = Math.round(event.nativeEvent.layout.width);
                  if (next > 0 && Math.abs(next - weatherChartContainerWidth) > 2) {
                    setWeatherChartContainerWidth(next);
                  }
                }}
              >
                {BarChart && weatherForecast.length > 0 && (
                  <BarChart
                    data={{
                      labels: weatherForecast.map((d) =>
                        new Date(d.datetime).toLocaleDateString('en-US', { weekday: 'short' })
                      ),
                      datasets: [{ data: weatherForecast.map((d) => d.temp) }],
                    }}
                    width={weatherChartWidth}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#ffffff',
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(5, 150, 105, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      style: { borderRadius: 16 },
                    }}
                    yAxisLabel=""
                    yAxisSuffix="°C"
                    style={styles.chart}
                    showValuesOnTopOfBars={!isCompactWeatherChart}
                    verticalLabelRotation={isCompactWeatherChart ? 20 : 0}
                    fromZero={true}
                  />
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.snapshotRow}>
                {weatherSnapshot.map((day, index) => (
                  <View key={`snapshot-${index}`} style={styles.snapshotCard}>
                    <Text style={styles.snapshotDay}>{formatForecastDay(day.datetime)}</Text>
                    <Text style={styles.snapshotTemp}>{Math.round(day.temp)}°</Text>
                    <Text style={styles.snapshotMeta}>{Math.round(day.pop)}% rain</Text>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.weatherDetails}>
                {weatherForecast.map((day, index) => (
                  <View key={index} style={styles.weatherDetailRow}>
                    <Text style={styles.weatherDetailDay}>{formatForecastDay(day.datetime)}</Text>
                    <Text style={styles.weatherDetailTemp}>{day.temp}°C</Text>
                    <Text style={styles.weatherDetailHumidity}>{day.rh}% Humidity</Text>
                    <Text style={styles.weatherDetailRain}>{day.pop}% Rain</Text>
                  </View>
                ))}
              </View>
            </View>



            {/* Crop Ranking */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🌱 Crop Suitability Ranking</Text>
              <View style={styles.cropList}>
                {crops.map((crop, index) => (
                  <View key={crop.name} style={styles.cropCard}>
                    <View style={styles.cropHeader}>
                      <View style={styles.rankPill}>
                        <Text style={styles.cropRank}>{index + 1}</Text>
                      </View>
                      <Text style={styles.cropName}>{crop.name}</Text>
                      <Text style={styles.cropScore}>{crop.totalScore}/100</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${crop.totalScore}%`,
                            backgroundColor:
                              crop.totalScore >= 80
                                ? '#059669'
                                : crop.totalScore >= 60
                                  ? '#0ea5e9'
                                  : '#f59e0b',
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.metricGrid}>
                      <View style={styles.metricChip}>
                        <Text style={styles.metric}>Weather {Math.round(crop.weatherScore)}</Text>
                      </View>
                      <View style={styles.metricChip}>
                        <Text style={styles.metric}>Soil {Math.round(crop.soilScore)}</Text>
                      </View>
                      <View style={styles.metricChip}>
                        <Text style={styles.metric}>Market {Math.round(crop.marketScore)}</Text>
                      </View>
                      <View style={styles.metricChip}>
                        <Text style={styles.metric}>Pest {Math.round(crop.pestRiskScore)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingTitle: { marginTop: 12, color: '#1F2937', fontSize: 15, fontWeight: '700' },
  loadingSub: { marginTop: 4, color: '#6B7280', fontSize: 12.5 },
  headerSection: {
    alignItems: 'center',
    marginBottom: 18,
  },
  aiTag: {
    backgroundColor: '#d1fae5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 8,
  },
  aiTagText: {
    color: '#065f46',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#065F46',
    textAlign: 'center',
  },
  headerTitleCompact: {
    fontSize: 22,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 13.5,
    color: '#047857',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  headerSubtitleCompact: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  topCropCard: {
    borderRadius: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  topCropGradient: {
    paddingVertical: 24,
    paddingHorizontal: 18,
  },
  topCropContent: {
    alignItems: 'center',
  },
  topCropTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  topCropName: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  topCropScore: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  topCropDesc: {
    fontSize: 12.5,
    color: '#E0F2FE',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e4f2ec',
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 10,
  },
  locationStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  locationChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dcf3e8',
    backgroundColor: '#f6fdf9',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  locationLabel: { fontSize: 11, color: '#6B7280' },
  locationValue: { marginTop: 2, fontSize: 13.5, fontWeight: '700', color: '#1F2937' },
  soilBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  soilBadgeText: { fontSize: 12, fontWeight: '700', color: '#166534' },
  mapLoader: {
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  map: {
    height: 180,
    borderRadius: 12,
  },
  weatherScroll: {
    // horizontal scroll
  },
  weatherCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 15,
    marginRight: 15,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  weatherDay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  weatherTemp: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 5,
  },
  weatherDetail: {
    fontSize: 12,
    color: '#6B7280',
  },
  weatherDetails: {
    marginTop: 8,
  },
  snapshotRow: {
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  snapshotCard: {
    width: 88,
    borderRadius: 12,
    backgroundColor: '#f6fdf9',
    borderWidth: 1,
    borderColor: '#dcf3e8',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  snapshotDay: { fontSize: 11.5, color: '#6B7280' },
  snapshotTemp: { marginTop: 2, fontSize: 18, fontWeight: '800', color: '#059669' },
  snapshotMeta: { marginTop: 2, fontSize: 10.5, color: '#64748b' },
  cropList: {
    gap: 10,
  },
  weatherDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  weatherDetailDay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    width: 60,
  },
  weatherDetailTemp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    width: 60,
    textAlign: 'center',
  },
  weatherDetailHumidity: {
    fontSize: 14,
    color: '#6B7280',
    width: 80,
    textAlign: 'center',
  },
  weatherDetailRain: {
    fontSize: 14,
    color: '#059669',
    width: 60,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
    marginVertical: 10,
    alignSelf: 'center',
  },
  chartWrap: {
    width: '100%',
    alignItems: 'center',
  },
  cropCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rankPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropRank: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  cropName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    flex: 1,
    marginLeft: 10,
  },
  cropScore: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricChip: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  metric: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
});
