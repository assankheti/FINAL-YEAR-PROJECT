import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart } from 'react-native-chart-kit';
import GreenHeader from '@/components/GreenHeader';
import { SpeechHighlight } from '@/components/SpeechHighlight';
import { useLanguage } from '@/contexts/LanguageContext';
import { API_BASE } from '@/config/env';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';

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
  const { textLanguage } = useLanguage();
  const { enabled: voiceEnabled, activeHighlightId, startGuidedSequence, cancelGuidedSequence, stop } =
    useVoiceGuidance();
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];

  // navigation helper with fallback
  const handleBack = () => {
    // navigate back to farmer dashboard explicitly
    router.replace('/farmer-dashboard');
  };

  const [region, setRegion] = useState<any>({
    latitude: 31.5204,
    longitude: 74.3587,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [crops, setCrops] = useState<Crop[]>([]);
  const [weatherForecast, setWeatherForecast] = useState<any[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [soilType, setSoilType] = useState('Loamy Soil');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [weatherChartContainerWidth, setWeatherChartContainerWidth] = useState(0);
  const [isCompactWeatherChart, setIsCompactWeatherChart] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [hasCachedData, setHasCachedData] = useState(false);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  const CACHE_KEY = 'crop-recommendation-cache-v1';

  const saveRecommendationCache = async (cacheData: {
    crops: Crop[];
    weatherForecast: any[];
    marketPrices: Record<string, number>;
    soilType: string;
    region: any;
  }) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.warn('Failed to save crop recommendation cache', e);
    }
  };

  const loadRecommendationCache = async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.crops?.length) {
        setCrops(parsed.crops);
        setWeatherForecast(parsed.weatherForecast ?? []);
        setMarketPrices(parsed.marketPrices ?? {});
        setSoilType(parsed.soilType ?? DEFAULT_SOIL);
        setRegion(parsed.region ?? DEFAULT_COORDS);
        setHasCachedData(true);
        setError(null);
        setLoading(false);
      }
    } catch (e) {
      console.warn('Failed to load crop recommendation cache', e);
    }
  };

  // ensure fetchKey is referenced so linters don't mark it unused
  useEffect(() => {
    // noop log to tie fetchKey into the component lifecycle
    // (avoids false-positive unused-var warnings when used only in deps)
    // eslint-disable-next-line no-console
    console.log('fetchKey', fetchKey);
  }, [fetchKey]);
  const DEFAULT_COORDS = { latitude: 31.5204, longitude: 74.3587 };
  const DEFAULT_SOIL = 'Loamy Soil';

  const topCrop = crops[0];
  const formatCoord = (value?: number) =>
    typeof value === 'number' && Number.isFinite(value) ? value.toFixed(4) : '--';
  const formatForecastDay = (value?: string) => {
    if (!value) return '--';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '--';
    return dt.toLocaleDateString(textLanguage === 'urdu' ? 'ur-PK' : 'en-US', { weekday: 'short' });
  };
  const buildFallbackWeather = (startMs: number = Date.now(), days: number = 7) =>
    Array.from({ length: days }, (_, i) => ({
      datetime: new Date(startMs + i * 86400000).toISOString(),
      temp: 27 + ((i % 3) - 1),
      rh: 68 + (i % 4) * 3,
      pop: 15 + (i % 5) * 8,
    }));

  const t = useMemo(() => {
    const isUrdu = textLanguage === 'urdu';
    return {
      pageTitle: isUrdu ? 'فصل کی تجویز' : 'Crop Recommendation',
      pageTitleLong: isUrdu ? 'تجویز کردہ فصلیں' : 'Crop Recommendation',
      pageDescription: isUrdu
        ? 'موسم، مٹی، اور منڈی کے حالات دیکھ کر اپنی فصل کے لیے بہتر انتخاب دیکھیں۔'
        : 'Review the best crop choices based on weather, soil, and market conditions.',
      loadingTitle: isUrdu ? 'سمارٹ سفارش تیار ہو رہی ہے...' : 'Building Smart Recommendation...',
      loadingSub: isUrdu ? 'موسم، مٹی، اور منڈی کے اشاروں کا تجزیہ کیا جا رہا ہے' : 'Analyzing weather, soil, and market signals',
      headerTitle: isUrdu ? 'فصل کی تجویز' : 'Crop Recommendation',
      headerSubtitle: isUrdu
        ? 'اپنے فارم کی موجودہ صورتحال کے مطابق تجویز دیکھیں۔'
        : 'Data-driven suggestions for your current farm conditions',
      topTitle: isUrdu ? 'بہترین تجویز' : 'Top Recommendation',
      topDesc: isUrdu
        ? 'براہ راست موسم، مٹی، اور منڈی کے رجحانات پر مبنی'
        : 'Based on live weather, soil profile, and mandi trends',
      suitability: isUrdu ? 'موزونیت' : 'Suitability Score',
      locationTitle: isUrdu ? 'مقام اور مٹی کا تجزیہ' : 'Location & Soil Analysis',
      latitude: isUrdu ? 'عرض بلد' : 'Latitude',
      longitude: isUrdu ? 'طول بلد' : 'Longitude',
      soil: isUrdu ? 'مٹی' : 'Soil',
      farmLocationReady: isUrdu ? 'کھیت کا مقام تیار ہے' : 'Farm location ready',
      liveMapDisabled: isUrdu ? 'APK کو مستحکم رکھنے کے لیے لائیو نقشہ بند ہے۔' : 'Live map is disabled here to keep the APK stable.',
      weatherTitle: isUrdu ? '7 روزہ موسم کی پیش گوئی' : '7-Day Weather Forecast',
      weatherRain: isUrdu ? 'بارش' : 'rain',
      weatherHumidity: isUrdu ? 'نمی' : 'humidity',
      rankingTitle: isUrdu ? 'فصل کی موزونیت کی درجہ بندی' : 'Crop Suitability Ranking',
      weatherMetric: isUrdu ? 'موسم' : 'Weather',
      soilMetric: isUrdu ? 'مٹی' : 'Soil',
      marketMetric: isUrdu ? 'منڈی' : 'Market',
      pestMetric: isUrdu ? 'کیڑا' : 'Pest',
      scoreLabel: isUrdu ? 'اسکور' : 'score',
      noCrop: isUrdu ? 'ابھی کوئی سفارش نہیں' : 'No recommendations yet',
      locationReady: isUrdu ? 'کھیت کا مقام تیار ہے' : 'Farm location ready',
      latLon: isUrdu ? 'عرض و طول بلد' : 'Lat / Lon',
    };
  }, [textLanguage]);

  const cropNameMap = useMemo(
    () => ({
      Rice: textLanguage === 'urdu' ? 'چاول' : 'Rice',
      Wheat: textLanguage === 'urdu' ? 'گندم' : 'Wheat',
      Corn: textLanguage === 'urdu' ? 'مکئی' : 'Corn',
      Sugarcane: textLanguage === 'urdu' ? 'گنا' : 'Sugarcane',
      Potato: textLanguage === 'urdu' ? 'آلو' : 'Potato',
    }),
    [textLanguage]
  );

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
  const isSmallScreen = width < 360;

  const pageGuidedSteps = useMemo(() => {
    const steps: { id: string; text: string }[] = [
      {
        id: 'croprec.header',
        text:
          textLanguage === 'urdu'
            ? `${t.pageTitle}۔ ${t.pageDescription}`
            : `${t.pageTitle}. ${t.pageDescription}`,
      },
    ];

    if (topCrop) {
      steps.push({
        id: 'croprec.top',
        text:
          textLanguage === 'urdu'
            ? `${t.topTitle}۔ ${cropNameMap[topCrop.name as keyof typeof cropNameMap] ?? topCrop.name}۔ ${t.suitability} ${topCrop.totalScore}۔ ${t.topDesc}`
            : `${t.topTitle}. ${topCrop.name}. ${t.suitability} ${topCrop.totalScore}. ${t.topDesc}`,
      });
    }

    steps.push({
      id: 'croprec.location',
      text:
        textLanguage === 'urdu'
          ? `${t.locationTitle}۔ ${t.latitude} ${formatCoord(location?.coords?.latitude ?? region?.latitude)}۔ ${t.longitude} ${formatCoord(location?.coords?.longitude ?? region?.longitude)}۔ ${t.soil} ${soilType}۔ ${t.liveMapDisabled}`
          : `${t.locationTitle}. ${t.latitude} ${formatCoord(location?.coords?.latitude ?? region?.latitude)}. ${t.longitude} ${formatCoord(location?.coords?.longitude ?? region?.longitude)}. ${t.soil} ${soilType}. ${t.liveMapDisabled}`,
    });

    steps.push({
      id: 'croprec.weather',
      text:
        textLanguage === 'urdu'
          ? `${t.weatherTitle}۔ ${weatherSnapshot
              .slice(0, 3)
              .map((day) => `${formatForecastDay(day.datetime)} ${Math.round(day.temp)} ڈگری، ${Math.round(day.rh)} فیصد ${t.weatherHumidity}، ${Math.round(day.pop)} فیصد ${t.weatherRain}`)
              .join('۔ ')}۔`
          : `${t.weatherTitle}. ${weatherSnapshot
              .slice(0, 3)
              .map((day) => `${formatForecastDay(day.datetime)} ${Math.round(day.temp)} degrees, ${Math.round(day.rh)} percent humidity, ${Math.round(day.pop)} percent rain`)
              .join('. ')}.`,
    });

    steps.push({
      id: 'croprec.ranking',
      text:
        textLanguage === 'urdu'
          ? `${t.rankingTitle}۔ ${crops
              .slice(0, 3)
              .map((crop) => `${cropNameMap[crop.name as keyof typeof cropNameMap] ?? crop.name} ${t.scoreLabel} ${crop.totalScore}`)
              .join('۔ ')}۔`
          : `${t.rankingTitle}. ${crops
              .slice(0, 3)
              .map((crop) => `${crop.name} ${t.scoreLabel} ${crop.totalScore}`)
              .join('. ')}.`,
    });

    crops.forEach((crop) => {
      steps.push({
        id: `croprec.crop.${crop.name}`,
        text:
          textLanguage === 'urdu'
            ? `${cropNameMap[crop.name as keyof typeof cropNameMap] ?? crop.name}۔ ${t.scoreLabel} ${crop.totalScore}۔ ${t.weatherMetric} ${Math.round(crop.weatherScore)}۔ ${t.soilMetric} ${Math.round(crop.soilScore)}۔ ${t.marketMetric} ${Math.round(crop.marketScore)}۔ ${t.pestMetric} ${Math.round(crop.pestRiskScore)}۔`
            : `${crop.name}. ${t.scoreLabel} ${crop.totalScore}. ${t.weatherMetric} ${Math.round(crop.weatherScore)}. ${t.soilMetric} ${Math.round(crop.soilScore)}. ${t.marketMetric} ${Math.round(crop.marketScore)}. ${t.pestMetric} ${Math.round(crop.pestRiskScore)}.`,
      });
    });

    return steps;
  }, [cropNameMap, crops, formatCoord, location, region, soilType, t, textLanguage, topCrop, weatherSnapshot]);

  const pageSequenceStartedRef = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      pageSequenceStartedRef.current = false;
      return () => {
        pageSequenceStartedRef.current = false;
        cancelGuidedSequence();
        stop();
      };
    }, [cancelGuidedSequence, stop])
  );

  useEffect(() => {
    if (!voiceEnabled || loading || !pageGuidedSteps.length || pageSequenceStartedRef.current) return;
    pageSequenceStartedRef.current = true;
    cancelGuidedSequence();
    startGuidedSequence(pageGuidedSteps);
  }, [cancelGuidedSequence, loading, pageGuidedSteps, startGuidedSequence, voiceEnabled]);
  
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

  // Use safe default location/soil on mobile builds to avoid native permission crashes.
  useEffect(() => {
    const soils = ['Loamy Soil', 'Clay Soil', 'Sandy Soil', 'Silty Soil', 'Alluvial Soil', 'Saline Soil'];
    const index = Math.floor((Math.abs(DEFAULT_COORDS.latitude) % 6));
    setSoilType(soils[index] || DEFAULT_SOIL);
    setRegion({
      latitude: DEFAULT_COORDS.latitude,
      longitude: DEFAULT_COORDS.longitude,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    });
  }, []);

  // Fetch weather forecast (7-day + monthly approximation)
  useEffect(() => {
    let mounted = true;
    const subscription = NetInfo.addEventListener((state) => {
      if (mounted) setIsConnected(state.isConnected ?? false);
    });

    const initialize = async () => {
      try {
        const state = await NetInfo.fetch();
        if (mounted) setIsConnected(state.isConnected ?? false);
      } catch (err) {
        console.warn('Failed to fetch initial network state', err);
        if (mounted) setIsConnected(false);
      }

      await loadRecommendationCache();
      if (mounted) setCacheLoaded(true);
    };

    initialize();
    return () => {
      mounted = false;
      subscription();
    };
  }, []);

  useEffect(() => {
    if (hasCachedData) {
      setError(null);
    }
  }, [hasCachedData]);

  useEffect(() => {
    const fetchWeather = async () => {
      if (isConnected === null || !cacheLoaded) return;

      if (isConnected === false) {
        if (!hasCachedData) {
          setError('Offline and no cached weather data available');
          setWeatherForecast(buildFallbackWeather());
          setLoading(false);
        } else {
          setError(null);
          setLoading(false);
        }
        return;
      }

      const latitude = region?.latitude;
      const longitude = region?.longitude;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return;
      try {
        const API_KEY = '529094980f6e4316be96ffc561515561';
        const url = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${latitude}&lon=${longitude}&key=${API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) {
          if (!hasCachedData) {
            setError('Failed to load weather data');
            setWeatherForecast(buildFallbackWeather());
          }
          return;
        }
        const text = await res.text();
        if (!text || !text.trim()) {
          if (!hasCachedData) {
            setError('Failed to load weather data');
            setWeatherForecast(buildFallbackWeather());
          }
          return;
        }
        const data = JSON.parse(text);
        if (data && Array.isArray(data.data)) {
          setWeatherForecast(normalizeSevenDayForecast(data.data));
          setError(null);
        } else if (!hasCachedData) {
          setWeatherForecast(buildFallbackWeather());
        }
      } catch (err) {
        console.error('Weather fetch failed', err);
        if (!hasCachedData) {
          setError('Failed to load weather data');
          setWeatherForecast(buildFallbackWeather());
        }
      }
    };

    fetchWeather().catch((e) => {
      console.error('Unhandled fetchWeather rejection', e);
      if (!hasCachedData) setError('Weather fetch failed');
    });
  }, [region, fetchKey, isConnected, hasCachedData]);

  useEffect(() => {
    const fetchMarketPrices = async () => {
      if (isConnected === null || !cacheLoaded) return;

      if (isConnected === false) {
        if (!hasCachedData) {
          setError('Offline and no cached market data available');
          setMarketPrices({
            Rice: 120,
            Wheat: 100,
            Corn: 90,
            Sugarcane: 80,
            Potato: 70,
          });
          setLoading(false);
        } else {
          setError(null);
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/v1/calculator/prices/crop`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        let data: any = null;
        try {
          data = await res.json();
        } catch (e) {
          console.warn('Market prices: failed to parse JSON response', e);
          data = null;
        }

        const defaultPrices: Record<string, number> = {
          Rice: 120,
          Wheat: 100,
          Corn: 90,
          Sugarcane: 80,
          Potato: 70,
        };

        const isValidPrices =
          data && typeof data === 'object' && !Array.isArray(data) &&
          Object.keys(data).length > 0 &&
          Object.keys(data).every((k) => typeof (data as any)[k] === 'number');

        if (!isValidPrices) {
          console.warn('Market prices response invalid, falling back to defaults', data);
          setMarketPrices(defaultPrices);
        } else {
          setMarketPrices(data);
          setError(null);
        }
      } catch (err) {
        console.warn('Failed to fetch market prices, using defaults:', err);
        console.error(err);
        if (!hasCachedData) {
          setError('Failed to load market prices');
          setMarketPrices({
            Rice: 120,
            Wheat: 100,
            Corn: 90,
            Sugarcane: 80,
            Potato: 70,
          });
        }
      }
    };
    fetchMarketPrices().catch((e) => {
      console.error('Unhandled fetchMarketPrices rejection', e);
      if (!hasCachedData) setError('Market prices fetch failed');
    });
  }, [fetchKey, isConnected, hasCachedData]);

  // Fetch market prices
  // Calculate crop suitability scores
  useEffect(() => {
    console.log('Calculating crops...', { weatherForecast: weatherForecast.length, marketPrices: Object.keys(marketPrices).length, soilType });
    try {
      if (!weatherForecast.length || !Object.keys(marketPrices).length) {
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
      const marketRaw = marketPrices[cropName];
      const marketVal = Number(marketRaw);
      const marketScore = Number.isFinite(marketVal) && marketVal > 0 ? Math.min(100, marketVal) : 50;
      const pestRiskScore = 100 - simulatePestRisk(cropName, month);
      const totalScore = Math.round((tempScore + humidityScore + soilScore + areaScore + marketScore + pestRiskScore) / 6);
      return { name: cropName, weatherScore: tempScore, soilScore, areaScore, marketScore, pestRiskScore, totalScore };
    });
    const sortedCrops = calculatedCrops.sort((a,b) => b.totalScore - a.totalScore);
    setCrops(sortedCrops);
    saveRecommendationCache({
      crops: sortedCrops,
      weatherForecast,
      marketPrices,
      soilType,
      region,
    });
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
    } catch (err) {
      console.error('Error calculating crops', err);
      setError('Failed to calculate crop recommendations');
      setLoading(false);
    }
  }, [weatherForecast, marketPrices, soilType]);

  // Retry helper
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setFetchKey((k) => k + 1);
  };

  if (loading)
    return (
      <LinearGradient colors={['#FFFFFF', '#F0FDF4']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <GreenHeader
            title={t.pageTitleLong}
            titleLines={2}
            onBack={handleBack}
          />
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingTitle}>{t.loadingTitle}</Text>
            <Text style={styles.loadingSub}>{t.loadingSub}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );

    if (error)
      return (
        <LinearGradient colors={['#FFFFFF', '#F0FDF4']} style={styles.container}>
          <SafeAreaView style={styles.safeArea}>
            <GreenHeader
              title={{ english: 'Crop Recommendation', urdu: 'تجویز کردہ فصلیں' }}
              titleLines={2}
              onBack={handleBack}
            />
            <View style={[styles.card, { margin: 16 }]}>
              <Text style={styles.cardTitle}>Could not load recommendations</Text>
              <Text style={{ color: '#6B7280', marginTop: 8 }}>{error}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Text onPress={handleRetry} style={{ color: '#059669', fontWeight: '700' }}>Retry</Text>
                <Text onPress={handleBack} style={{ color: '#047857', fontWeight: '700' }}>Back</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      );

  return (
    <LinearGradient colors={['#FFFFFF', '#F0FDF4']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <GreenHeader
          title={t.pageTitleLong}
          titleLines={2}
          onBack={handleBack}
        />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Location & Soil Analysis */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📍 Location & Soil Analysis</Text>
              <View style={styles.locationStats}>
                <View style={styles.locationChip}>
                  <Text style={styles.locationLabel}>Latitude</Text>
                  <Text style={styles.locationValue}>
                    {formatCoord(region?.latitude)}
                  </Text>
                </View>
                <View style={styles.locationChip}>
                  <Text style={styles.locationLabel}>Longitude</Text>
                  <Text style={styles.locationValue}>
                    {formatCoord(region?.longitude)}
                  </Text>
                </View>
              </View>
              <View style={styles.soilBadge}>
                <Text style={styles.soilBadgeText}>Soil: {soilType}</Text>
              </View>
              <View style={styles.mapFallback}>
                <Text style={styles.mapFallbackTitle}>Farm location ready</Text>
                <Text style={styles.mapFallbackText}>
                  Lat {formatCoord(region?.latitude)} | Lon {formatCoord(region?.longitude)}
                </Text>
                <Text style={[styles.headerSubtitle, isSmallScreen && styles.headerSubtitleCompact]}>
                  {t.pageDescription}
                </Text>
              </View>
            </View>

            {/* Weather Forecast */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🌤️ 7-Day Weather Forecast</Text>
              <View style={styles.weatherSummaryGrid}>
                {weatherForecast.slice(0, 7).map((day, index) => (
                  <View key={`summary-${index}`} style={styles.weatherSummaryCard}>
                    <Text style={styles.snapshotDay}>{formatForecastDay(day.datetime)}</Text>
                    <Text style={styles.snapshotTemp}>{Math.round(day.temp)}°</Text>
                    <Text style={styles.snapshotMeta}>{Math.round(day.rh)}% hum.</Text>
                  </View>
                ))}
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


            <SpeechHighlight
              active={activeHighlightId === 'croprec.top'}
              style={styles.topCardWrap}
              highlightStyle={styles.sectionHighlight}
            >
              <Animated.View style={[styles.topCropCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                <LinearGradient colors={['#059669', '#047857']} style={styles.topCropGradient}>
                  <View style={styles.topCropContent}>
                    <Text style={styles.topCropTitle}>🌾 {t.topTitle}</Text>
                    <Text style={styles.topCropName}>{cropNameMap[topCrop?.name as keyof typeof cropNameMap] ?? topCrop?.name ?? t.noCrop}</Text>
                    <Text style={styles.topCropScore}>
                      {t.suitability}: {topCrop?.totalScore ?? 0}/100
                    </Text>
                    <Text style={styles.topCropDesc}>{t.topDesc}</Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            </SpeechHighlight>

            <SpeechHighlight
              active={activeHighlightId === 'croprec.location'}
              style={styles.cardWrap}
              highlightStyle={styles.sectionHighlight}
            >
              <Animated.View style={{ opacity: fadeAnim }}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>📍 {t.locationTitle}</Text>
                  <View style={styles.locationStats}>
                    <View style={styles.locationChip}>
                      <Text style={styles.locationLabel}>{t.latitude}</Text>
                      <Text style={styles.locationValue}>
                        {formatCoord(location?.coords?.latitude ?? region?.latitude)}
                      </Text>
                    </View>
                    <View style={styles.locationChip}>
                      <Text style={styles.locationLabel}>{t.longitude}</Text>
                      <Text style={styles.locationValue}>
                        {formatCoord(location?.coords?.longitude ?? region?.longitude)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.soilBadge}>
                    <Text style={styles.soilBadgeText}>
                      {t.soil}: {soilType}
                    </Text>
                  </View>
                  <View style={styles.mapFallback}>
                    <Text style={styles.mapFallbackTitle}>{t.farmLocationReady}</Text>
                    <Text style={styles.mapFallbackText}>
                      {t.latLon} {formatCoord(region?.latitude)} | {formatCoord(region?.longitude)}
                    </Text>
                    <Text style={styles.mapFallbackText}>{t.liveMapDisabled}</Text>
                  </View>
                </View>
              </Animated.View>
            </SpeechHighlight>

            <SpeechHighlight
              active={activeHighlightId === 'croprec.weather'}
              style={styles.cardWrap}
              highlightStyle={styles.sectionHighlight}
            >
              <Animated.View style={{ opacity: fadeAnim }}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>🌤️ {t.weatherTitle}</Text>
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
                            new Date(d.datetime).toLocaleDateString(textLanguage === 'urdu' ? 'ur-PK' : 'en-US', { weekday: 'short' })
                          ),
                          datasets: [{ data: weatherForecast.map((d) => d.temp) }],
                        }}
                        width={weatherChartContainerWidth || width - 40}
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
                        <Text style={styles.snapshotMeta}>
                          {Math.round(day.pop)}% {t.weatherRain}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                  <View style={styles.weatherDetails}>
                    {weatherForecast.map((day, index) => (
                      <View key={index} style={styles.weatherDetailRow}>
                        <Text style={styles.weatherDetailDay}>{formatForecastDay(day.datetime)}</Text>
                        <Text style={styles.weatherDetailTemp}>{day.temp}°C</Text>
                        <Text style={styles.weatherDetailHumidity}>
                          {day.rh}% {t.weatherHumidity}
                        </Text>
                        <Text style={styles.weatherDetailRain}>
                          {day.pop}% {t.weatherRain}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Animated.View>
            </SpeechHighlight>

            <SpeechHighlight
              active={activeHighlightId === 'croprec.ranking'}
              style={styles.cardWrap}
              highlightStyle={styles.sectionHighlight}
            >
              <Animated.View style={{ opacity: fadeAnim }}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>🌱 {t.rankingTitle}</Text>
                  <View style={styles.cropList}>
                    {crops.map((crop, index) => (
                      <SpeechHighlight
                        key={crop.name}
                        active={activeHighlightId === `croprec.crop.${crop.name}`}
                        style={styles.cropCardWrap}
                        highlightStyle={styles.cropHighlight}
                      >
                        <View style={styles.cropCard}>
                          <View style={styles.cropHeader}>
                            <View style={styles.rankPill}>
                              <Text style={styles.cropRank}>{index + 1}</Text>
                            </View>
                            <Text style={styles.cropName}>{cropNameMap[crop.name as keyof typeof cropNameMap] ?? crop.name}</Text>
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
                              <Text style={styles.metric}>
                                {t.weatherMetric} {Math.round(crop.weatherScore)}
                              </Text>
                            </View>
                            <View style={styles.metricChip}>
                              <Text style={styles.metric}>
                                {t.soilMetric} {Math.round(crop.soilScore)}
                              </Text>
                            </View>
                            <View style={styles.metricChip}>
                              <Text style={styles.metric}>
                                {t.marketMetric} {Math.round(crop.marketScore)}
                              </Text>
                            </View>
                            <View style={styles.metricChip}>
                              <Text style={styles.metric}>
                                {t.pestMetric} {Math.round(crop.pestRiskScore)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </SpeechHighlight>
                    ))}
                  </View>
                </View>
              </Animated.View>
            </SpeechHighlight>
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
  headerSectionWrap: { marginBottom: 18 },
  headerSection: {
    alignItems: 'center',
    marginBottom: 0,
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
  topCardWrap: { marginBottom: 14 },
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
  cardWrap: { marginBottom: 14 },
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
  mapFallback: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe7e1',
    backgroundColor: '#f8fcfa',
    padding: 12,
  },
  mapFallbackTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1f4d3f',
    marginBottom: 4,
  },
  mapFallbackText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#4b7c6d',
  },
  weatherSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  weatherSummaryCard: {
    flexBasis: '30%',
    minWidth: 88,
    borderRadius: 12,
    backgroundColor: '#f6fdf9',
    borderWidth: 1,
    borderColor: '#dcf3e8',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
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
  cropCardWrap: { marginBottom: 0 },
  cropHighlight: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#10b981',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
  },
  sectionHighlight: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#10b981',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
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
