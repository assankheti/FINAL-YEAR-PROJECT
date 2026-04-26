import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import GreenHeader from '@/components/GreenHeader';

import { LineChart, BarChart, MapView, Marker } from '@/lib/native-charts';

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

  // navigation helper with fallback
  const handleBack = () => {
    // navigate back to farmer dashboard explicitly
    router.replace('/farmer-dashboard');
  };

  // custom bar graph renderer (works on web/mobile without external lib)
  const renderBarGraph = (tempData: number[]) => {
    const maxVal = Math.max(...tempData, 1);
    return (
      <View style={styles.barGraphContainer}>
        {tempData.map((val, idx) => (
          <View key={idx} style={[styles.bar, { height: (val / maxVal) * 150 + 20 }]} />
        ))}
      </View>
    );
  };
  const [region, setRegion] = useState<any>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [weatherForecast, setWeatherForecast] = useState<any[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [soilType, setSoilType] = useState('Detecting...');
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  
  // Timeout for loading - if still loading after 8 seconds, force finish with fallback data
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && crops.length === 0) {
        console.warn('Loading timeout - using fallback data');
        // Create default crops if still loading
        const month = new Date().getMonth();
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
        if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
        const data = await res.json();
        if (data && Array.isArray(data.data)) {
          setWeatherForecast(data.data.slice(0, 7)); // 7-day forecast
        } else {
          console.warn('Unexpected weather payload', data);
          // Use fallback weather data
          setWeatherForecast([
            { datetime: new Date().toISOString(), temp: 28, rh: 70, pop: 20 },
            { datetime: new Date(Date.now() + 86400000).toISOString(), temp: 29, rh: 65, pop: 15 },
          ]);
        }
      } catch (e) {
        console.warn('Failed fetching weather, using defaults:', e);
        // Use fallback weather data to prevent infinite loading
        setWeatherForecast([
          { datetime: new Date().toISOString(), temp: 28, rh: 70, pop: 20 },
          { datetime: new Date(Date.now() + 86400000).toISOString(), temp: 29, rh: 65, pop: 15 },
          { datetime: new Date(Date.now() + 2*86400000).toISOString(), temp: 27, rh: 75, pop: 25 },
        ]);
      }
    };
    fetchWeather();
  }, [location]);

  // Fetch market prices
  useEffect(() => {
    const fetchMarketPrices = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/calculator/prices/crop');
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

  if (loading) return (
    <LinearGradient colors={['#FFFFFF', '#F0FDF4']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <GreenHeader title={{ english: 'Crop Recommendations', urdu: 'تجویز کردہ فصلیں' }} onBack={handleBack} />
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={{marginTop:12, color: '#1F2937'}}>Calculating best crops...</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  return (
    <LinearGradient colors={['#FFFFFF', '#F0FDF4']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <GreenHeader title={{ english: 'Crop Recommendations', urdu: 'تجویز کردہ فصلیں' }} onBack={handleBack} />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.headerTitle}>Smart Crop Recommendation</Text>
            <Text style={styles.headerSubtitle}>Smart farming insights</Text>
          </View>

          {/* Top Recommended Crop Card */}
          <Animated.View style={[styles.topCropCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient colors={['#059669', '#047857']} style={styles.topCropGradient}>
              <View style={styles.topCropContent}>
                <Text style={styles.topCropTitle}>🌾 Top Recommendation</Text>
                <Text style={styles.topCropName}>{crops[0]?.name}</Text>
                <Text style={styles.topCropScore}>Suitability Score: {crops[0]?.totalScore}/100</Text>
                <Text style={styles.topCropDesc}>Based on current weather, soil conditions, and market prices</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Location & Soil Analysis */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📍 Location & Soil Analysis</Text>
              <View style={styles.cardContent}>
                <Text style={styles.cardText}>Latitude: {location?.coords.latitude.toFixed(4)}</Text>
                <Text style={styles.cardText}>Longitude: {location?.coords.longitude.toFixed(4)}</Text>
                <Text style={styles.cardText}>Soil Type: {soilType}</Text>
                {MapView && region && (
                  <MapView style={styles.map} region={region}>
                    <Marker coordinate={region} />
                  </MapView>
                )}
              </View>
            </View>

            {/* Weather Forecast */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🌤️ 7-Day Weather Forecast</Text>
              {BarChart && weatherForecast.length > 0 && (
                <BarChart
                  data={{
                    labels: weatherForecast.map(d => new Date(d.datetime).toLocaleDateString('en-US', { weekday: 'short' })),
                    datasets: [{ data: weatherForecast.map(d => d.temp) }]
                  }}
                  width={width - 40}
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
                  showValuesOnTopOfBars={true}
                  fromZero={true}
                />
              )}
              <View style={styles.weatherDetails}>
                {weatherForecast.map((day, index) => (
                  <View key={index} style={styles.weatherDetailRow}>
                    <Text style={styles.weatherDetailDay}>{new Date(day.datetime).toLocaleDateString('en-US', { weekday: 'short' })}</Text>
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
                      <Text style={styles.cropRank}>{index + 1}</Text>
                      <Text style={styles.cropName}>{crop.name}</Text>
                      <Text style={styles.cropScore}>{crop.totalScore}/100</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${crop.totalScore}%` }]} />
                    </View>
                    <View style={styles.cropMetrics}>
                      <Text style={styles.metric}>Weather: {crop.weatherScore.toFixed(2)}</Text>
                      <Text style={styles.metric}>Soil: {crop.soilScore}</Text>
                      <Text style={styles.metric}>Market: {crop.marketScore}</Text>
                      <Text style={styles.metric}>Pest Risk: {crop.pestRiskScore}</Text>
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
    padding: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#065F46',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#047857',
    textAlign: 'center',
    marginTop: 8,
  },
  topCropCard: {
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  topCropGradient: {
    padding: 30,
  },
  topCropContent: {
    alignItems: 'center',
  },
  topCropTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  topCropName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  topCropScore: {
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  topCropDesc: {
    fontSize: 14,
    color: '#E0F2FE',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
  },
  cardContent: {
    // flex
  },
  cardText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 10,
  },
  map: {
    height: 200,
    borderRadius: 12,
    marginTop: 10,
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
    marginTop: 20,
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
  barGraphContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  bar: {
    width: 20,
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 10,
  },
  cropList: {
    // flex
  },
  cropCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
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
  cropRank: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
    width: 30,
  },
  cropName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  cropScore: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 15,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  cropMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    textAlign: 'center',
  },
});