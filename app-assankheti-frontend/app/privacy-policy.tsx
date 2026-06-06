import { Feather } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import InfoPage from '@/components/InfoPage';
import { SpeechHighlight } from '@/components/SpeechHighlight';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageVoiceReadout } from '@/hooks/usePageVoiceReadout';

type Pair = { english: string; urdu: string };

type Section = {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: Pair;
  content: Pair[];
};

const PAGE_TITLE: Pair = { english: 'Privacy Policy', urdu: 'رازداری کی پالیسی' };

const INTRO: Pair = {
  english:
    'At Assan Kheti, we are committed to protecting your privacy and ensuring the security of your personal information. This policy explains how we collect, use, and safeguard your data.',
  urdu: 'آسان کھیتی میں، ہم آپ کی پرائیویسی کی حفاظت اور آپ کی ذاتی معلومات کی سیکیورٹی کو یقینی بنانے کے لیے پرعزم ہیں۔ یہ پالیسی بتاتی ہے کہ ہم آپ کا ڈیٹا کیسے جمع، استعمال اور محفوظ کرتے ہیں۔',
};

const SECTIONS: Section[] = [
  {
    icon: 'database',
    title: { english: 'Information We Collect', urdu: 'معلومات جو ہم جمع کرتے ہیں' },
    content: [
      { english: 'Personal information (name, phone number, location)', urdu: 'ذاتی معلومات (نام، فون نمبر، مقام)' },
      { english: 'Farm details and crop information', urdu: 'فارم کی تفصیلات اور فصل کی معلومات' },
      { english: 'Transaction history and payment details', urdu: 'ٹرانزیکشن ہسٹری اور ادائیگی کی تفصیلات' },
      { english: 'Device information and usage data', urdu: 'ڈیوائس کی معلومات اور استعمال کا ڈیٹا' },
      { english: 'Photos uploaded for disease detection', urdu: 'بیماری کی شناخت کے لیے اپ لوڈ کی گئی تصاویر' },
    ],
  },
  {
    icon: 'eye',
    title: { english: 'How We Use Your Data', urdu: 'ہم آپ کا ڈیٹا کیسے استعمال کرتے ہیں' },
    content: [
      { english: 'To provide crop disease detection services', urdu: 'فصل کی بیماری کی شناخت کی خدمات فراہم کرنے کے لیے' },
      { english: 'To connect farmers with buyers', urdu: 'کسانوں کو خریداروں سے جوڑنے کے لیے' },
      { english: 'To send weather and price alerts', urdu: 'موسم اور قیمت کے الرٹس بھیجنے کے لیے' },
      { english: 'To improve our AI models and services', urdu: 'اپنے AI ماڈلز اور خدمات بہتر بنانے کے لیے' },
      { english: 'To process payments securely', urdu: 'ادائیگیوں کو محفوظ طریقے سے پراسیس کرنے کے لیے' },
    ],
  },
  {
    icon: 'lock',
    title: { english: 'Data Security', urdu: 'ڈیٹا سیکیورٹی' },
    content: [
      { english: 'All data is encrypted in transit and at rest', urdu: 'تمام ڈیٹا ٹرانزٹ اور اسٹوریج میں انکرپٹ ہوتا ہے' },
      { english: 'We use secure payment gateways', urdu: 'ہم محفوظ ادائیگی گیٹ ویز استعمال کرتے ہیں' },
      { english: 'Regular security audits are performed', urdu: 'باقاعدہ سیکیورٹی آڈٹ کیے جاتے ہیں' },
      { english: 'Access to data is strictly controlled', urdu: 'ڈیٹا تک رسائی سختی سے محدود ہے' },
      { english: 'We comply with international data protection standards', urdu: 'ہم بین الاقوامی ڈیٹا پروٹیکشن معیار کی پیروی کرتے ہیں' },
    ],
  },
  {
    icon: 'users',
    title: { english: 'Data Sharing', urdu: 'ڈیٹا شیئرنگ' },
    content: [
      { english: 'We do not sell your personal data', urdu: 'ہم آپ کا ذاتی ڈیٹا فروخت نہیں کرتے' },
      { english: 'Data is shared with buyers only for transactions', urdu: 'ڈیٹا صرف لین دین کے لیے خریداروں کے ساتھ شیئر ہوتا ہے' },
      { english: 'We may share anonymized data for research', urdu: 'ہم تحقیق کے لیے غیر شناخت شدہ ڈیٹا شیئر کر سکتے ہیں' },
      { english: 'Government compliance when legally required', urdu: 'قانونی ضرورت پر حکومتی تعمیل' },
      { english: 'Third-party services for app functionality only', urdu: 'تھرڈ پارٹی خدمات صرف ایپ کے کام کے لیے' },
    ],
  },
  {
    icon: 'bell',
    title: { english: 'Your Rights', urdu: 'آپ کے حقوق' },
    content: [
      { english: 'Access your personal data anytime', urdu: 'اپنے ذاتی ڈیٹا تک کسی بھی وقت رسائی حاصل کریں' },
      { english: 'Request data correction or deletion', urdu: 'ڈیٹا کی اصلاح یا حذف کی درخواست کریں' },
      { english: 'Opt-out of marketing communications', urdu: 'مارکیٹنگ پیغامات سے انکار کریں' },
      { english: 'Download your data in portable format', urdu: 'اپنا ڈیٹا قابلِ نقل فارمیٹ میں ڈاؤن لوڈ کریں' },
      { english: 'Lodge complaints with data authorities', urdu: 'ڈیٹا اتھارٹیز کے پاس شکایت درج کریں' },
    ],
  },
];

const CONTACT_TITLE: Pair = {
  english: 'Questions about our privacy policy?',
  urdu: 'رازداری کی پالیسی کے بارے میں سوالات؟',
};

// Highlight ids — also used as the voice step ids so the spoken section and the
// highlighted card stay in sync.
const INTRO_ID = 'privacy.intro';
const CONTACT_ID = 'privacy.contact';
const sectionId = (index: number) => `privacy.section.${index}`;

export default function PrivacyPolicyPage() {
  const { textLanguage, voiceLanguage } = useLanguage();

  const pick = (p: Pair) => (textLanguage === 'urdu' ? p.urdu : p.english);
  const pickV = (p: Pair) => (voiceLanguage === 'urdu' ? p.urdu : p.english);

  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  // ── Voice assistant: read the whole policy aloud, highlighting each card as
  //    it is spoken (works offline via on-device TTS). ──
  const voiceSteps = useMemo(
    () => [
      { id: INTRO_ID, text: `${pickV(PAGE_TITLE)}. ${pickV(INTRO)}` },
      ...SECTIONS.map((section, index) => ({
        id: sectionId(index),
        text: `${pickV(section.title)}. ${section.content.map(pickV).join('. ')}`,
      })),
      { id: CONTACT_ID, text: `${pickV(CONTACT_TITLE)} privacy@assankheti.pk` },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [voiceLanguage]
  );

  const { activeHighlightId } = usePageVoiceReadout(voiceSteps);

  return (
    <InfoPage title={PAGE_TITLE} contentStyle={{ paddingBottom: 28 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: horizontalPadding, marginTop: 14 }}>
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
            <Text style={styles.lastUpdated}>{pick({ english: 'Last updated: June 01, 2026', urdu: 'آخری تازہ کاری: 01 جون 2026' })}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: horizontalPadding, marginTop: 16 }}>
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
            <SpeechHighlight active={activeHighlightId === INTRO_ID}>
              <View style={styles.introCard}>
                <Text style={styles.introText}>{pick(INTRO)}</Text>
              </View>
            </SpeechHighlight>
          </View>
        </View>

        <View style={{ paddingHorizontal: horizontalPadding, marginTop: 18 }}>
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
            {SECTIONS.map((section, index) => (
              <SpeechHighlight
                key={section.title.english}
                active={activeHighlightId === sectionId(index)}
                style={{ marginBottom: 14 }}
              >
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionIconBox}>
                      <Feather name={section.icon as any} size={18} color="#0d5c4b" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionTitle}>{pick(section.title)}</Text>
                    </View>
                  </View>

                  <View style={styles.sectionBody}>
                    {section.content.map((item) => (
                      <View key={item.english} style={styles.bulletRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.bulletText}>{pick(item)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </SpeechHighlight>
            ))}

            <SpeechHighlight active={activeHighlightId === CONTACT_ID}>
              <View style={styles.contactCard}>
                <Text style={styles.contactTitle}>{pick(CONTACT_TITLE)}</Text>
                <Text style={styles.contactEmail}>privacy@assankheti.pk</Text>
              </View>
            </SpeechHighlight>
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
