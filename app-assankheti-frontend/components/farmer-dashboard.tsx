import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SmartBudgetCalculator from '@/app/smart-budget';
import MessageComposer from '@/components/MessageComposer';



type Props = {
  textLanguage?: 'urdu' | 'english';
  voiceLanguage?: 'urdu' | 'english';
  initialTab?: Tab;
  selectedCrop?: string;
};
type Tab = 'home' | 'shop' | 'chat' | 'profile';

export function FarmerDashboard({ textLanguage = 'english', voiceLanguage = 'english', initialTab = 'home', selectedCrop }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const { width } = useWindowDimensions();

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
              params: { textLanguage, voiceLanguage },
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
          icon: <Feather name="bell" size={22} color="#ffffff" />,
          gradient: ['#3b82f6', '#2563eb'] as const,
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

  const HomeTab = () => (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#0d5c4b', '#10b981']} style={styles.homeHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.homeHeaderRow}>
          <View style={styles.homeBrandRow}>
            <View style={styles.homeLogoBox}>
              <MaterialCommunityIcons name="account-cowboy-hat" size={22} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.homeWelcomeName}>{t(strings.farmer)}</Text>
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
                <Text style={styles.cropTitle}>{t({ urdu: 'چاول کی فصل', english: 'Rice Crop' })}</Text>
              </View>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <View style={styles.cropHealthRow}>
                <MaterialCommunityIcons name="leaf" size={16} color="#ffffff" />
                <Text style={styles.cropHealthText}>{t(strings.healthy)}</Text>
              </View>
              <Text style={styles.cropMeta}>{t(strings.lastScan)}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.sectionWrap, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <View style={styles.statsCard}>
          {[
            { icon: 'weather-cloudy', label: { urdu: 'موسم', english: 'Weather' }, value: '28°C', color: '#06b6d4' },
            { icon: 'trending-up', label: { urdu: 'چاول کی قیمت', english: 'Rice Price' }, value: '₨45/kg', color: '#f59e0b' },
            { icon: 'leaf', label: { urdu: 'فصل کی صحت', english: 'Crop Health' }, value: '95%', color: '#10b981' },
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

  // const ScanTab = () => (
  //   <ScrollView contentContainerStyle={[styles.scanScroll, { paddingBottom: 120 }]}>
  //     <View style={[styles.sectionWrap, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
  //       <Text style={styles.scanTitle}>{t(strings.diseaseTitle)}</Text>
  //       <Text style={styles.scanSub}>فصل کی بیماری کا پتہ لگائیں</Text>

  //       <TouchableOpacity activeOpacity={0.9} style={styles.scanBox} onPress={() => setShowScanModal(true)}>
  //         <LinearGradient colors={['rgba(13,92,75,0.10)', 'rgba(16,185,129,0.10)']} style={StyleSheet.absoluteFill} />
  //         <View style={styles.scanIconCircle}>
  //           <Feather name="camera" size={26} color="#0d5c4b" />
  //         </View>
  //         <Text style={styles.scanBoxText}>{t(strings.scanYourCrop)}</Text>
  //         <Text style={styles.scanBoxHint}>{t(strings.scanHint)}</Text>
  //       </TouchableOpacity>

  //       <View style={{ marginTop: 16, gap: 10 }}>
  //         <TouchableOpacity
  //           style={styles.primaryBtn}
  //           activeOpacity={0.9}
  //           onPress={() => router.push('/disease-detection')}
  //         ></TouchableOpacity>

  //         <TouchableOpacity
  //           style={styles.outlineBtn}
  //           activeOpacity={0.9}
  //           onPress={() => router.push('/disease-detection')}
  //         ></TouchableOpacity>
  //       </View>

  //       <View style={styles.tipCard}>
  //         <View style={styles.tipRow}>
  //           <MaterialCommunityIcons name="star-four-points" size={18} color="#0d5c4b" />
  //           <View style={{ flex: 1 }}>
  //             <Text style={styles.tipTitle}>{t(strings.aiPowered)}</Text>
  //             <Text style={styles.tipDesc}>{t(strings.aiDesc)}</Text>
  //           </View>
  //         </View>
  //       </View>
  //     </View>
  //   </ScrollView>
  // );

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

  const AIChatTab = ({ textLanguage }: { textLanguage: 'urdu' | 'english' }) => {
    const [messageText, setMessageText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    const timeNow = () =>
      new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

    const [messages, setMessages] = useState<ChatMessage[]>([
      {
        id: '1',
        sender: 'ai',
        time: timeNow(),
        text: t({
          english:
            "Assalam-o-Alaikum! 🌾 I'm your AI Farming Assistant. I can help you with crop diseases, farming tips, weather guidance, and much more. How can I assist you today?",
          urdu:
            'السلام علیکم! 🌾 میں آپ کا اے آئی زرعی اسسٹنٹ ہوں۔ میں فصل کی بیماریوں، زرعی مشوروں، موسم کی رہنمائی اور بہت کچھ میں مدد کر سکتا ہوں۔ آپ کیسے مدد چاہتے ہیں؟',
        }),
      },
    ]);

    const scrollRef = useRef<ScrollView | null>(null);

    useEffect(() => {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }, [messages, isTyping]);

    const aiResponses: Record<string, { urdu: string; english: string }> = useMemo(
      () => ({
        disease: {
          english:
            'Based on common rice diseases in Punjab, here are some tips:\n\n🔸 Blast Disease: Use Tricyclazole fungicide\n🔸 Brown Spot: Apply Mancozeb spray\n🔸 Bacterial Leaf Blight: Use copper-based solutions\n\nWould you like me to analyze a specific crop image?',
          urdu:
            'پنجاب میں چاول کی عام بیماریوں کے حوالے سے چند مشورے:\n\n🔸 بلاسٹ: ٹرائی سائیکلازول فنجی سائیڈ استعمال کریں\n🔸 براؤن اسپاٹ: مینکوزیب سپرے کریں\n🔸 بیکٹیریل لیف بلیٹ: کاپر بیسڈ محلول استعمال کریں\n\nکیا آپ چاہتے ہیں کہ میں کسی فصل کی تصویر کا تجزیہ کروں؟',
        },
        weather: {
          english:
            '🌤️ Weather Forecast for Punjab:\n\nToday: Sunny, 28°C\nHumidity: 65%\nWind: Light breeze\n\n⚠️ No rain expected for next 3 days. Consider irrigation for your crops.',
          urdu:
            '🌤️ پنجاب کے لیے موسم کی پیش گوئی:\n\nآج: دھوپ، 28°C\nنمی: 65%\nہوا: ہلکی\n\n⚠️ اگلے 3 دن بارش کا امکان نہیں۔ فصل کے لیے آبپاشی پر غور کریں۔',
        },
        fertilizer: {
          english:
            '📊 Fertilizer Recommendation for Rice:\n\nFor 1 acre of rice field:\n• Urea: 50 kg\n• DAP: 25 kg\n• Potash: 20 kg\n\nBest time to apply: Early morning or evening for better absorption.',
          urdu:
            '📊 چاول کے لیے کھاد کی سفارش:\n\n1 ایکڑ چاول کے لیے:\n• یوریا: 50 کلو\n• ڈی اے پی: 25 کلو\n• پوٹاش: 20 کلو\n\nبہترین وقت: بہتر جذب کے لیے صبح سویرے یا شام۔',
        },
        price: {
          english:
            '📈 Current Mandi Prices:\n\n🌾 Basmati Rice: ₨3,800/40kg\n🌾 IRRI Rice: ₨2,200/40kg\n🌾 Wheat: ₨2,800/40kg\n\nPrices are from Lahore Mandi. Updated today.',
          urdu:
            '📈 موجودہ منڈی ریٹس:\n\n🌾 باسمتی چاول: ₨3,800/40kg\n🌾 اری چاول: ₨2,200/40kg\n🌾 گندم: ₨2,800/40kg\n\nریٹس لاہور منڈی کے ہیں۔ آج اپڈیٹ ہوئے۔',
        },
        help: {
          english:
            'I can help you with:\n\n1️⃣ Crop disease detection\n2️⃣ Weather updates\n3️⃣ Fertilizer recommendations\n4️⃣ Mandi prices\n5️⃣ Farming best practices\n6️⃣ Government schemes\n\nJust ask me anything!',
          urdu:
            'میں ان چیزوں میں مدد کر سکتا ہوں:\n\n1️⃣ فصل کی بیماری کی تشخیص\n2️⃣ موسم کی اپڈیٹس\n3️⃣ کھاد کی سفارشات\n4️⃣ منڈی کے ریٹس\n5️⃣ بہترین زرعی طریقے\n6️⃣ حکومتی اسکیمیں\n\nبس اپنا سوال پوچھیں!',
        },
      }),
      []
    );

    const getAIResponse = (userMessage: string): string => {
      const lowerMessage = userMessage.toLowerCase();
      if (lowerMessage.includes('disease') || lowerMessage.includes('bimari') || lowerMessage.includes('problem')) return t(aiResponses.disease);
      if (lowerMessage.includes('weather') || lowerMessage.includes('mausam') || lowerMessage.includes('barish')) return t(aiResponses.weather);
      if (lowerMessage.includes('fertilizer') || lowerMessage.includes('khad') || lowerMessage.includes('urea')) return t(aiResponses.fertilizer);
      if (lowerMessage.includes('price') || lowerMessage.includes('rate') || lowerMessage.includes('mandi') || lowerMessage.includes('qeemat')) return t(aiResponses.price);
      if (lowerMessage.includes('help') || lowerMessage.includes('madad') || lowerMessage.includes('kya')) return t(aiResponses.help);

      return t({
        english:
          "Thank you for your question! 🌱 I'm here to help with farming queries. You can ask me about:\n\n• Crop diseases and treatments\n• Weather updates\n• Fertilizer dosages\n• Market prices\n• Farming tips\n\nHow can I assist you?",
        urdu:
          'آپ کے سوال کا شکریہ! 🌱 میں زرعی سوالات میں مدد کے لیے موجود ہوں۔ آپ یہ پوچھ سکتے ہیں:\n\n• فصل کی بیماریاں اور علاج\n• موسم کی اپڈیٹس\n• کھاد کی مقدار\n• منڈی کے ریٹس\n• زرعی مشورے\n\nمیں کیسے مدد کروں؟',
      });
    };

    const handleSend = () => {
      const trimmed = messageText.trim();
      if (!trimmed || isTyping) return;

      const userMsg: ChatMessage = {
        id: `${Date.now()}`,
        sender: 'user',
        text: trimmed,
        time: timeNow(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setMessageText('');
      setIsTyping(true);

      const captured = trimmed;
      setTimeout(() => {
        const aiMsg: ChatMessage = {
          id: `${Date.now() + 1}`,
          sender: 'ai',
          text: getAIResponse(captured),
          time: timeNow(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
      }, 1500);
    };

    const quickPrompts: string[] = [];

    return (
      <View style={{ flex: 1, paddingBottom: 160 }}>
        <View style={styles.chatHeader}>
          <View style={styles.chatAvatar}>
            <Feather name="cpu" size={20} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.chatTitle}>{t(strings.chatTitle)}</Text>
              <MaterialCommunityIcons name="star-four-points" size={14} color="#0d5c4b" />
            </View>
            <Text style={styles.chatSub}>{t({ urdu: '24/7 دستیاب', english: '24/7 Available' })} • {t(strings.online)}</Text>
          </View>
        </View>

        {quickPrompts.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPromptRow}>
            {quickPrompts.map((p) => (
              <TouchableOpacity key={p} activeOpacity={0.9} style={styles.quickPromptChip} onPress={() => setMessageText(p)}>
                <Text style={styles.quickPromptText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <ScrollView
          ref={(r) => {
            scrollRef.current = r;
          }}
          contentContainerStyle={[styles.chatBody, { paddingBottom: 140 }]}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <View key={m.id} style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}>
                {!isUser ? (
                  <View style={styles.msgAvatarAi}>
                    <Feather name="cpu" size={14} color="#ffffff" />
                  </View>
                ) : null}

                <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleAi]}>
                  <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextAi]}>{m.text}</Text>
                  <Text style={[styles.msgTime, isUser ? styles.msgTimeUser : styles.msgTimeAi]}>{m.time}</Text>
                </View>

                {isUser ? (
                  <View style={styles.msgAvatarUser}>
                    <Feather name="user" size={14} color="#111827" />
                  </View>
                ) : null}
              </View>
            );
          })}

          {isTyping ? (
            <View style={[styles.msgRow, styles.msgRowAi]}>
              <View style={styles.msgAvatarAi}>
                <Feather name="cpu" size={14} color="#ffffff" />
              </View>
              <View style={[styles.msgBubble, styles.msgBubbleAi, { paddingVertical: 12 }]}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#6b7280" />
                  <Text style={[styles.msgText, styles.msgTextAi]}>{t({ urdu: 'ٹائپ ہو رہا ہے…', english: 'Typing…' })}</Text>
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.chatComposer}>
          <MessageComposer
            draft={messageText}
            onChangeDraft={setMessageText}
            onSend={handleSend}
            placeholder={strings.typeQuestion}
            leftElement={(
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setIsListening((v) => !v)}
                style={[styles.micBtn, isListening ? styles.micBtnActive : null]}
              >
                <Feather name={isListening ? 'mic-off' : 'mic'} size={18} color={isListening ? '#ffffff' : '#6b7280'} />
              </TouchableOpacity>
            )}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    );
  };

  const ProfileTab = () => (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.sectionWrap, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 16 }}>
          <LinearGradient colors={['#0d5c4b', '#10b981']} style={styles.profileAvatar}>
            <Feather name="user" size={34} color="#ffffff" />
          </LinearGradient>
          <Text style={styles.profileTitle}>{t(strings.profileTitle)}</Text>
          <Text style={styles.profileSub}>{t({ urdu: 'چاول کے کسان • پنجاب', english: 'Rice Farmer • Punjab' })}</Text>
        </View>

        {[
          { label: { urdu: 'میرے آرڈرز', english: 'My Orders' }, icon: 'shopping-outline', onPress: () => router.push({ pathname: '/farmer-orders', params: { textLanguage, voiceLanguage } }) },
          { label: { urdu: 'میری مصنوعات', english: 'My Products' }, icon: 'leaf', onPress: () => router.push({ pathname: '/farmer-products', params: { textLanguage, voiceLanguage } }) },
          { label: { urdu: 'اطلاعات', english: 'Notifications' }, icon: 'bell', onPress: () => router.push({ pathname: '/farmer-notifications', params: { textLanguage, voiceLanguage } }) },
          { label: { urdu: 'مدد کا مرکز', english: 'Help Center' }, icon: 'help-circle-outline', onPress: () => router.push({ pathname: '/help-center', params: { textLanguage, voiceLanguage } }) },
          { label: { urdu: 'رازداری کی پالیسی', english: 'Privacy Policy' }, icon: 'shield-lock-outline', onPress: () => router.push({ pathname: '/privacy-policy', params: { textLanguage, voiceLanguage } }) },
          { label: { urdu: 'ترتیبات', english: 'Settings' }, icon: 'cog-outline', onPress: () => router.push({ pathname: '/farmer-settings', params: { textLanguage, voiceLanguage } }) },
        ].map((i) => (
          <TouchableOpacity key={i.label.english} style={styles.profileRow} activeOpacity={0.9} onPress={i.onPress}>
            <View style={styles.profileRowIcon}>
              <MaterialCommunityIcons name={i.icon as any} size={18} color="#0d5c4b" />
            </View>
            <Text style={styles.profileRowText}>{t(i.label)}</Text>
            <Feather name="chevron-right" size={18} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const TabBar = () => (
    <View style={styles.tabBarWrap}>
      <View style={[styles.tabBar, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        {[
          { id: 'home' as const, label: { urdu: 'ہوم', english: 'Home' }, icon: 'home' },
          { id: 'shop' as const, label: { urdu: 'شاپ', english: 'Shop' }, icon: 'shopping-outline' },
          { id: 'chat' as const, label: { urdu: 'چیٹ', english: 'Chat' }, icon: 'chat-outline' },
          { id: 'profile' as const, label: { urdu: 'پروفائل', english: 'Profile' }, icon: 'account' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} activeOpacity={0.9} style={[styles.tabBtn, isActive ? styles.tabBtnActive : null]}>
              <MaterialCommunityIcons name={tab.icon as any} size={20} color={isActive ? '#0d5c4b' : '#6b7280'} />
              <Text style={[styles.tabLabel, { color: isActive ? '#0d5c4b' : '#6b7280' }]}>{t(tab.label)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f1e8' }}>
      <View style={{ flex: 1 }}>
        {activeTab === 'home' && <HomeTab />}
        {/* {activeTab === 'scan' && <ScanTab />} */}
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

  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  chatAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0d5c4b', alignItems: 'center', justifyContent: 'center' },
  chatTitle: { fontWeight: '900', color: '#111827' },
  chatSub: { color: '#10b981', fontSize: 12, marginTop: 2 },
  quickPromptRow: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, gap: 8 },
  quickPromptChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(13,92,75,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.18)',
  },
  quickPromptText: { color: '#0d5c4b', fontWeight: '900', fontSize: 12 },
  chatBody: { padding: 16 },
  chatRow: { flexDirection: 'row', gap: 10 },
  chatBubbleIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0d5c4b', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  chatBubble: { backgroundColor: '#ffffff', borderRadius: 18, padding: 12, maxWidth: '82%' },
  chatBubbleText: { color: '#111827' },
  chatBubbleSub: { color: '#6b7280', fontSize: 12, marginTop: 8 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 12 },
  msgRowAi: { justifyContent: 'flex-start' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgAvatarAi: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0d5c4b', alignItems: 'center', justifyContent: 'center' },
  msgAvatarUser: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  msgBubble: { maxWidth: '82%', borderRadius: 18, padding: 12 },
  msgBubbleAi: { backgroundColor: '#ffffff', borderTopLeftRadius: 6 },
  msgBubbleUser: { backgroundColor: '#0d5c4b', borderTopRightRadius: 6 },
  msgText: { fontSize: 13, lineHeight: 18 },
  msgTextAi: { color: '#111827' },
  msgTextUser: { color: '#ffffff' },
  msgTime: { fontSize: 10, marginTop: 6, textAlign: 'right' },
  msgTimeAi: { color: '#6b7280' },
  msgTimeUser: { color: 'rgba(255,255,255,0.75)' },
  chatComposer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 86 : 74,
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  micBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnActive: { backgroundColor: '#ef4444' },
  chatInput: { flex: 1, height: 46, borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, backgroundColor: '#f9fafb', color: '#111827' },
  chatSend: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#0d5c4b', alignItems: 'center', justifyContent: 'center' },
  chatSendDisabled: { opacity: 0.55 },

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