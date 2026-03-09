import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import GreenHeader from '@/components/GreenHeader';

// Conditionally import LineChart for native platforms only
let LineChart: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line no-eval, @typescript-eslint/no-unsafe-assignment
    const Charts = eval("require('react-native-chart-kit')");
    LineChart = Charts.LineChart;
  } catch (e) {
    console.warn('Could not load react-native-chart-kit', e);
  }
}

// Conditionally import MapView for native platforms only
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  try {
    // load through eval so Metro doesn't statically analyze the string
    // eslint-disable-next-line no-eval, @typescript-eslint/no-unsafe-assignment
    const Maps = eval("require('react-native-maps')");
    MapView = Maps.MapView;
    Marker = Maps.Marker;
  } catch (e) {
    console.warn('Could not load react-native-maps', e);
  }
}

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
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [region, setRegion] = useState<any>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [weatherForecast, setWeatherForecast] = useState<any[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [soilType, setSoilType] = useState('Detecting...');
  const [loading, setLoading] = useState(true);
  
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setSoilType('Permission Denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });

      // Simulate soil type based on latitude (for demo)
      const soils = ['Loamy Soil', 'Clay Soil', 'Sandy Soil', 'Silty Soil', 'Alluvial Soil', 'Saline Soil'];
      const index = Math.floor((loc.coords.latitude % 6));
      setSoilType(soils[index]);
    };
    fetchLocation();
  }, []);

  // Fetch weather forecast (7-day + monthly approximation)
  useEffect(() => {
    const fetchWeather = async () => {
      if (!location) return;
      try {
        const API_KEY = '529094980f6e4316be96ffc561515561';
        const url = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${location.coords.latitude}&lon=${location.coords.longitude}&key=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && Array.isArray(data.data)) {
          setWeatherForecast(data.data.slice(0, 7)); // 7-day forecast
        } else {
          console.warn('Unexpected weather payload', data);
          setWeatherForecast([]);
        }
      } catch (e) {
        console.error('Failed fetching weather', e);
        setWeatherForecast([]);
      }
    };
    fetchWeather();
  }, [location]);

  // Fetch market prices
  useEffect(() => {
    const fetchMarketPrices = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/calculator/prices/crop');
        const data = await res.json();
        setMarketPrices(data); // { Rice: 120, Wheat: 100, ... }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMarketPrices();
  }, []);

  // Calculate crop suitability scores
  useEffect(() => {
    if (!weatherForecast.length || !Object.keys(marketPrices).length) return;
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
  }, [weatherForecast, marketPrices, soilType]);

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <GreenHeader title={{ english: 'Crop Recommendations', urdu: 'تجویز کردہ فصلیں' }} onBack={() => router.back()} />
      <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
        <ActivityIndicator size="large" color="#2f6f5f" />
        <Text style={{marginTop:12}}>Calculating best crops...</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <GreenHeader title={{ english: 'Agricultural Report', urdu: 'زرعی رپورٹ' }} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.reportHeader}>
          <Text style={styles.reportTitle}>Crop Recommendation Analysis</Text>
          <Text style={styles.reportDate}>Generated on {new Date().toLocaleDateString()}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>📊 Summary</Text>
          <Text style={styles.summaryText}>Based on current location, soil type, and weather conditions, here are the top recommended crops for optimal yield and profitability.</Text>
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{crops.length}</Text>
              <Text style={styles.statLabel}>Crops Analyzed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weatherForecast.length}</Text>
              <Text style={styles.statLabel}>Days Forecast</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(crops[0]?.totalScore || 0)}</Text>
              <Text style={styles.statLabel}>Top Score</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📍 Location & Soil Analysis</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Location Map</Text>
              <TouchableOpacity style={styles.mapContainer} onPress={() => {/* Could expand map or show details */}}>
                {Platform.OS !== 'web' && MapView && region ? (
                  <MapView
                    style={styles.miniMap}
                    region={region}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                  >
                    <Marker coordinate={region} />
                  </MapView>
                ) : (
                  <View style={styles.mapPlaceholder}>
                    <Text style={styles.mapPlaceholderText}>📍 Map View</Text>
                    <Text style={styles.mapPlaceholderSubtext}>Tap to view location</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Soil Type</Text>
              <Text style={styles.infoValue}>{soilType}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Coordinates</Text>
              <Text style={styles.infoValue}>
                {location?.coords.latitude.toFixed(4)}, {location?.coords.longitude.toFixed(4)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🌦 Weather Forecast & Trends</Text>
          <View style={styles.weatherList}>
            {weatherForecast.map((day, idx) => (
              <View key={idx} style={styles.weatherItem}>
                <Text style={styles.weatherDay}>Day {idx+1}</Text>
                <Text style={styles.weatherTemp}>{day.temp}°C</Text>
                <Text style={styles.weatherHumidity}>{day.rh}% RH</Text>
              </View>
            ))}
          </View>
          {weatherForecast.length > 0 && (
            Platform.OS !== 'web' && LineChart ? (
              <LineChart
                data={{
                  labels: weatherForecast.map((_, idx) => `D${idx+1}`),
                  datasets: [{
                    data: weatherForecast.map(day => day.temp),
                    color: () => '#3B82F6',
                    strokeWidth: 3,
                  }],
                }}
                width={Dimensions.get('window').width - 72}
                height={200}
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#F1F5F9',
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: '5',
                    strokeWidth: '2',
                    stroke: '#3B82F6',
                  },
                }}
                bezier
                style={{ marginVertical: 16, borderRadius: 16 }}
              />
            ) : (
              <View style={styles.webChartContainer}>
                <Text style={styles.webChartTitle}>📊 Temperature Trend</Text>
                <View style={styles.webChartData}>
                  {weatherForecast.slice(0, 7).map((day, idx) => (
                    <View key={idx} style={styles.webChartBar}>
                      <Text style={styles.webChartLabel}>D{idx+1}</Text>
                      <View style={[styles.webChartBarFill, { height: Math.max(20, (day.temp / 40) * 100) }]}>
                        <Text style={styles.webChartValue}>{day.temp}°</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🌾 Recommended Crops Ranking</Text>
          {crops.map((crop, index) => (
            <View key={crop.name} style={[styles.cropCard, index === 0 && styles.topCrop]}>
              <View style={styles.cropHeader}>
                <Text style={styles.cropRank}>#{index + 1}</Text>
                <Text style={styles.cropName}>{crop.name}</Text>
                <Text style={styles.cropScore}>{crop.totalScore}/100</Text>
              </View>
              <View style={styles.cropMetrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Weather</Text>
                  <Text style={styles.metricValue}>{Math.round(crop.weatherScore)}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Soil</Text>
                  <Text style={styles.metricValue}>{crop.soilScore}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Market</Text>
                  <Text style={styles.metricValue}>{crop.marketScore}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Pest Risk</Text>
                  <Text style={styles.metricValue}>{crop.pestRiskScore}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  reportHeader: {
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  reportTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 4,
  },
  mapContainer: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  miniMap: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  mapPlaceholderSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  weatherList: {
    marginBottom: 16,
  },
  weatherItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  weatherDay: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    width: 60,
  },
  weatherTemp: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
  weatherHumidity: {
    fontSize: 14,
    color: '#6B7280',
  },
  webChartContainer: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  webChartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  webChartData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  webChartBar: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  webChartLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  webChartBarFill: {
    width: 30,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    justifyContent: 'flex-end',
    alignItems: 'center',
    minHeight: 20,
  },
  webChartValue: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  cropCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topCrop: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  cropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cropRank: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  cropName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    textAlign: 'center',
  },
  cropScore: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  cropMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
});