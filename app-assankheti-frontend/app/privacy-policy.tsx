import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import InfoPage from '@/components/InfoPage';

type Section = {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  titleUrdu: string;
  content: string[];
};

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const sections = useMemo<Section[]>(
    () => [
      {
        icon: 'database',
        title: 'Information We Collect',
        titleUrdu: 'معلومات جو ہم جمع کرتے ہیں',
        content: [
          'Personal information (name, phone number, location)',
          'Farm details and crop information',
          'Transaction history and payment details',
          'Device information and usage data',
          'Photos uploaded for disease detection',
        ],
      },
      {
        icon: 'eye',
        title: 'How We Use Your Data',
        titleUrdu: 'ہم آپ کا ڈیٹا کیسے استعمال کرتے ہیں',
        content: [
          'To provide crop disease detection services',
          'To connect farmers with buyers',
          'To send weather and price alerts',
          'To improve our AI models and services',
          'To process payments securely',
        ],
      },
      {
        icon: 'lock',
        title: 'Data Security',
        titleUrdu: 'ڈیٹا سیکیورٹی',
        content: [
          'All data is encrypted in transit and at rest',
          'We use secure payment gateways',
          'Regular security audits are performed',
          'Access to data is strictly controlled',
          'We comply with international data protection standards',
        ],
      },
      {
        icon: 'users',
        title: 'Data Sharing',
        titleUrdu: 'ڈیٹا شیئرنگ',
        content: [
          'We do not sell your personal data',
          'Data is shared with buyers only for transactions',
          'We may share anonymized data for research',
          'Government compliance when legally required',
          'Third-party services for app functionality only',
        ],
      },
      {
        icon: 'bell',
        title: 'Your Rights',
        titleUrdu: 'آپ کے حقوق',
        content: [
          'Access your personal data anytime',
          'Request data correction or deletion',
          'Opt-out of marketing communications',
          'Download your data in portable format',
          'Lodge complaints with data authorities',
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
            <Text style={styles.lastUpdated}>Last updated: December 30, 2024 | آخری تازہ کاری: 30 دسمبر 2024</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: horizontalPadding, marginTop: 16 }}>
          <View style={[styles.introCard, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}> 
            <Text style={styles.introText}>
              At <Text style={styles.brand}>Assan Kheti</Text>, we are committed to protecting your privacy and ensuring the
              security of your personal information. This policy explains how we collect, use, and safeguard your data.
            </Text>
            <Text style={styles.introUrdu}>
              آسان کھیتی میں، ہم آپ کی پرائیویسی کی حفاظت اور آپ کی ذاتی معلومات کی سیکیورٹی کو یقینی بنانے کے لیے پرعزم ہیں۔
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
                    <Text style={styles.sectionTitleUrdu}>{section.titleUrdu}</Text>
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
              <Text style={styles.contactTitle}>Questions about our privacy policy?</Text>
              <Text style={styles.contactSub}>رازداری کی پالیسی کے بارے میں سوالات؟</Text>
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
