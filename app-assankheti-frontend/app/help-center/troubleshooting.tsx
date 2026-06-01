import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage, useT } from '@/contexts/LanguageContext';

export default function TroubleshootingPage() {
  const router = useRouter();
  const { textLanguage } = useLanguage();
  const t = useT();
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);
  const pick = (english: string, urdu: string) => (textLanguage === 'urdu' ? urdu : english);

  const items = [
    {
      title: pick('App not opening', 'ایپ نہیں کھل رہی'),
      desc: pick('Try clearing app cache or reinstalling the app. Restart your device.', 'ایپ کی کیش صاف کریں یا دوبارہ انسٹال کریں۔ اپنے ڈیوائس کو ری اسٹارٹ کریں۔'),
    },
    {
      title: pick('Cannot upload image', 'تصویر اپ لوڈ نہیں ہو رہی'),
      desc: pick('Check app permissions for camera and storage. Try granting access in Settings.', 'کیمرہ اور اسٹوریج کی اجازت چیک کریں۔ سیٹنگز میں اجازت دیں۔'),
    },
    {
      title: pick('Payments failing', 'ادائیگی ناکام ہو رہی ہے'),
      desc: pick('Ensure your internet is stable and your payment method details are correct.', 'اپنا انٹرنیٹ مستحکم رکھیں اور ادائیگی کی تفصیلات درست ہوں۔'),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ flex: 1 }}>
        <LinearGradient colors={['#0d5c4b', '#10b981']} style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.headerRow, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', justifyContent: 'space-between' }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.headerTitle}>{pick('Troubleshooting', 'مسائل حل کریں')}</Text>
            </View>

            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.9} accessibilityLabel={t({ english: 'Back', urdu: 'واپس' })}>
              <Feather name="arrow-left" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: horizontalPadding, marginTop: 18 }}>
            <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', gap: 12 }}>
              {items.map((it, idx) => (
                <View key={idx} style={styles.card}>
                  <Text style={styles.q}>{it.title}</Text>
                  <Text style={styles.a}>{it.desc}</Text>
                </View>
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
