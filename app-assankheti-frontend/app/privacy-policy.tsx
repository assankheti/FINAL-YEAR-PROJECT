import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import InfoPage from '@/components/InfoPage';
import { useLanguage } from '@/contexts/LanguageContext';

type Section = {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  titleUrdu: string;
  content: string[];
};

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const { textLanguage } = useLanguage();
  const pick = (english: string, urdu: string) => (textLanguage === 'urdu' ? urdu : english);
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const sections = useMemo<Section[]>(
    () => [
      {
        icon: 'database',
        title: pick('Information We Collect', 'معلومات جو ہم جمع کرتے ہیں'),
        titleUrdu: 'معلومات جو ہم جمع کرتے ہیں',
        content: [
          pick('Personal information (name, phone number, location)', 'ذاتی معلومات (نام، فون نمبر، مقام)'),
          pick('Farm details and crop information', 'فارم کی تفصیلات اور فصل کی معلومات'),
          pick('Transaction history and payment details', 'ٹرانزیکشن ہسٹری اور ادائیگی کی تفصیلات'),
          pick('Device information and usage data', 'ڈیوائس کی معلومات اور استعمال کا ڈیٹا'),
          pick('Photos uploaded for disease detection', 'بیماری کی شناخت کے لیے اپ لوڈ کی گئی تصاویر'),
        ],
      },
      {
        icon: 'eye',
        title: pick('How We Use Your Data', 'ہم آپ کا ڈیٹا کیسے استعمال کرتے ہیں'),
        titleUrdu: 'ہم آپ کا ڈیٹا کیسے استعمال کرتے ہیں',
        content: [
          pick('To provide crop disease detection services', 'فصل کی بیماری کی شناخت کی خدمات فراہم کرنے کے لیے'),
          pick('To connect farmers with buyers', 'کسانوں کو خریداروں سے جوڑنے کے لیے'),
          pick('To send weather and price alerts', 'موسم اور قیمت کے الرٹس بھیجنے کے لیے'),
          pick('To improve our AI models and services', 'اپنے AI ماڈلز اور خدمات بہتر بنانے کے لیے'),
          pick('To process payments securely', 'ادائیگیوں کو محفوظ طریقے سے پراسیس کرنے کے لیے'),
        ],
      },
      {
        icon: 'lock',
        title: pick('Data Security', 'ڈیٹا سیکیورٹی'),
        titleUrdu: 'ڈیٹا سیکیورٹی',
        content: [
          pick('All data is encrypted in transit and at rest', 'تمام ڈیٹا ٹرانزٹ اور اسٹوریج میں انکرپٹ ہوتا ہے'),
          pick('We use secure payment gateways', 'ہم محفوظ ادائیگی گیٹ ویز استعمال کرتے ہیں'),
          pick('Regular security audits are performed', 'باقاعدہ سیکیورٹی آڈٹ کیے جاتے ہیں'),
          pick('Access to data is strictly controlled', 'ڈیٹا تک رسائی سختی سے محدود ہے'),
          pick('We comply with international data protection standards', 'ہم بین الاقوامی ڈیٹا پروٹیکشن معیار کی پیروی کرتے ہیں'),
        ],
      },
      {
        icon: 'users',
        title: pick('Data Sharing', 'ڈیٹا شیئرنگ'),
        titleUrdu: 'ڈیٹا شیئرنگ',
        content: [
          pick('We do not sell your personal data', 'ہم آپ کا ذاتی ڈیٹا فروخت نہیں کرتے'),
          pick('Data is shared with buyers only for transactions', 'ڈیٹا صرف لین دین کے لیے خریداروں کے ساتھ شیئر ہوتا ہے'),
          pick('We may share anonymized data for research', 'ہم تحقیق کے لیے غیر شناخت شدہ ڈیٹا شیئر کر سکتے ہیں'),
          pick('Government compliance when legally required', 'قانونی ضرورت پر حکومتی تعمیل'),
          pick('Third-party services for app functionality only', 'تھرڈ پارٹی خدمات صرف ایپ کے کام کے لیے'),
        ],
      },
      {
        icon: 'bell',
        title: pick('Your Rights', 'آپ کے حقوق'),
        titleUrdu: 'آپ کے حقوق',
        content: [
          pick('Access your personal data anytime', 'اپنے ذاتی ڈیٹا تک کسی بھی وقت رسائی حاصل کریں'),
          pick('Request data correction or deletion', 'ڈیٹا کی اصلاح یا حذف کی درخواست کریں'),
          pick('Opt-out of marketing communications', 'مارکیٹنگ پیغامات سے انکار کریں'),
          pick('Download your data in portable format', 'اپنا ڈیٹا قابلِ نقل فارمیٹ میں ڈاؤن لوڈ کریں'),
          pick('Lodge complaints with data authorities', 'ڈیٹا اتھارٹیز کے پاس شکایت درج کریں'),
        ],
      },
    ],
    []
  );

  return (
    <InfoPage title={{ english: 'Privacy Policy', urdu: 'رازداری کی پالیسی' }} contentStyle={{ paddingBottom: 28 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: horizontalPadding, marginTop: 14 }}>
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
            <Text style={styles.lastUpdated}>{pick('Last updated: December 30, 2024', 'آخری تازہ کاری: 30 دسمبر 2024')}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: horizontalPadding, marginTop: 16 }}>
          <View style={[styles.introCard, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}> 
            <Text style={styles.introText}>
              {pick(
                'At Assan Kheti, we are committed to protecting your privacy and ensuring the security of your personal information. This policy explains how we collect, use, and safeguard your data.',
                'آسان کھیتی میں، ہم آپ کی پرائیویسی کی حفاظت اور آپ کی ذاتی معلومات کی سیکیورٹی کو یقینی بنانے کے لیے پرعزم ہیں۔ یہ پالیسی بتاتی ہے کہ ہم آپ کا ڈیٹا کیسے جمع، استعمال اور محفوظ کرتے ہیں۔'
              )}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: horizontalPadding, marginTop: 18 }}>
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
            {sections.map((section) => (
              <View key={section.title} style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconBox}>
                    <Feather name={section.icon as any} size={18} color="#0d5c4b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                  </View>
                </View>

                <View style={styles.sectionBody}>
                  {section.content.map((item) => (
                    <View key={item} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.contactCard}>
              <Text style={styles.contactTitle}>{pick('Questions about our privacy policy?', 'رازداری کی پالیسی کے بارے میں سوالات؟')}</Text>
              <Text style={styles.contactEmail}>privacy@assankheti.pk</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </InfoPage>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 18,
    paddingBottom: 42,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.75)', marginTop: 2, fontSize: 13 },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  lastUpdated: { textAlign: 'center', color: '#6b7280', fontSize: 11 },

  introCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  introText: { color: '#111827', lineHeight: 18, fontSize: 13 },
  brand: { fontWeight: '900', color: '#0d5c4b' },
  introUrdu: { marginTop: 8, color: '#6b7280', fontSize: 12, lineHeight: 17 },

  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 14,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: 'rgba(17,24,39,0.03)' },
  sectionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(13,92,75,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontWeight: '900', color: '#111827' },
  sectionTitleUrdu: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  sectionBody: { padding: 14 },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0d5c4b', marginTop: 6 },
  bulletText: { flex: 1, color: '#6b7280', fontSize: 13, lineHeight: 18 },

  contactCard: {
    backgroundColor: 'rgba(13,92,75,0.10)',
    borderRadius: 18,
    padding: 14,
    marginTop: 6,
  },
  contactTitle: { textAlign: 'center', color: '#111827', fontSize: 13, fontWeight: '700' },
  contactSub: { textAlign: 'center', color: '#6b7280', fontSize: 11, marginTop: 4 },
  contactEmail: { textAlign: 'center', color: '#0d5c4b', fontSize: 13, fontWeight: '900', marginTop: 8 },
});
