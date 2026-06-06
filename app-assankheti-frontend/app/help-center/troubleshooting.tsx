import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SpeechHighlight } from '@/components/SpeechHighlight';
import { useLanguage, useT } from '@/contexts/LanguageContext';
import { usePageVoiceReadout } from '@/hooks/usePageVoiceReadout';

type Pair = { english: string; urdu: string };
type Item = { title: Pair; desc: Pair };

const PAGE_TITLE: Pair = { english: 'Troubleshooting', urdu: 'مسائل حل کریں' };

const ITEMS: Item[] = [
  {
    title: { english: 'App not opening', urdu: 'ایپ نہیں کھل رہی' },
    desc: {
      english: 'Try clearing the app cache or reinstalling the app, then restart your device.',
      urdu: 'ایپ کی کیش صاف کریں یا ایپ دوبارہ انسٹال کریں، پھر اپنا ڈیوائس ری اسٹارٹ کریں۔',
    },
  },
  {
    title: { english: 'App crashes or closes suddenly', urdu: 'ایپ اچانک بند ہو جاتی ہے' },
    desc: {
      english: 'Update the app to the latest version and make sure your phone has enough free storage.',
      urdu: 'ایپ کو تازہ ترین ورژن پر اپڈیٹ کریں اور یقینی بنائیں کہ فون میں کافی خالی جگہ موجود ہے۔',
    },
  },
  {
    title: { english: 'App is slow or takes long to start', urdu: 'ایپ سست ہے یا شروع ہونے میں دیر لگتی ہے' },
    desc: {
      english: 'Close background apps, ensure a stable internet connection, and restart the app.',
      urdu: 'پس منظر میں چلنے والی ایپس بند کریں، انٹرنیٹ کنکشن مستحکم رکھیں اور ایپ دوبارہ کھولیں۔',
    },
  },
  {
    title: { english: 'Cannot log in or OTP not received', urdu: 'لاگ اِن نہیں ہو رہا یا او ٹی پی نہیں آ رہا' },
    desc: {
      english: 'Check your phone number and signal. Wait a minute and request the OTP again.',
      urdu: 'اپنا فون نمبر اور سگنل چیک کریں۔ ایک منٹ انتظار کریں اور دوبارہ او ٹی پی منگوائیں۔',
    },
  },
  {
    title: { english: 'Cannot upload image', urdu: 'تصویر اپ لوڈ نہیں ہو رہی' },
    desc: {
      english: 'Allow camera and storage permissions for the app in your phone Settings.',
      urdu: 'اپنے فون کی سیٹنگز میں ایپ کو کیمرہ اور اسٹوریج کی اجازت دیں۔',
    },
  },
  {
    title: { english: 'Disease detection not working', urdu: 'بیماری کی شناخت کام نہیں کر رہی' },
    desc: {
      english: 'Use a clear, well-lit photo of the affected leaf and keep it in focus.',
      urdu: 'متاثرہ پتے کی صاف اور اچھی روشنی والی تصویر استعمال کریں اور اسے فوکس میں رکھیں۔',
    },
  },
  {
    title: { english: 'Payments failing', urdu: 'ادائیگی ناکام ہو رہی ہے' },
    desc: {
      english: 'Ensure your internet is stable and your payment method details are correct.',
      urdu: 'اپنا انٹرنیٹ مستحکم رکھیں اور ادائیگی کے طریقے کی تفصیلات درست ہوں۔',
    },
  },
  {
    title: { english: 'Not receiving notifications', urdu: 'نوٹیفیکیشن موصول نہیں ہو رہے' },
    desc: {
      english: 'Enable notifications for the app in Settings and turn on push notifications in the app.',
      urdu: 'سیٹنگز میں ایپ کے نوٹیفیکیشن آن کریں اور ایپ میں پش نوٹیفیکیشن فعال کریں۔',
    },
  },
  {
    title: { english: 'Voice guidance not speaking', urdu: 'وائس گائیڈنس نہیں بول رہی' },
    desc: {
      english: 'Turn on voice guidance in Accessibility settings and raise your phone volume.',
      urdu: 'ایکسیسبیلیٹی سیٹنگز میں وائس گائیڈنس آن کریں اور فون کی آواز بڑھائیں۔',
    },
  },
  {
    title: { english: 'Weather not updating', urdu: 'موسم اپڈیٹ نہیں ہو رہا' },
    desc: {
      english: 'Allow location access and refresh the screen while connected to the internet.',
      urdu: 'لوکیشن کی اجازت دیں اور انٹرنیٹ سے منسلک ہو کر اسکرین ریفریش کریں۔',
    },
  },
  {
    title: { english: 'Crop prices not loading', urdu: 'فصلوں کی قیمتیں لوڈ نہیں ہو رہیں' },
    desc: {
      english: 'This needs an internet connection. Check your connection and try again shortly.',
      urdu: 'اس کے لیے انٹرنیٹ ضروری ہے۔ اپنا کنکشن چیک کریں اور تھوڑی دیر بعد دوبارہ کوشش کریں۔',
    },
  },
  {
    title: { english: 'Cannot list a product in marketplace', urdu: 'مارکیٹ پلیس میں پروڈکٹ شامل نہیں ہو رہا' },
    desc: {
      english: 'Make sure you are logged in and have filled all required fields with a clear photo.',
      urdu: 'یقینی بنائیں کہ آپ لاگ اِن ہیں اور تمام مطلوبہ خانے صاف تصویر کے ساتھ مکمل کیے ہیں۔',
    },
  },
  {
    title: { english: 'Location not detected', urdu: 'لوکیشن کا پتہ نہیں چل رہا' },
    desc: {
      english: 'Turn on GPS/location services and grant the app permission to use your location.',
      urdu: 'جی پی ایس/لوکیشن سروسز آن کریں اور ایپ کو لوکیشن استعمال کرنے کی اجازت دیں۔',
    },
  },
  {
    title: { english: 'Language or Urdu text not showing correctly', urdu: 'زبان یا اردو متن درست نہیں دکھ رہا' },
    desc: {
      english: 'Change the language from Settings, then fully close and reopen the app.',
      urdu: 'سیٹنگز سے زبان تبدیل کریں، پھر ایپ کو مکمل بند کر کے دوبارہ کھولیں۔',
    },
  },
];

const itemId = (index: number) => `troubleshoot.item.${index}`;

export default function TroubleshootingPage() {
  const router = useRouter();
  const { textLanguage, voiceLanguage } = useLanguage();
  const t = useT();
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);
  const pick = (p: Pair) => (textLanguage === 'urdu' ? p.urdu : p.english);
  const pickV = (p: Pair) => (voiceLanguage === 'urdu' ? p.urdu : p.english);

  // ── Voice guidance: read each troubleshooting problem aloud and highlight
  //    the matching card (offline via on-device TTS). ──
  const voiceSteps = useMemo(
    () => [
      { id: 'troubleshoot.header', text: pickV(PAGE_TITLE) },
      ...ITEMS.map((it, index) => ({
        id: itemId(index),
        text: `${pickV(it.title)}. ${pickV(it.desc)}`,
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [voiceLanguage]
  );

  const { activeHighlightId } = usePageVoiceReadout(voiceSteps);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ flex: 1 }}>
        <LinearGradient colors={['#0d5c4b', '#10b981']} style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.headerRow, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', justifyContent: 'space-between' }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.headerTitle}>{pick(PAGE_TITLE)}</Text>
            </View>

            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.9} accessibilityLabel={t({ english: 'Back', urdu: 'واپس' })}>
              <Feather name="arrow-left" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: horizontalPadding, marginTop: 18 }}>
            <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', gap: 12 }}>
              {ITEMS.map((it, idx) => (
                <SpeechHighlight key={idx} active={activeHighlightId === itemId(idx)}>
                  <View style={styles.card}>
                    <Text style={styles.q}>{pick(it.title)}</Text>
                    <Text style={styles.a}>{pick(it.desc)}</Text>
                  </View>
                </SpeechHighlight>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 18, paddingBottom: 22, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.75)', marginTop: 2, fontSize: 13 },

  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  q: { fontWeight: '900', color: '#111827' },
  a: { marginTop: 8, color: '#6b7280' },
});
