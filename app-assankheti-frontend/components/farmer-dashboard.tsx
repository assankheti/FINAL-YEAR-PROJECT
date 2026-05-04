import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MessageComposer from '@/components/MessageComposer';
import { API_BASE } from '@/config/env';
import { getOrCreateMobileId } from '@/lib/deviceId';
import { showMobileNotificationsOnce } from '@/lib/mobileNotifications';

type Props = {
  textLanguage?: 'urdu' | 'english';
  voiceLanguage?: 'urdu' | 'english';
  initialTab?: Tab;
  selectedCrop?: string;
  characterType?: 'farmer' | 'simple-user' | 'businessman';
};
type Tab = 'home' | 'shop' | 'chat' | 'profile';

const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.15);
  const isSmall = height < 700;
  const hp = (pct: number) => Math.round((height * pct) / 100);
  const wp = (pct: number) => Math.round((width * pct) / 100);
  const fs = (size: number) => Math.round(size * scale);
  return { width, height, scale, isSmall, hp, wp, fs };
};

const getGreeting = (): { urdu: string; english: string } => {
  const hour = new Date().getHours();
  if (hour < 12) return { english: 'Good Morning', urdu: 'صبح بخیر' };
  if (hour < 17) return { english: 'Good Afternoon', urdu: 'سہ پہر بخیر' };
  return { english: 'Good Evening', urdu: 'شام بخیر' };
};

export function FarmerDashboard({
  textLanguage = 'english',
  voiceLanguage = 'english',
  initialTab = 'home',
  selectedCrop,
  characterType = 'farmer',
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [isChatInputFocused, setIsChatInputFocused] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const r = useResponsive();
  const { width } = useWindowDimensions();
  
  // Real-time data states
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null);
  const [cropPrice, setCropPrice] = useState<number | null>(null);
  const [cropHealth, setCropHealth] = useState<number>(95);
  const [location, setLocation] = useState<any>(null);
  const [lastScanTime, setLastScanTime] = useState<string>('Today');
  const [lastScanData, setLastScanData] = useState<any>(null);

  const t = useCallback((obj: any) => obj[textLanguage], [textLanguage]);

  const strings = useMemo(
    () =>
      ({
        farmer: { urdu: 'کسان', english: 'Farmer' },
        cropStatus: { urdu: 'فصل کی صورتحال', english: 'Crop status' },
        lastScan: { urdu: 'آخری اسکین: آج', english: 'Last scan: Today' },
        healthy: { urdu: 'صحت مند', english: 'Healthy' },
        features: { urdu: 'فیچرز', english: 'Features' },
        startChat: { urdu: 'چیٹ شروع کریں', english: 'Start Chat' },
        recentAlerts: { urdu: 'تازہ الرٹس', english: 'Recent Alerts' },
        marketplace: { urdu: 'مارکیٹ پلیس', english: 'Marketplace' },
        marketplaceLoginTitle: { urdu: 'مارکیٹ پلیس استعمال کرنے کے لیے لاگ اِن کریں', english: 'Login required for Marketplace' },
        marketplaceLoginDesc: { urdu: 'خرید و فروخت اور پروڈکٹ مینجمنٹ کے لیے مارکیٹ پلیس اکاؤنٹ میں لاگ اِن کریں۔', english: 'Please login to your marketplace account to buy/sell and manage products.' },
        marketplaceLoginBtn: { urdu: 'مارکیٹ پلیس لاگ اِن', english: 'Login to Marketplace' },
        listNewProduct: { urdu: 'نئی پروڈکٹ لسٹ کریں', english: 'List New Product' },
        yourListings: { urdu: 'آپ کی لسٹنگز', english: 'Your Listings' },
        diseaseTitle: { urdu: 'فصل کی بیماری کی تشخیص', english: 'Crop Disease Detection' },
        scanYourCrop: { urdu: 'اپنی فصل اسکین کریں', english: 'Tap to scan your crop' },
        scanHint: { urdu: 'فصل کو اسکین کرنے کے لیے ٹیپ کریں', english: 'Tap to scan your crop' },
        takePhoto: { urdu: 'تصویر لیں', english: 'Take Photo' },
        uploadGallery: { urdu: 'گیلری سے اپلوڈ کریں', english: 'Upload from Gallery' },
        aiPowered: { urdu: 'AI پر مبنی تجزیہ', english: 'AI-Powered Analysis' },
        aiDesc: { urdu: 'AI بیماری کی شناخت اور علاج تجویز کرے گا', english: 'Our AI will identify diseases and suggest treatments' },
        chatTitle: { urdu: 'AI کھیتی باڑی مشیر', english: 'AI Farming Assistant' },
        online: { urdu: 'آن لائن', english: 'Online' },
        typeQuestion: { urdu: 'اپنا سوال لکھیں...', english: 'Type your question...' },
        profileTitle: { urdu: 'کسان پروفائل', english: 'Farmer Profile' },
      }) as const,
    []
  );

  useEffect(() => {
    showMobileNotificationsOnce('farmer-dashboard-alerts', [
      {
        id: 'rain-expected',
        title: t({ urdu: 'کل بارش متوقع', english: 'Rain expected tomorrow' }),
        body: t({
          urdu: 'اپنی فصل کو بارش سے بچانے کے لیے احتیاطی تدابیر اختیار کریں۔',
          english: 'Take precautions to protect your crop from rain.',
        }),
        data: { type: 'weather' },
      },
      {
        id: 'rice-price-up',
        title: t({ urdu: 'چاول کی قیمت میں اضافہ', english: 'Rice price increased' }),
        body: t({
          urdu: 'مارکیٹ قیمت بہتر ہے۔ فروخت کا اچھا وقت ہو سکتا ہے۔',
          english: 'Market price is better. It may be a good time to sell.',
        }),
        data: { type: 'price' },
      },
    ]);
  }, [t]);

  const featureCards = useMemo(
    () =>
      [
        {
          id: 'disease',
          title: { urdu: 'بیماری کی تشخیص', english: 'Disease Detection' },
          subtitle: { urdu: 'AI کے ذریعے بیماری کی شناخت', english: 'AI-powered crop disease identification' },
          icon: <MaterialCommunityIcons name="qrcode-scan" size={22} color="#ffffff" />,
          gradient: ['#0d5c4b', '#10b981'] as const,
          onPress: () =>
            router.push({
              pathname: '/disease-detection',
              params: { textLanguage, voiceLanguage, ...(selectedCrop && { selectedCrop }) },
            }),
        },

        {
          id: 'calculator',
          title: { urdu: 'سمارٹ کیلکولیٹر', english: 'Smart Calculator' },
          subtitle: { urdu: 'کھاد، دوا اور بجٹ پلان', english: 'Fertilizer, pesticide & budget planner' },
          icon: <MaterialCommunityIcons name="calculator" size={22} color="#ffffff" />,
          gradient: ['#10b981', '#06b6d4'] as const,
          onPress: () =>
            router.push({
              pathname: '/smart-budget',
              params: { textLanguage, voiceLanguage, ...(selectedCrop && { selectedCrop }) },
            }),
        },

        {
          id: 'notifications',
          title: { urdu: 'الرٹس اور اپڈیٹس', english: 'Alerts & Updates' },
          subtitle: { urdu: 'موسم، اسکیمیں اور قیمتیں', english: 'Weather, schemes & market prices' },
          icon: <Feather name="bell" size={22} color="#ffffff" />,
          gradient: ['#f59e0b', '#db2777'] as const,
          onPress: () =>
            router.push({
              pathname: '/farmer-notifications',
              params: { textLanguage, voiceLanguage },
            }),
        },
        {
          id: 'marketplace',
          title: { urdu: 'مارکیٹ پلیس', english: 'Marketplace' },
          subtitle: { urdu: 'براہ راست گاہکوں کو فروخت', english: 'Sell directly to customers' },
          icon: <Feather name="shopping-bag" size={22} color="#ffffff" />,
          gradient: ['#3b82f6', '#2563eb'] as const,
          onPress: () =>
            // Require login first; after OTP verification the flow navigates to community dashboard
            router.push({
              pathname: '/login',
              params: { userType: 'businessman', textLanguage, voiceLanguage },
            }),
        },
        {
          id: 'CropRecommendations',
          title: { urdu: 'فصل کی سفارشات', english: 'Crop Recommendations' },
          subtitle: { urdu: 'موسمی حالات کے مطابق', english: 'Based on seasonal conditions' },
          icon: <MaterialCommunityIcons name="sprout" size={22} color="#ffffff" />,
          gradient: ['#7c3aed', '#a855f7'] as const,
          onPress: () =>
            router.push({
              pathname: '/crop-recommendations',
              params: { textLanguage, voiceLanguage },
            }),
        },
      ],
    []
  );

  const contentMaxWidth = Math.min(520, width);
  const tabBarH = Platform.OS === 'ios' ? 86 : 74;
  const [tabBarHeight, setTabBarHeight] = useState(tabBarH);

  const greeting = getGreeting();

  // Keep users on dashboard unless they explicitly use the profile "back" action.
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const onHardwareBack = () => true;
      const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => subscription.remove();
    }, [])
  );

  // Load last scan data when page comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Dashboard focused - loading scan data...');
      const loadLastScan = async () => {
        try {
          const mobileId = await getOrCreateMobileId();
          const response = await fetch(`${API_BASE}/api/v1/disease/last-scan/${mobileId}`);

          if (!response.ok) {
            if (response.status === 404) {
              setLastScanData(null);
              setLastScanTime('Today');
              setCropHealth(95);
              return;
            }
            throw new Error(`Failed to fetch last scan: ${response.status}`);
          }

          const parsedData = await response.json();
          setLastScanData(parsedData);

          const scanDate = parsedData?.scanned_at
            ? new Date(parsedData.scanned_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Today';
          setLastScanTime(scanDate);

          if (selectedCrop && parsedData?.crop_name && parsedData.crop_name !== selectedCrop) {
            // Keep most recent global scan visible, but mark health as neutral for another crop.
            setCropHealth(95);
            return;
          }

            // Update crop health based on disease detection (if healthy, 95%, otherwise lower)
          const diseaseLabel = String(parsedData?.disease ?? '').trim();
          if (!diseaseLabel || diseaseLabel === 'no disease' || diseaseLabel === 'Healthy') {
            setCropHealth(95);
          } else if (diseaseLabel === 'Not identifiable') {
            setCropHealth(75);
          } else {
            const confidence = typeof parsedData.confidence === 'number' ? parsedData.confidence : 50;
            setCropHealth(Math.max(30, Math.round(95 - (confidence / 100) * 40)));
          }
        } catch (e) {
          console.warn('⚠️ Failed to load scan data:', e);
        }
      };
      loadLastScan();
    }, [selectedCrop])
  );

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch('https://api.weatherbit.io/v2.0/current?lat=31.5204&lon=74.3587&key=529094980f6e4316be96ffc561515561');
        const data = await response.json();
        if (data.data && data.data[0]) {
          setWeather({
            temp: Math.round(data.data[0].temp),
            condition: data.data[0].weather.description
          });
        }
      } catch (e) {
        console.warn('Failed to fetch weather:', e);
        setWeather({ temp: 28, condition: 'Partly Cloudy' });
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 600000); // Update every 10 minutes
    return () => clearInterval(interval);
  }, []);

  // Fetch market prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/calculator/prices/crop`);
        const data = await response.json();

        const cropToFetch = (selectedCrop || 'Rice').toLowerCase();
        const keyMap: Record<string, string[]> = {
          rice: ['Rice', 'rice', 'rice basmati new (kg)'],
          wheat: ['Wheat', 'wheat', 'atta bag (20kg)'],
          potato: ['Potato', 'potato', 'potato fresh (kg)'],
          onion: ['Onion', 'onion', 'onion (kg)'],
          tomato: ['Tomato', 'tomato', 'tomato (kg)'],
        };

        const candidateKeys = keyMap[cropToFetch] || [selectedCrop || 'Rice'];
        const matchedKey = candidateKeys.find((k) => typeof data?.[k] === 'number');

        if (matchedKey) {
          setCropPrice(data[matchedKey]);
        } else {
          setCropPrice(45);
        }
      } catch (e) {
        console.warn('Failed to fetch crop prices:', e);
        setCropPrice(45); // Fallback
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, [selectedCrop]);

  // Get crop health from disease detection results
  useEffect(() => {
    const loadCropHealth = async () => {
      try {
        // Try to get saved detection results from storage or state
        // For now, we'll use a default value that can be updated via AsyncStorage
        setCropHealth(95);
      } catch (e) {
        console.warn('Error loading crop health:', e);
      }
    };
    loadCropHealth();
  }, []);

  const HomeTab = () => (
    <ScrollView
      contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={['#0d5c4b', '#0f7a62', '#10b981']} style={[styles.homeHeader, { paddingHorizontal: r.wp(5) }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.headerGlowOne} />
        <View style={styles.headerGlowTwo} />
        <View style={styles.homeHeaderRow}>
          <View style={styles.homeBrandRow}>
            <View style={styles.homeLogoBox}>
              <MaterialCommunityIcons name="account-cowboy-hat" size={r.fs(22)} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.homeWelcomeSmall}>{t(greeting)}</Text>
              <Text style={[styles.homeWelcomeName, { fontSize: r.fs(18) }]}>{t(strings.farmer)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.bellBtn}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: '/farmer-notifications',
                params: { textLanguage, voiceLanguage },
              })
            }
          >
            <Feather name="bell" size={18} color="#ffffff" />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.cropCard}>
          <View style={styles.cropRow}>
            <View style={styles.cropLeft}>
              <View style={styles.cropIconBox}>
                <Text style={{ fontSize: 22 }}>🌾</Text>
              </View>
              <View>
                <Text style={styles.cropTitle} numberOfLines={1}>
                  {selectedCrop
                    ? selectedCrop + ' ' + t({ urdu: 'فصل', english: 'Crop' })
                    : t({ urdu: 'چاول کی فصل', english: 'Rice Crop' })}
                </Text>
              </View>
            </View>

            <View style={styles.cropStatusBlock}>
              <View style={styles.cropHealthRow}>
                <MaterialCommunityIcons name="leaf" size={16} color="#ffffff" />
                <Text style={styles.cropHealthText} numberOfLines={2}>
                  {lastScanData ? (
                    !String(lastScanData?.disease ?? '').trim() ||
                    lastScanData.disease === 'no disease' ||
                    lastScanData.disease === 'Healthy'
                      ? t(strings.healthy)
                      : lastScanData.disease
                  ) : t(strings.healthy)}
                </Text>
              </View>
              <Text style={styles.cropMeta} numberOfLines={1}>
                {lastScanData ? (
                  t({ 
                    urdu: 'آخری اسکین: ' + lastScanTime, 
                    english: 'Last scan: ' + lastScanTime 
                  })
                ) : t(strings.lastScan)}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.sectionWrap, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <View style={styles.statsCard}>
          {[
            {
              icon: 'weather-cloudy',
              label: { urdu: 'موسم', english: 'Weather' },
              value: weather ? `${weather.temp}°C` : t({ urdu: 'لوڈ ہو رہا ہے', english: 'Loading' }),
              color: '#06b6d4',
            },
            {
              icon: 'trending-up',
              label: { urdu: 'چاول کی قیمت', english: 'Rice Price' },
              value: cropPrice ? `₨${cropPrice}/kg` : t({ urdu: 'لوڈ ہو رہا ہے', english: 'Loading' }),
              color: '#f59e0b',
            },
            { icon: 'leaf', label: { urdu: 'فصل کی صحت', english: 'Crop Health' }, value: `${cropHealth}%`, color: '#10b981' },
          ].map((s) => (
            <View key={t(s.label)} style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#f3f4f6' }]}>
                <MaterialCommunityIcons name={s.icon as any} size={18} color={s.color} />
              </View>
              <Text style={styles.statLabel}>{t(s.label)}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.alertHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertSectionTitle}>{t(strings.recentAlerts)}</Text>
            <Text style={styles.alertSectionSub}>
              {t({
                urdu: 'آپ کی فصل کے لیے تازہ موسمی اور مارکیٹ اپڈیٹس',
                english: 'Fresh weather and market updates for your crop',
              })}
            </Text>
          </View>
        </View>

        {[
          {
            icon: 'weather-cloudy',
            title: { urdu: 'کل بارش متوقع', english: 'Rain expected tomorrow' },
            time: { urdu: '2 گھنٹے پہلے', english: '2h ago' },
            color: '#06b6d4',
          },
          {
            icon: 'trending-up',
            title: { urdu: 'چاول کی قیمت میں 5% اضافہ', english: 'Rice prices increased 5%' },
            time: { urdu: '5 گھنٹے پہلے', english: '5h ago' },
            color: '#f59e0b',
          },
        ].map((a) => (
          <View key={t(a.title)} style={styles.alertItem}>
            <View style={[styles.alertIcon, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
              <MaterialCommunityIcons name={a.icon as any} size={18} color={a.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{t(a.title)}</Text>
              <Text style={styles.alertTime}>{t(a.time)}</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#9ca3af" />
          </View>
        ))}
        
        <Text style={styles.sectionTitle}>{t(strings.features)}</Text>
        <View style={styles.grid}>
          {featureCards.map((f) => (
            <TouchableOpacity key={f.id} activeOpacity={0.9} style={styles.gridCard} onPress={f.onPress}>
              <LinearGradient colors={[f.gradient[0], f.gradient[1]]} style={styles.gridIconBox}>
                {f.icon}
              </LinearGradient>
              <Text style={styles.gridTitle}>{t(f.title)}</Text>
              <Text style={styles.gridDesc} numberOfLines={2}>
                {t(f.subtitle)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <LinearGradient colors={['#f59e0b', '#fbbf24']} style={styles.promoCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.promoInner}>
            <View style={styles.promoHeader}>
              <Feather name="message-circle" size={18} color="#111827" />
              <Text style={styles.promoTitle}>{t({ urdu: '24/7 اے آئی اسسٹنٹ', english: '24/7 AI Assistant' })}</Text>
            </View>
            <Text style={styles.promoDesc}>
              {t({ urdu: 'اپنے زرعی سوالات کے فوری جوابات حاصل کریں', english: 'Get instant answers to your farming questions' })}
            </Text>
            <TouchableOpacity style={styles.promoBtn} onPress={() => setActiveTab('chat')} activeOpacity={0.9}>
              <Text style={styles.promoBtnText}>{t(strings.startChat)}</Text>
              <Feather name="chevron-right" size={18} color="#111827" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </ScrollView>
  );

  const ShopTab = () => (
    <ScrollView
      contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.sectionWrap, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <Text style={styles.scanTitle}>{t(strings.marketplace)}</Text>
        <Text style={styles.scanSub}>{t({ urdu: 'اپنی مصنوعات براہ راست فروخت کریں', english: 'Sell your products directly' })}</Text>

        {characterType === 'farmer' ? (
          <View style={styles.marketplaceLoginCard}>
            <View style={styles.marketplaceLoginHead}>
              <Feather name="lock" size={18} color="#0d5c4b" />
              <Text style={styles.marketplaceLoginTitle}>{t(strings.marketplaceLoginTitle)}</Text>
            </View>
            <Text style={styles.marketplaceLoginDesc}>{t(strings.marketplaceLoginDesc)}</Text>
            <TouchableOpacity
              style={styles.sunriseBtn}
              activeOpacity={0.9}
              onPress={() =>
                router.push({
                  pathname: '/login',
                  params: { userType: 'businessman', textLanguage, voiceLanguage },
                })
              }
            >
              <Feather name="log-in" size={18} color="#111827" />
              <Text style={styles.sunriseBtnText}>{t(strings.marketplaceLoginBtn)}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.sunriseBtn}
              activeOpacity={0.9}
              onPress={() =>
                router.push({
                  pathname: '/add-product',
                  params: { textLanguage, voiceLanguage },
                })
              }
            >
              <Feather name="upload" size={18} color="#111827" />
              <Text style={styles.sunriseBtnText}>{t(strings.listNewProduct)}</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>{t(strings.yourListings)}</Text>
            {[
              { name: { urdu: 'تازہ چاول - 50 کلو', english: 'Fresh Rice - 50kg' }, price: '₨2,250', status: { urdu: 'فعال', english: 'Active' } },
              { name: { urdu: 'چاول کی بھوسی - 25 کلو', english: 'Rice Bran - 25kg' }, price: '₨800', status: { urdu: 'فروخت', english: 'Sold' } },
            ].map((p) => (
              <View key={p.name.english} style={styles.productRow}>
                <View style={styles.productImg}><Text style={{ fontSize: 22 }}>🌾</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{t(p.name)}</Text>
                  <Text style={styles.productPrice}>{p.price}</Text>
                </View>
                <View style={[styles.badge, p.status.english === 'Active' ? styles.badgeActive : styles.badgeMuted]}>
                  <Text style={[styles.badgeText, p.status.english === 'Active' ? styles.badgeTextActive : styles.badgeTextMuted]}>{t(p.status)}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );

  type ChatMessage = {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    time: string;
  };

  type SessionItem = {
    session_id: string;
    title: string;
    last_message: string;
    message_count: number;
    created_at: string;
    updated_at: string;
  };
  type SessionGroup = { label: string; sessions: SessionItem[] };

  const AIChatTab = ({
    textLanguage,
    r,
    bottomInset,
    onInputFocusChange,
  }: {
    textLanguage: 'urdu' | 'english';
    r: ReturnType<typeof useResponsive>;
    bottomInset: number;
    onInputFocusChange?: (focused: boolean) => void;
  }) => {
    const t = (obj: any) => obj[textLanguage];
    const [messageText, setMessageText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [sessionsError, setSessionsError] = useState<string | null>(null);
    const [hasLoadedRemoteHistory, setHasLoadedRemoteHistory] = useState(false);
    const [hasExistingHistory, setHasExistingHistory] = useState(false);
    const [chatMobileId, setChatMobileId] = useState<string | null>(null);

    const timeNow = () =>
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const scrollRef = useRef<ScrollView | null>(null);
    const autoRestoreLatestRef = useRef(true);
    const historyLoadTokenRef = useRef(0);
    const logChatDebug = (...args: any[]) => {
      if (__DEV__) console.log('[Chat]', ...args);
    };

    const getChatMobileId = async (): Promise<string> => {
      if (chatMobileId) return chatMobileId;
      const id = await getOrCreateMobileId();
      setChatMobileId(id);
      return id;
    };

    const normalizeSessionGroups = (rawGroups: Record<string, unknown>): SessionGroup[] => {
      const groups = Object.entries(rawGroups || {}).map(([label, rawSessions]) => {
        const sessions = Array.isArray(rawSessions) ? rawSessions : [];
        const normalized: SessionItem[] = sessions
          .map((s: any) => ({
            session_id: String(s?.session_id ?? ''),
            title: String(s?.title ?? 'Untitled Chat'),
            last_message: String(s?.last_message ?? ''),
            message_count: Number(s?.message_count ?? 0),
            created_at: String(s?.created_at ?? ''),
            updated_at: String(s?.updated_at ?? ''),
          }))
          .filter((s) => !!s.session_id)
          .sort(
            (a, b) =>
              new Date(b.updated_at || b.created_at || 0).getTime() -
              new Date(a.updated_at || a.created_at || 0).getTime()
          );
        return { label, sessions: normalized };
      });

      return groups
        .filter((g) => g.sessions.length > 0)
        .sort((a, b) => {
          const aLatest = a.sessions[0];
          const bLatest = b.sessions[0];
          return (
            new Date(bLatest.updated_at || bLatest.created_at || 0).getTime() -
            new Date(aLatest.updated_at || aLatest.created_at || 0).getTime()
          );
        });
    };

    const normalizeSessionsList = (rawSessions: unknown): SessionItem[] => {
      const sessions = Array.isArray(rawSessions) ? rawSessions : [];
      return sessions
        .map((s: any) => ({
          session_id: String(s?.session_id ?? ''),
          title: String(s?.title ?? 'Untitled Chat'),
          last_message: String(s?.last_message ?? ''),
          message_count: Number(s?.message_count ?? 0),
          created_at: String(s?.created_at ?? ''),
          updated_at: String(s?.updated_at ?? ''),
        }))
        .filter((s) => !!s.session_id)
        .sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at || 0).getTime() -
            new Date(a.updated_at || a.created_at || 0).getTime()
        );
    };

    const flattenSessions = (groups: SessionGroup[]): SessionItem[] =>
      groups.reduce<SessionItem[]>((acc, group) => acc.concat(group.sessions), []);

    const groupLabelForDate = (value: string): string => {
      const dt = value ? new Date(value) : new Date();
      const today = new Date();
      const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const targetDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
      const diffDays = Math.round((currentDay - targetDay) / (24 * 60 * 60 * 1000));

      if (diffDays <= 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return 'This Week';
      if (diffDays < 30) return 'This Month';
      return dt.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    };

    const buildSessionGroupsFromFlat = (sessions: SessionItem[]): SessionGroup[] => {
      const groupedMap = new Map<string, SessionItem[]>();
      sessions.forEach((session) => {
        const label = groupLabelForDate(session.updated_at || session.created_at);
        if (!groupedMap.has(label)) groupedMap.set(label, []);
        groupedMap.get(label)!.push(session);
      });

      const groups = Array.from(groupedMap.entries()).map(([label, entries]) => ({
        label,
        sessions: entries.sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at || 0).getTime() -
            new Date(a.updated_at || a.created_at || 0).getTime()
        ),
      }));

      return groups.sort((a, b) => {
        const aLatest = a.sessions[0];
        const bLatest = b.sessions[0];
        return (
          new Date(bLatest.updated_at || bLatest.created_at || 0).getTime() -
          new Date(aLatest.updated_at || aLatest.created_at || 0).getTime()
        );
      });
    };

    const buildSessionsFromLegacyHistory = (rawMessages: any[]): SessionItem[] => {
      const bySession = new Map<string, SessionItem>();

      (Array.isArray(rawMessages) ? rawMessages : []).forEach((m: any) => {
        const sid = String(m?.session_id ?? '').trim();
        if (!sid) return;
        const text = String(m?.text ?? '').trim();
        const createdAt = String(m?.created_at ?? '');
        const role = String(m?.sender ?? '');

        if (!bySession.has(sid)) {
          bySession.set(sid, {
            session_id: sid,
            title: '',
            last_message: text,
            message_count: 0,
            created_at: createdAt,
            updated_at: createdAt,
          });
        }

        const existing = bySession.get(sid)!;
        existing.message_count += 1;

        if (createdAt && (!existing.created_at || new Date(createdAt).getTime() < new Date(existing.created_at).getTime())) {
          existing.created_at = createdAt;
        }
        if (createdAt && (!existing.updated_at || new Date(createdAt).getTime() > new Date(existing.updated_at).getTime())) {
          existing.updated_at = createdAt;
          if (text) existing.last_message = text;
        }
        if (!existing.title && role === 'user' && text) {
          existing.title = text.slice(0, 60);
        }
      });

      return Array.from(bySession.values())
        .map((s) => ({
          ...s,
          title: s.title || 'Farming Chat',
        }))
        .sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at || 0).getTime() -
            new Date(a.updated_at || a.created_at || 0).getTime()
        );
    };

    const parseSessionsPayload = (data: any): { groups: SessionGroup[]; sessions: SessionItem[] } => {
      const grouped = normalizeSessionGroups(data?.groups || {});
      const flatFromPayload = normalizeSessionsList(data?.sessions);
      const flat = flatFromPayload.length > 0 ? flatFromPayload : flattenSessions(grouped);
      const groups = grouped.length > 0 ? grouped : buildSessionGroupsFromFlat(flat);
      return { groups, sessions: flat };
    };

    const normalizeHistoryMessages = (rawMessages: any[], sid: string): ChatMessage[] => {
      const messages = (Array.isArray(rawMessages) ? rawMessages : [])
        .map((m: any, i: number) => {
          const sender = m?.sender === 'user' ? 'user' : 'ai';
          const text = String(m?.text ?? '').trim();
          const createdAt = String(m?.created_at ?? '');
          const time = String(m?.time ?? '');
          return {
            id: `hist-${sid}-${createdAt || time || i}`,
            sender,
            text,
            time,
            createdAt,
          };
        })
        .filter((m: any) => !!m.text)
        .sort(
          (a: any, b: any) =>
            new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );

      const seen = new Set<string>();
      const deduped = messages.filter((m: any) => {
        const key = `${m.sender}|${m.text}|${m.time}|${m.createdAt}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return deduped.map(({ id, sender, text, time }) => ({
        id,
        sender: sender as 'user' | 'ai',
        text,
        time,
      }));
    };

    const formatSessionTime = (value: string): string => {
      if (!value) return '';
      const dt = new Date(value);
      if (Number.isNaN(dt.getTime())) return '';
      return dt.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };
    const totalSessionCount = flattenSessions(sessionGroups).length;

    // Load most recent session on mount
    useEffect(() => {
      (async () => {
        setHistoryError(null);
        setLoadingHistory(true);
        setHasLoadedRemoteHistory(false);
        try {
          const mobileId = await getChatMobileId();
          const url = `${API_BASE}/api/v1/chatbot/sessions/${mobileId}`;
          logChatDebug('history_bootstrap mobile_id=', mobileId);
          logChatDebug('history_bootstrap url=', url);
          const res = await fetch(url);
          logChatDebug('history_bootstrap status=', res.status);
          if (!res.ok) throw new Error(`sessions request failed: ${res.status}`);
          const data = await res.json();
          logChatDebug('history_bootstrap response_keys=', Object.keys(data || {}));
          const parsed = parseSessionsPayload(data);
          setSessionGroups(parsed.groups);
          const allSessions = parsed.sessions;

          logChatDebug('history_bootstrap sessions_count=', allSessions.length);
          if (allSessions.length > 0 && autoRestoreLatestRef.current) {
            const latest = allSessions[0];
            setSessionId(latest.session_id);
            await loadSession(mobileId, latest.session_id);
            return;
          }
        } catch (err) {
          logChatDebug('history_bootstrap error=', err);
          setHistoryError(
            t({
              english: 'Could not load previous chat history right now.',
              urdu: 'پچھلی چیٹ ہسٹری اس وقت لوڈ نہیں ہو سکی۔',
            })
          );
        }
        setMessages([]);
        setHasExistingHistory(false);
        setHasLoadedRemoteHistory(true);
        setLoadingHistory(false);
      })();
    }, []);

    const loadSession = async (mobileId: string, sid: string) => {
      const token = ++historyLoadTokenRef.current;
      setLoadingHistory(true);
      setHistoryError(null);
      try {
        const url = `${API_BASE}/api/v1/chatbot/history/${mobileId}/${sid}`;
        logChatDebug('history_load_session session_id=', sid, 'url=', url);
        const res = await fetch(url);
        logChatDebug('history_load_session status=', res.status);
        if (!res.ok) throw new Error(`history request failed: ${res.status}`);
        const data = await res.json();
        if (token !== historyLoadTokenRef.current) return;
        logChatDebug('history_load_session response_keys=', Object.keys(data || {}));
        logChatDebug('history_load_session messages_count=', Array.isArray(data?.messages) ? data.messages.length : 0);
        const history = normalizeHistoryMessages(data.messages, sid);
        if (history.length > 0) {
          setHasExistingHistory(true);
          setMessages(history);
        } else {
          setHasExistingHistory(false);
          setMessages([]);
        }
      } catch (err) {
        if (token !== historyLoadTokenRef.current) return;
        logChatDebug('history_load_session error=', err);
        setHistoryError(
          t({
            english: 'Could not load this conversation. Please try again.',
            urdu: 'یہ گفتگو لوڈ نہیں ہو سکی۔ براہ کرم دوبارہ کوشش کریں۔',
          })
        );
      }
      setHasLoadedRemoteHistory(true);
      setLoadingHistory(false);
    };

    const loadSessions = async () => {
      setLoadingSessions(true);
      setSessionsError(null);
      try {
        const mobileId = await getChatMobileId();
        const url = `${API_BASE}/api/v1/chatbot/sessions/${mobileId}`;
        logChatDebug('history_modal_fetch mobile_id=', mobileId);
        logChatDebug('history_modal_fetch url=', url);
        const res = await fetch(url);
        logChatDebug('history_modal_fetch status=', res.status);
        if (!res.ok) throw new Error(`sessions list failed: ${res.status}`);
        const data = await res.json();
        logChatDebug('history_modal_fetch response_keys=', Object.keys(data || {}));
        const parsed = parseSessionsPayload(data);
        let groupsToSet = parsed.groups;
        let sessionsToSet = parsed.sessions;

        if (sessionsToSet.length === 0) {
          const fallbackUrl = `${API_BASE}/api/v1/chatbot/history/${mobileId}?limit=500`;
          logChatDebug('history_modal_fetch fallback_url=', fallbackUrl);
          const fallbackRes = await fetch(fallbackUrl);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            const fallbackSessions = buildSessionsFromLegacyHistory(fallbackData?.messages || []);
            if (fallbackSessions.length > 0) {
              sessionsToSet = fallbackSessions;
              groupsToSet = buildSessionGroupsFromFlat(fallbackSessions);
            }
          }
        }

        logChatDebug(
          'history_modal_fetch parsed_groups=',
          groupsToSet.length,
          'parsed_sessions=',
          sessionsToSet.length
        );
        setSessionGroups(groupsToSet);
      } catch (err) {
        logChatDebug('history_modal_fetch error=', err);
        setSessionsError(
          t({
            english: 'Could not load chat history list. Please retry.',
            urdu: 'چیٹ ہسٹری لسٹ لوڈ نہیں ہو سکی۔ براہ کرم دوبارہ کوشش کریں۔',
          })
        );
      }
      setLoadingSessions(false);
    };

    const startNewChat = () => {
      autoRestoreLatestRef.current = false;
      historyLoadTokenRef.current += 1;
      logChatDebug('new_chat_mode enabled');
      setSessionId(null);
      setMessages([]);
      setHasExistingHistory(false);
      setHasLoadedRemoteHistory(true);
      setShowHistory(false);
    };

    const openSession = async (sid: string) => {
      autoRestoreLatestRef.current = true;
      logChatDebug('history_modal_select_session session_id=', sid);
      setSessionId(sid);
      setShowHistory(false);
      const mobileId = await getChatMobileId();
      await loadSession(mobileId, sid);
    };

    const deleteSession = async (sid: string) => {
      try {
        const mobileId = await getChatMobileId();
        await fetch(`${API_BASE}/api/v1/chatbot/session/${mobileId}/${sid}`, { method: 'DELETE' });
        if (sessionId === sid) startNewChat();
        await loadSessions();
      } catch {}
    };

    useEffect(() => {
      if (showHistory) {
        logChatDebug('history_modal_opened rendered_session_groups=', sessionGroups.length);
        loadSessions();
      }
    }, [showHistory]);

    useEffect(() => {
      if (!showHistory) return;
      logChatDebug('history_modal_rendered_sessions=', flattenSessions(sessionGroups).length);
    }, [sessionGroups, showHistory]);

    useEffect(() => {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }, [messages, isTyping, loadingHistory]);

    const sendWithTimeout = async (
      url: string,
      options: RequestInit,
      timeoutMs: number = 20000
    ): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, { ...options, signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const handleComposerFocus = () => onInputFocusChange?.(true);
    const handleComposerBlur = () => onInputFocusChange?.(false);


    const handleSend = async (overrideText?: string) => {
      const rawText = typeof overrideText === 'string' ? overrideText : messageText;
      const trimmed = rawText.trim();
      if (!trimmed || isTyping) return;

      const userMsg: ChatMessage = { id: `${Date.now()}`, sender: 'user', text: trimmed, time: timeNow() };
      setMessages((prev) => [...prev, userMsg]);
      setMessageText('');
      setIsTyping(true);
      setHasExistingHistory(true);
      setHasLoadedRemoteHistory(true);

      try {
        const mobileId = await getChatMobileId();
        logChatDebug('chat_send mobile_id=', mobileId, 'session_id=', sessionId, 'message_len=', trimmed.length);
        const res = await sendWithTimeout(`${API_BASE}/api/v1/chatbot/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, mobile_id: mobileId, session_id: sessionId }),
        });

        logChatDebug('chat_send status=', res.status);
        if (!res.ok) {
          const errText = await res.text();
          logChatDebug('chat_send error_body=', errText);
          throw new Error('Failed');
        }

        const data = await res.json();
        logChatDebug('chat_send response_keys=', Object.keys(data || {}));
        logChatDebug('chat_send returned_session_id=', data.session_id);
        autoRestoreLatestRef.current = true;
        if (!sessionId) setSessionId(data.session_id);
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now() + 1}`, sender: 'ai', text: data.reply, time: timeNow() },
        ]);
        await loadSessions();
      } catch (err) {
        logChatDebug('chat_send error=', err);
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now() + 1}`,
            sender: 'ai',
            time: timeNow(),
            text: t({
              english: 'Sorry, I could not connect to the server. Please check your internet connection and try again.',
              urdu: 'معذرت، سرور سے رابطہ نہیں ہو سکا۔ براہ کرم اپنا انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔',
            }),
          },
        ]);
      } finally {
        setIsTyping(false);
        onInputFocusChange?.(false);
      }
    };

    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#f0faf6', paddingBottom: bottomInset }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Chat header ── */}
        <LinearGradient
          colors={['#0d5c4b', '#0f7a62', '#10b981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.chatHeaderGradient, { paddingHorizontal: r.wp(4), paddingTop: r.isSmall ? 12 : 16, paddingBottom: r.isSmall ? 14 : 18 }]}
        >
          <View style={styles.chatHeaderGlowOne} />
          <View style={styles.chatHeaderGlowTwo} />
          <View style={styles.chatHeaderInner}>
            <View style={styles.chatAvatarBox}>
              <LinearGradient colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.08)']} style={[styles.chatAvatarGradient, { width: r.fs(44), height: r.fs(44), borderRadius: r.fs(14) }]}>
                <MaterialCommunityIcons name="robot-happy-outline" size={r.fs(22)} color="#ffffff" />
              </LinearGradient>
              <View style={styles.onlineDot} />
            </View>

            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={[styles.chatTitle, { fontSize: r.fs(16) }]} numberOfLines={1}>{t(strings.chatTitle)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <View style={styles.onlineDotSmall} />
                <Text style={[styles.chatSubWhite, { fontSize: r.fs(11) }]} numberOfLines={1}>
                  {t(strings.online)} • {t({ urdu: '24/7 دستیاب', english: '24/7 Available' })}
                </Text>
              </View>
            </View>

            {/* Header action buttons */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowHistory(true)}
              style={styles.chatHeaderBtn}
            >
              <Feather name="clock" size={r.fs(16)} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={startNewChat}
              style={styles.chatHeaderBtn}
            >
              <Feather name="edit" size={r.fs(16)} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── Messages ── */}
        {loadingHistory && (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#0d5c4b" />
            <Text style={{ color: '#6b7280', fontSize: r.fs(12), marginTop: 8 }}>
              {t({ english: 'Loading chat history...', urdu: 'چیٹ ہسٹری لوڈ ہو رہی ہے...' })}
            </Text>
          </View>
        )}
        {!loadingHistory && historyError && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <View
              style={{
                backgroundColor: '#fff7ed',
                borderColor: '#fed7aa',
                borderWidth: 1,
                borderRadius: 12,
                padding: 10,
              }}
            >
              <Text style={{ color: '#9a3412', fontSize: r.fs(12.5) }}>{historyError}</Text>
            </View>
          </View>
        )}
        <ScrollView
          ref={(ref) => { scrollRef.current = ref; }}
          style={[styles.noWebFocusOutline, { flex: 1 }]}
          contentContainerStyle={[styles.chatBody, { paddingHorizontal: r.wp(4), paddingBottom: 12 }]}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          {messages.length > 0 && (
            <View style={styles.dateBadge}>
              <Text style={[styles.dateBadgeText, { fontSize: r.fs(11) }]}>
                {t({ english: 'Today', urdu: 'آج' })}
              </Text>
            </View>
          )}

          {messages.length === 0 && !loadingHistory && hasLoadedRemoteHistory && !hasExistingHistory && (
            <View
              style={{
                backgroundColor: '#ecfdf5',
                borderColor: '#a7f3d0',
                borderWidth: 1,
                borderRadius: 14,
                padding: 14,
                marginTop: 8,
              }}
            >
              <Text style={{ color: '#065f46', fontSize: r.fs(13), fontWeight: '700', marginBottom: 6 }}>
                {t({
                  english: 'Welcome to Assan Kheti AI Farming Assistant',
                  urdu: 'آسان کھیتی اے آئی فارمنگ اسسٹنٹ میں خوش آمدید',
                })}
              </Text>
            </View>
          )}

          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <View key={m.id} style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}>
                {!isUser && (
                  <LinearGradient
                    colors={['#0d5c4b', '#10b981']}
                    style={[styles.msgAvatarAi, { width: r.fs(32), height: r.fs(32), borderRadius: r.fs(10) }]}
                  >
                    <MaterialCommunityIcons name="robot-happy-outline" size={r.fs(15)} color="#ffffff" />
                  </LinearGradient>
                )}
                <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleAi, { padding: r.isSmall ? 12 : 14 }]}>
                  <Text style={[styles.msgText, { fontSize: r.fs(13.5), lineHeight: r.fs(20) }, isUser ? styles.msgTextUser : styles.msgTextAi]}>
                    {m.text}
                  </Text>
                  <View style={[styles.msgTimeBadge, isUser ? styles.msgTimeBadgeUser : styles.msgTimeBadgeAi]}>
                    <Feather name="clock" size={r.fs(9)} color={isUser ? 'rgba(255,255,255,0.5)' : '#b0b8b5'} />
                    <Text style={[styles.msgTime, { fontSize: r.fs(10) }, isUser ? styles.msgTimeUser : styles.msgTimeAi]}>{m.time}</Text>
                    {isUser && <Feather name="check" size={r.fs(10)} color="rgba(255,255,255,0.5)" />}
                  </View>
                </View>
                {isUser && (
                  <View style={[styles.msgAvatarUser, { width: r.fs(32), height: r.fs(32), borderRadius: r.fs(10) }]}>
                    <MaterialCommunityIcons name="account" size={r.fs(15)} color="#0d5c4b" />
                  </View>
                )}
              </View>
            );
          })}

          {isTyping && (
            <View style={[styles.msgRow, styles.msgRowAi]}>
              <LinearGradient colors={['#0d5c4b', '#10b981']} style={[styles.msgAvatarAi, { width: r.fs(32), height: r.fs(32), borderRadius: r.fs(10) }]}>
                <MaterialCommunityIcons name="robot-happy-outline" size={r.fs(15)} color="#ffffff" />
              </LinearGradient>
              <View style={[styles.msgBubble, styles.msgBubbleAi, styles.typingBubble]}>
                <View style={styles.typingDots}>
                  <View style={[styles.dot, { opacity: 0.3 }]} />
                  <View style={[styles.dot, { opacity: 0.6 }]} />
                  <View style={[styles.dot, { opacity: 1 }]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Composer ── */}
        <View style={[styles.chatComposer, { paddingHorizontal: r.wp(3.5) }]}>
          <MessageComposer
            draft={messageText}
            onChangeDraft={setMessageText}
            onSend={handleSend}
            onInputFocus={handleComposerFocus}
            onInputBlur={handleComposerBlur}
            placeholder={strings.typeQuestion}
            leftElement={(
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsListening((v) => !v)}
                style={[styles.micBtn, isListening && styles.micBtnActive]}
              >
                <Feather name={isListening ? 'mic-off' : 'mic'} size={r.fs(18)} color={isListening ? '#ffffff' : '#6b7280'} />
              </TouchableOpacity>
            )}
            style={{ flex: 1 }}
          />
        </View>

        {/* ── History Modal ── */}
        <Modal visible={showHistory} animationType="slide" transparent>
          <View style={styles.historyOverlay}>
            <View style={[styles.historySheet, { height: r.hp(80), minHeight: r.hp(55) }]}>
              {/* Sheet header */}
              <View style={styles.historySheetHeader}>
                <View style={styles.historyHandle} />
                <View style={styles.historyTitleRow}>
                  <Text style={[styles.historyTitle, { fontSize: r.fs(18) }]}>
                    {t({ english: 'Chat History', urdu: 'چیٹ ہسٹری' })}
                  </Text>
                  <TouchableOpacity onPress={() => setShowHistory(false)} activeOpacity={0.7}>
                    <Feather name="x" size={r.fs(22)} color="#111827" />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: '#6b7280', fontSize: r.fs(12), marginTop: 4 }}>
                  {t({ english: `${totalSessionCount} conversations`, urdu: `${totalSessionCount} گفتگو` })}
                </Text>
                {/* New chat button */}
                <TouchableOpacity style={styles.newChatBtn} activeOpacity={0.8} onPress={startNewChat}>
                  <Feather name="plus" size={r.fs(16)} color="#ffffff" />
                  <Text style={[styles.newChatBtnText, { fontSize: r.fs(13) }]}>
                    {t({ english: 'New Chat', urdu: 'نئی چیٹ' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sessions list */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              >
                {loadingSessions ? (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#0d5c4b" />
                  </View>
                ) : sessionsError ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: '#b45309', textAlign: 'center', fontSize: r.fs(12.5) }}>{sessionsError}</Text>
                    <TouchableOpacity style={[styles.newChatBtn, { marginTop: 12 }]} onPress={loadSessions} activeOpacity={0.8}>
                      <Feather name="refresh-cw" size={r.fs(14)} color="#fff" />
                      <Text style={[styles.newChatBtnText, { fontSize: r.fs(12.5) }]}>
                        {t({ english: 'Retry', urdu: 'دوبارہ کوشش' })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : sessionGroups.length === 0 ? (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <MaterialCommunityIcons name="chat-outline" size={40} color="#d1d5db" />
                    <Text style={{ color: '#9ca3af', fontSize: r.fs(13), marginTop: 12 }}>
                      {t({
                        english: 'No saved conversations yet. Start a farming chat to see it here.',
                        urdu: 'ابھی تک کوئی محفوظ گفتگو نہیں۔ یہاں دیکھنے کے لیے نئی زرعی چیٹ شروع کریں۔',
                      })}
                    </Text>
                  </View>
                ) : (
                  sessionGroups.map((group) => (
                    <View key={group.label} style={{ marginBottom: 8 }}>
                      <Text style={[styles.historyGroupLabel, { fontSize: r.fs(12) }]}>{group.label}</Text>
                      {group.sessions.map((s) => (
                        <TouchableOpacity
                          key={s.session_id}
                          style={[
                            styles.historyItem,
                            sessionId === s.session_id && styles.historyItemActive,
                          ]}
                          activeOpacity={0.8}
                          onPress={() => openSession(s.session_id)}
                        >
                          <Feather name="message-circle" size={r.fs(16)} color={sessionId === s.session_id ? '#0d5c4b' : '#6b7280'} />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.historyItemText,
                                { fontSize: r.fs(13.5) },
                                sessionId === s.session_id && styles.historyItemTextActive,
                              ]}
                              numberOfLines={1}
                            >
                              {s.title}
                            </Text>
                            {!!s.last_message && (
                              <Text style={{ color: '#6b7280', fontSize: r.fs(11.5), marginTop: 2 }} numberOfLines={1}>
                                {s.last_message}
                              </Text>
                            )}
                            <Text style={{ color: '#9ca3af', fontSize: r.fs(10.5), marginTop: 2 }}>
                              {formatSessionTime(s.updated_at || s.created_at)}
                              {s.message_count > 0 ? ` • ${s.message_count}` : ''}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => deleteSession(s.session_id)}
                            activeOpacity={0.7}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Feather name="trash-2" size={r.fs(14)} color="#d1d5db" />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  };

  const StableAIChatTab = useRef(AIChatTab).current;
  const chatBottomInset = isKeyboardVisible ? 0 : tabBarHeight;

  useEffect(() => {
    if (activeTab !== 'chat' && isChatInputFocused) {
      setIsChatInputFocused(false);
    }
  }, [activeTab, isChatInputFocused]);

  useEffect(() => {
    if (activeTab !== 'chat') return;
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      setIsChatInputFocused(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [activeTab]);

  const ProfileTab = () => (
    <ScrollView
      contentContainerStyle={[styles.scroll, { paddingHorizontal: r.wp(4), paddingBottom: tabBarHeight + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.sectionWrap, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: r.wp(4) }]}>
        <View style={{ alignItems: 'center', marginTop: r.isSmall ? 6 : 12, marginBottom: r.isSmall ? 14 : 20 }}>
          <LinearGradient colors={['#0d5c4b', '#10b981']} style={[styles.profileAvatar, { width: r.fs(88), height: r.fs(88), borderRadius: r.fs(44) }]}>
            <MaterialCommunityIcons name="account-cowboy-hat" size={r.fs(36)} color="#ffffff" />
          </LinearGradient>
          <Text style={[styles.profileTitle, { fontSize: r.fs(18) }]}>{t(strings.profileTitle)}</Text>
          <Text style={[styles.profileSub, { fontSize: r.fs(13) }]}>{t({ urdu: 'چاول کے کسان • پنجاب', english: 'Rice Farmer • Punjab' })}</Text>
        </View>

        <Text style={styles.profileSectionTitle}>
          {t({ urdu: 'اکاؤنٹ اور نیویگیشن', english: 'Account & Navigation' })}
        </Text>

        {[
          { label: { urdu: 'میرے آرڈرز', english: 'My Orders' }, icon: 'shopping-outline', onPress: () => router.push({ pathname: '/farmer-orders', params: { textLanguage, voiceLanguage } }) },
          { label: { urdu: 'میری مصنوعات', english: 'My Products' }, icon: 'leaf', onPress: () => router.push({ pathname: '/farmer-products', params: { textLanguage, voiceLanguage } }) },
          { label: { urdu: 'مدد کا مرکز', english: 'Help Center' }, icon: 'help-circle-outline', onPress: () => router.push({ pathname: '/help-center', params: { textLanguage, voiceLanguage } }) },
          { label: { urdu: 'رازداری کی پالیسی', english: 'Privacy Policy' }, icon: 'shield-lock-outline', onPress: () => router.push({ pathname: '/privacy-policy', params: { textLanguage, voiceLanguage } }) },
          { label: { urdu: 'ترتیبات', english: 'Settings' }, icon: 'cog-outline', onPress: () => router.push({ pathname: '/farmer-settings', params: { textLanguage, voiceLanguage } }) },
        ].map((item) => (
          <TouchableOpacity key={item.label.english} style={[styles.profileRow, { padding: r.isSmall ? 12 : 14 }]} activeOpacity={0.85} onPress={item.onPress}>
            <View style={[styles.profileRowIcon, { width: r.fs(40), height: r.fs(40), borderRadius: r.fs(12) }]}>
              <MaterialCommunityIcons name={item.icon as any} size={r.fs(18)} color="#0d5c4b" />
            </View>
            <Text style={[styles.profileRowText, { fontSize: r.fs(14) }]}>{t(item.label)}</Text>
            <Feather name="chevron-right" size={r.fs(17)} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const TabBar = () => (
    <View
      style={[styles.tabBarWrap, { paddingBottom: Platform.OS === 'ios' ? r.hp(3) : r.hp(1.5) }]}
      pointerEvents="box-none"
      onLayout={(e) => {
        const measured = Math.round(e.nativeEvent.layout.height);
        setTabBarHeight((prev) => (Math.abs(prev - measured) > 1 ? measured : prev));
      }}
    >
      <View style={[styles.tabBar, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        {[
          { id: 'home' as const, label: { urdu: 'ہوم', english: 'Home' }, icon: 'home' },
          { id: 'shop' as const, label: { urdu: 'شاپ', english: 'Shop' }, icon: 'shopping-outline' },
          { id: 'chat' as const, label: { urdu: 'چیٹ', english: 'Chat' }, icon: 'chat-outline' },
          { id: 'profile' as const, label: { urdu: 'پروفائل', english: 'Profile' }, icon: 'account' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const showActiveMarker = isActive && tab.id !== 'chat';
          return (
            <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} activeOpacity={0.85} style={[styles.tabBtn, showActiveMarker && styles.tabBtnActive]}>
              <MaterialCommunityIcons name={tab.icon as any} size={r.fs(21)} color={isActive ? '#0d5c4b' : '#9ca3af'} />
              <Text style={[styles.tabLabel, { fontSize: r.fs(10.5), color: isActive ? '#0d5c4b' : '#9ca3af' }]}>{t(tab.label)}</Text>
              {showActiveMarker && <View style={styles.tabDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8faf9' }}>
      <View style={{ flex: 1 }}>
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'shop' && <ShopTab />}
        {activeTab === 'chat' && (
          <StableAIChatTab
            textLanguage={textLanguage}
            r={r}
            bottomInset={chatBottomInset}
            onInputFocusChange={setIsChatInputFocused}
          />
        )}
        {activeTab === 'profile' && <ProfileTab />}

        {!(activeTab === 'chat' && isKeyboardVisible) && <TabBar />}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, backgroundColor: '#f3fbf8' },
  sectionWrap: { paddingHorizontal: 16 },

  homeHeader: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...Platform.select({
      ios: { shadowColor: '#064e3b', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16 },
      android: { elevation: 6 },
    }),
  },
  headerGlowOne: {
    position: 'absolute',
    top: -30,
    right: -18,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerGlowTwo: {
    position: 'absolute',
    bottom: -36,
    left: -24,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16,185,129,0.22)',
  },
  homeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  homeBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  homeLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeWelcomeSmall: { color: 'rgba(255,255,255,0.80)', fontSize: 12 },
  homeWelcomeName: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 2 },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f59e0b',
    borderWidth: 2,
    borderColor: '#0d5c4b',
  },
  cropCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  cropRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cropLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  cropStatusBlock: { alignItems: 'flex-end', flex: 1, minWidth: 0 },
  cropIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropTitle: { color: '#ffffff', fontWeight: '800' },
  cropSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  cropHealthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, alignSelf: 'stretch' },
  cropHealthText: { color: '#ffffff', fontWeight: '900', textAlign: 'right', flexShrink: 1, lineHeight: 16, fontSize: 13 },
  cropMeta: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4, textAlign: 'right' },

  statsCard: {
    marginTop: -14,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5f4ef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statLabel: { fontSize: 11, color: '#6b7280' },
  statValue: { fontWeight: '900', color: '#111827', marginTop: 4 },

  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#111827', marginTop: 18, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e6f4ee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  gridIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  gridTitle: { fontWeight: '900', color: '#111827', fontSize: 13 },
  gridUrdu: { fontSize: 11, color: '#10b981', marginTop: 2, fontWeight: '700' },
  gridDesc: { fontSize: 11, color: '#6b7280', marginTop: 8, lineHeight: 16 },

  promoCard: {
    borderRadius: 18,
    padding: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.22)',
  },
  promoInner: { gap: 10 },
  promoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  promoTitle: { fontWeight: '900', color: '#111827' },
  promoDesc: { color: 'rgba(17,24,39,0.8)' },
  promoBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  promoBtnText: { fontWeight: '900', color: '#111827' },

  alertHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 22, marginBottom: 10 },
  alertSectionTitle: { fontSize: 18, fontWeight: '900', color: '#111827', lineHeight: 24 },
  alertSectionSub: { marginTop: 2, fontSize: 12, color: '#6b7280', lineHeight: 17 },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9f2ef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  alertIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontWeight: '800', color: '#111827' },
  alertTime: { color: '#6b7280', fontSize: 12, marginTop: 4 },

  scanScroll: { paddingTop: 18, paddingHorizontal: 16 },
  scanTitle: { fontSize: 22, fontWeight: '900', color: '#111827', textAlign: 'center' },
  scanSub: { color: '#6b7280', textAlign: 'center', marginTop: 6 },
  scanBox: {
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: 'rgba(13,92,75,0.30)',
    backgroundColor: 'rgba(13,92,75,0.04)',
    height: 260,
    overflow: 'hidden',
  },
  scanIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(13,92,75,0.10)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  scanBoxText: { fontWeight: '800', color: '#111827' },
  scanBoxHint: { color: '#6b7280', fontSize: 12, marginTop: 6 },

  primaryBtn: {
    backgroundColor: '#0d5c4b',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '900' },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  outlineBtnText: { color: '#0d5c4b', fontWeight: '900' },

  tipCard: { marginTop: 16, backgroundColor: 'rgba(16,185,129,0.10)', borderRadius: 16, padding: 14 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipTitle: { fontWeight: '900', color: '#111827' },
  tipDesc: { color: '#6b7280', marginTop: 4, fontSize: 12, lineHeight: 16 },

  sunriseBtn: {
    marginTop: 14,
    backgroundColor: '#f9ce4e',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  sunriseBtnText: { fontWeight: '900', color: '#111827' },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e9f2ef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  productImg: { width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center' },
  productName: { fontWeight: '800', color: '#111827' },
  productPrice: { fontWeight: '900', color: '#0d5c4b', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeActive: { backgroundColor: 'rgba(16,185,129,0.15)' },
  badgeMuted: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontWeight: '900' },
  badgeTextActive: { color: '#10b981' },
  badgeTextMuted: { color: '#6b7280' },

  // Chat header
  chatHeaderGradient: {
    position: 'relative',
    overflow: 'hidden',
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      ios: { shadowColor: '#064e3b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  chatHeaderGlowOne: {
    position: 'absolute',
    top: -24,
    right: -18,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  chatHeaderGlowTwo: {
    position: 'absolute',
    bottom: -40,
    left: -22,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(16,185,129,0.24)',
  },
  chatHeaderInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chatAvatarBox: { position: 'relative' },
  chatAvatarGradient: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  onlineDot: {
    position: 'absolute', bottom: -1, right: -1,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#22c55e', borderWidth: 2.5, borderColor: '#0d5c4b',
  },
  onlineDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  chatTitle: { fontWeight: '800', color: '#ffffff' },
  chatSubWhite: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  aiBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // Quick prompts
  noWebFocusOutline: {
    outlineStyle: 'none',
  } as any,
  quickPromptRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, gap: 8 },
  quickPromptChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cdeee2',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  quickPromptText: { color: '#0d5c4b', fontWeight: '700', fontSize: 12.5, maxWidth: 260 },
  marketplaceLoginCard: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 16,
    padding: 14,
  },
  marketplaceLoginHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  marketplaceLoginTitle: { color: '#0d5c4b', fontWeight: '800', flex: 1, fontSize: 14 },
  marketplaceLoginDesc: { color: '#4b5563', fontSize: 12.5, lineHeight: 18, marginBottom: 12 },

  // Chat body
  chatBody: { padding: 16, paddingTop: 8 },
  dateBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(13,92,75,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 16,
    marginTop: 4,
  },
  dateBadgeText: { color: '#6b7280', fontWeight: '600', letterSpacing: 0.3 },

  // Messages
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14 },
  msgRowAi: { justifyContent: 'flex-start' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgAvatarAi: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  msgAvatarUser: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center',
  },
  msgBubble: {
    maxWidth: '80%', borderRadius: 18, padding: 14,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  msgBubbleAi: { backgroundColor: '#ffffff', borderColor: '#e7efec', borderBottomLeftRadius: 6 },
  msgBubbleUser: {
    backgroundColor: '#0d5c4b', borderColor: '#0f7a62', borderBottomRightRadius: 6,
    ...Platform.select({
      ios: { shadowColor: '#064e3b', shadowOpacity: 0.15 },
      android: {},
    }),
  },
  msgText: { fontSize: 13.5, lineHeight: 20 },
  msgTextAi: { color: '#1f2937' },
  msgTextUser: { color: '#ffffff' },
  msgTimeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  msgTimeBadgeUser: { justifyContent: 'flex-end' },
  msgTimeBadgeAi: { justifyContent: 'flex-start' },
  msgTime: { fontSize: 10 },
  msgTimeAi: { color: '#9ca3af' },
  msgTimeUser: { color: 'rgba(255,255,255,0.6)' },

  // Typing indicator
  typingBubble: { paddingVertical: 16, paddingHorizontal: 20 },
  typingDots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0d5c4b' },

  // Composer
  chatComposer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: 1,
    borderTopColor: '#dfe9e6',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  micBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e8eceb',
  },
  micBtnActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },

  // Chat header buttons
  chatHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // History modal
  historyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  historySheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  historySheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginBottom: 16,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyTitle: {
    fontWeight: '800',
    color: '#111827',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0d5c4b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  newChatBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  historyGroupLabel: {
    color: '#9ca3af',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 12,
    borderRadius: 12,
  },
  historyItemActive: {
    backgroundColor: '#d1fae5',
  },
  historyItemText: {
    flex: 1,
    color: '#374151',
    fontWeight: '500',
  },
  historyItemTextActive: {
    color: '#0d5c4b',
    fontWeight: '700',
  },

  profileAvatar: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  profileTitle: { marginTop: 12, fontWeight: '900', color: '#111827', fontSize: 18 },
  profileSub: { color: '#6b7280', marginTop: 4 },
  profileSectionTitle: { fontSize: 12, color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.6 },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  profileRowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(13,92,75,0.10)', alignItems: 'center', justifyContent: 'center' },
  profileRowText: { flex: 1, fontWeight: '800', color: '#111827' },

  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dfe9e6',
    paddingHorizontal: 6,
    paddingVertical: 6,
    ...Platform.select({
      ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14 },
  tabBtnActive: { backgroundColor: 'rgba(13,92,75,0.08)' },
  tabDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#0d5c4b', marginTop: 3 },
  tabLabel: { fontSize: 11, fontWeight: '800', marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalHandle: { width: 48, height: 5, borderRadius: 3, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#111827', textAlign: 'center' },
  modalSub: { textAlign: 'center', color: '#6b7280', marginTop: 6 },
  ghostBtn: { paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { fontWeight: '900', color: '#6b7280' },
});

export default FarmerDashboard;
