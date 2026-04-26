import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

type Props = {
  textLanguage?: 'urdu' | 'english';
  voiceLanguage?: 'urdu' | 'english';
  initialTab?: Tab;
  selectedCrop?: string;
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

export function FarmerDashboard({ textLanguage = 'english', voiceLanguage = 'english', initialTab = 'home', selectedCrop }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const r = useResponsive();
  const { width } = useWindowDimensions();
  
  // Real-time data states
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null);
  const [cropPrice, setCropPrice] = useState<number | null>(null);
  const [cropHealth, setCropHealth] = useState<number>(95);
  const [location, setLocation] = useState<any>(null);
  const [lastScanTime, setLastScanTime] = useState<string>('Today');
  const [lastScanData, setLastScanData] = useState<any>(null);

  const t = (obj: any) => obj[textLanguage];

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
        viewAll: { urdu: 'سب دیکھیں', english: 'View All' },
        marketplace: { urdu: 'مارکیٹ پلیس', english: 'Marketplace' },
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

  const greeting = getGreeting();

  // Load last scan data when page comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Dashboard focused - loading scan data...');
      const loadLastScan = async () => {
        try {
          const mobileId = await getOrCreateMobileId();
          const response = await fetch(`http://localhost:8000/api/v1/disease/last-scan/${mobileId}`);

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
        const response = await fetch('http://localhost:8000/api/v1/calculator/prices/crop');
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
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#0d5c4b', '#0f7a62', '#10b981']} style={[styles.homeHeader, { paddingHorizontal: r.wp(5) }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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
                <Text style={styles.cropTitle}>{selectedCrop ? selectedCrop + ' ' + t({ urdu: 'فصل', english: 'Crop' }) : t({ urdu: 'چاول کی فصل', english: 'Rice Crop' })}</Text>
              </View>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <View style={styles.cropHealthRow}>
                <MaterialCommunityIcons name="leaf" size={16} color="#ffffff" />
                <Text style={styles.cropHealthText}>
                  {lastScanData ? (
                    !String(lastScanData?.disease ?? '').trim() ||
                    lastScanData.disease === 'no disease' ||
                    lastScanData.disease === 'Healthy'
                      ? t(strings.healthy)
                      : lastScanData.disease
                  ) : t(strings.healthy)}
                </Text>
              </View>
              <Text style={styles.cropMeta}>
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
            { icon: 'weather-cloudy', label: { urdu: 'موسم', english: 'Weather' }, value: weather ? `${weather.temp}°C` : '...', color: '#06b6d4' },
            { icon: 'trending-up', label: { urdu: 'چاول کی قیمت', english: 'Rice Price' }, value: cropPrice ? `₨${cropPrice}/kg` : '...', color: '#f59e0b' },
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
          <Text style={styles.sectionTitle}>{t(strings.recentAlerts)}</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>{t(strings.viewAll)}</Text>
          </TouchableOpacity>
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
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.sectionWrap, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <Text style={styles.scanTitle}>{t(strings.marketplace)}</Text>
        <Text style={styles.scanSub}>Sell your products directly</Text>

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
      </View>
    </ScrollView>
  );

  const ChatTab = () => (
    <AIChatTab textLanguage={textLanguage} />
  );

  type ChatMessage = {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    time: string;
  };

  type SessionItem = { session_id: string; title: string; created_at: string; updated_at: string };
  type SessionGroup = { label: string; sessions: SessionItem[] };

  const AIChatTab = (_props: { textLanguage: 'urdu' | 'english' }) => {
    const [messageText, setMessageText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);

    const timeNow = () =>
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const welcomeMsg: ChatMessage = {
      id: 'welcome',
      sender: 'ai',
      time: timeNow(),
      text: t({
        english: "Assalam-o-Alaikum! I'm your AI Farming Assistant powered by Assan Kheti. Ask me anything about crop diseases, fertilizers, weather, mandi prices, and more!",
        urdu: 'السلام علیکم! میں آپ کا اے آئی زرعی اسسٹنٹ ہوں۔ فصل کی بیماریوں، کھاد، موسم، منڈی ریٹس اور بہت کچھ کے بارے میں پوچھیں!',
      }),
    };

    const [messages, setMessages] = useState<ChatMessage[]>([welcomeMsg]);
    const scrollRef = useRef<ScrollView | null>(null);

    // Load most recent session on mount
    useEffect(() => {
      (async () => {
        try {
          const mobileId = await getOrCreateMobileId();
          console.log('[Chat] mobile_id:', mobileId, 'API_BASE:', API_BASE);
          const url = `${API_BASE}/api/v1/chatbot/sessions/${mobileId}`;
          console.log('[Chat] Loading sessions from:', url);
          const res = await fetch(url);
          console.log('[Chat] Sessions response status:', res.status);
          if (res.ok) {
            const data = await res.json();
            const groups = data.groups || {};
            const allSessions: SessionItem[] = Object.values(groups).flat() as SessionItem[];
            console.log('[Chat] Found sessions:', allSessions.length);
            if (allSessions.length > 0) {
              const latest = allSessions[0];
              setSessionId(latest.session_id);
              await loadSession(mobileId, latest.session_id);
              return;
            }
          }
        } catch (err) {
          console.error('[Chat] Load sessions error:', err);
        }
        setLoadingHistory(false);
      })();
    }, []);

    const loadSession = async (mobileId: string, sid: string) => {
      setLoadingHistory(true);
      try {
        const url = `${API_BASE}/api/v1/chatbot/history/${mobileId}/${sid}`;
        console.log('[Chat] Loading session:', url);
        const res = await fetch(url);
        console.log('[Chat] Session history status:', res.status);
        if (res.ok) {
          const data = await res.json();
          console.log('[Chat] Loaded messages:', data.messages?.length);
          if (data.messages && data.messages.length > 0) {
            const history: ChatMessage[] = data.messages.map((m: any, i: number) => ({
              id: `hist-${i}`,
              sender: m.sender,
              text: m.text,
              time: m.time || '',
            }));
            setMessages([welcomeMsg, ...history]);
          } else {
            setMessages([welcomeMsg]);
          }
        }
      } catch (err) {
        console.error('[Chat] Load session error:', err);
      }
      setLoadingHistory(false);
    };

    const loadSessions = async () => {
      setLoadingSessions(true);
      try {
        const mobileId = await getOrCreateMobileId();
        const url = `${API_BASE}/api/v1/chatbot/sessions/${mobileId}`;
        console.log('[Chat] Loading sessions list from:', url);
        const res = await fetch(url);
        console.log('[Chat] Sessions list status:', res.status);
        if (res.ok) {
          const data = await res.json();
          console.log('[Chat] Sessions data:', JSON.stringify(data));
          const groups = data.groups || {};
          const result: SessionGroup[] = Object.entries(groups).map(([label, sessions]) => ({
            label,
            sessions: sessions as SessionItem[],
          }));
          console.log('[Chat] Parsed groups:', result.length, result.map(g => `${g.label}(${g.sessions.length})`));
          setSessionGroups(result);
        }
      } catch (err) {
        console.error('[Chat] Load sessions list error:', err);
      }
      setLoadingSessions(false);
    };

    const startNewChat = () => {
      setSessionId(null);
      setMessages([welcomeMsg]);
      setShowHistory(false);
    };

    const openSession = async (sid: string) => {
      setSessionId(sid);
      setShowHistory(false);
      const mobileId = await getOrCreateMobileId();
      await loadSession(mobileId, sid);
    };

    const deleteSession = async (sid: string) => {
      try {
        const mobileId = await getOrCreateMobileId();
        await fetch(`${API_BASE}/api/v1/chatbot/session/${mobileId}/${sid}`, { method: 'DELETE' });
        if (sessionId === sid) startNewChat();
        await loadSessions();
      } catch {}
    };

    useEffect(() => {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }, [messages, isTyping, loadingHistory]);

    const handleSend = async () => {
      const trimmed = messageText.trim();
      if (!trimmed || isTyping) return;

      const userMsg: ChatMessage = { id: `${Date.now()}`, sender: 'user', text: trimmed, time: timeNow() };
      setMessages((prev) => [...prev, userMsg]);
      setMessageText('');
      setIsTyping(true);

      try {
        const mobileId = await getOrCreateMobileId();
        console.log('[Chat] Sending:', trimmed, 'session:', sessionId, 'mobile:', mobileId);
        const res = await fetch(`${API_BASE}/api/v1/chatbot/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, mobile_id: mobileId, session_id: sessionId }),
        });

        console.log('[Chat] Send response status:', res.status);
        if (!res.ok) {
          const errText = await res.text();
          console.error('[Chat] Send error body:', errText);
          throw new Error('Failed');
        }

        const data = await res.json();
        console.log('[Chat] Got reply, session_id:', data.session_id);
        if (!sessionId) setSessionId(data.session_id);
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now() + 1}`, sender: 'ai', text: data.reply, time: timeNow() },
        ]);
      } catch (err) {
        console.error('[Chat] Send failed:', err);
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
      }
    };

    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#f0faf6', marginBottom: tabBarH }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Chat header ── */}
        <LinearGradient
          colors={['#0d5c4b', '#0f7a62', '#10b981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.chatHeaderGradient, { paddingHorizontal: r.wp(4), paddingTop: r.isSmall ? 12 : 16, paddingBottom: r.isSmall ? 14 : 18 }]}
        >
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
              onPress={() => { loadSessions(); setShowHistory(true); }}
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
        <ScrollView
          ref={(ref) => { scrollRef.current = ref; }}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.chatBody, { paddingHorizontal: r.wp(4), paddingBottom: 12 }]}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.dateBadge}>
            <Text style={[styles.dateBadgeText, { fontSize: r.fs(11) }]}>
              {t({ english: 'Today', urdu: 'آج' })}
            </Text>
          </View>

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
            <View style={[styles.historySheet, { maxHeight: r.hp(80) }]}>
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
                {/* New chat button */}
                <TouchableOpacity style={styles.newChatBtn} activeOpacity={0.8} onPress={startNewChat}>
                  <Feather name="plus" size={r.fs(16)} color="#ffffff" />
                  <Text style={[styles.newChatBtnText, { fontSize: r.fs(13) }]}>
                    {t({ english: 'New Chat', urdu: 'نئی چیٹ' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sessions list */}
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {loadingSessions ? (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#0d5c4b" />
                  </View>
                ) : sessionGroups.length === 0 ? (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <MaterialCommunityIcons name="chat-outline" size={40} color="#d1d5db" />
                    <Text style={{ color: '#9ca3af', fontSize: r.fs(13), marginTop: 12 }}>
                      {t({ english: 'No conversations yet', urdu: 'ابھی تک کوئی گفتگو نہیں' })}
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

  const ProfileTab = () => (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: r.wp(4), paddingBottom: tabBarH + 20 }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.sectionWrap, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: r.wp(4) }]}>
        <View style={{ alignItems: 'center', marginTop: r.isSmall ? 6 : 12, marginBottom: r.isSmall ? 14 : 20 }}>
          <LinearGradient colors={['#0d5c4b', '#10b981']} style={[styles.profileAvatar, { width: r.fs(88), height: r.fs(88), borderRadius: r.fs(44) }]}>
            <MaterialCommunityIcons name="account-cowboy-hat" size={r.fs(36)} color="#ffffff" />
          </LinearGradient>
          <Text style={[styles.profileTitle, { fontSize: r.fs(18) }]}>{t(strings.profileTitle)}</Text>
          <Text style={[styles.profileSub, { fontSize: r.fs(13) }]}>{t({ urdu: 'چاول کے کسان • پنجاب', english: 'Rice Farmer • Punjab' })}</Text>
        </View>

        {[
          { label: { urdu: 'میرے آرڈرز', english: 'My Orders' }, icon: 'shopping-outline', onPress: () => router.push({ pathname: '/farmer-orders', params: { textLanguage, voiceLanguage } }) },
          { label: { urdu: 'میری مصنوعات', english: 'My Products' }, icon: 'leaf', onPress: () => router.push({ pathname: '/farmer-products', params: { textLanguage, voiceLanguage } }) },
          { label: { urdu: 'اطلاعات', english: 'Notifications' }, icon: 'bell', onPress: () => router.push({ pathname: '/farmer-notifications', params: { textLanguage, voiceLanguage } }) },
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
    <View style={[styles.tabBarWrap, { paddingBottom: Platform.OS === 'ios' ? r.hp(3) : r.hp(1.5) }]}>
      <View style={[styles.tabBar, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        {[
          { id: 'home' as const, label: { urdu: 'ہوم', english: 'Home' }, icon: 'home' },
          { id: 'shop' as const, label: { urdu: 'شاپ', english: 'Shop' }, icon: 'shopping-outline' },
          { id: 'chat' as const, label: { urdu: 'چیٹ', english: 'Chat' }, icon: 'chat-outline' },
          { id: 'profile' as const, label: { urdu: 'پروفائل', english: 'Profile' }, icon: 'account' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} activeOpacity={0.85} style={[styles.tabBtn, isActive && styles.tabBtnActive]}>
              <MaterialCommunityIcons name={tab.icon as any} size={r.fs(21)} color={isActive ? '#0d5c4b' : '#9ca3af'} />
              <Text style={[styles.tabLabel, { fontSize: r.fs(10.5), color: isActive ? '#0d5c4b' : '#9ca3af' }]}>{t(tab.label)}</Text>
              {isActive && <View style={styles.tabDot} />}
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
        {activeTab === 'chat' && <ChatTab />}
        {activeTab === 'profile' && <ProfileTab />}

        <TabBar />

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  sectionWrap: { paddingHorizontal: 16 },

  homeHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  cropRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cropLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  cropHealthRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cropHealthText: { color: '#ffffff', fontWeight: '900' },
  cropMeta: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 },

  statsCard: {
    marginTop: -14,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
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

  promoCard: { borderRadius: 18, padding: 16, marginTop: 6 },
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

  alertHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 },
  viewAll: { color: '#0d5c4b', fontWeight: '800' },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
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
    backgroundColor: '#fbbf24',
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
  quickPromptRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 8 },
  quickPromptChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#d1fae5',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  quickPromptText: { color: '#0d5c4b', fontWeight: '700', fontSize: 12.5 },

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
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  msgBubbleAi: { backgroundColor: '#ffffff', borderBottomLeftRadius: 6 },
  msgBubbleUser: {
    backgroundColor: '#0d5c4b', borderBottomRightRadius: 6,
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
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e8eceb',
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  tabBar: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
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