import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function TermsAndConditions({ onContinue }: { onContinue: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const { width, height } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);
  const isSmallHeight = height < 700;

  const sections = useMemo(
    () =>
      [
        {
          title: '1. Acceptance of Terms',
          body: 'By accessing and using Assan Kheti application, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use this application.',
        },
        {
          title: '2. Service Description',
          body: 'Assan Kheti provides agricultural services including crop disease detection, smart calculators, marketplace features, and AI-powered farming assistance. Our services are designed to help farmers, simple users, and businessmen in their agricultural activities.',
        },
        {
          title: '3. User Responsibilities',
          body: 'Users are responsible for maintaining the confidentiality of their account information and for all activities that occur under their account. You agree to provide accurate information when using our services.',
        },
        {
          title: '4. Privacy Policy',
          body: 'We respect your privacy and are committed to protecting your personal data. Your information will only be used to improve our services and provide you with relevant agricultural insights.',
        },
        {
          title: '5. Marketplace Terms',
          body: 'All transactions through our marketplace are subject to our escrow system. We ensure secure payments between farmers and buyers. Commission rates and payment terms will be clearly displayed.',
        },
        {
          title: '6. AI Disclaimer',
          body: 'Our AI-powered features provide recommendations based on available data. While we strive for accuracy, users should verify critical decisions with agricultural experts.',
        },
        {
          title: '7. Modifications',
          body: 'We reserve the right to modify these terms at any time. Continued use of the application after changes constitutes acceptance of new terms.',
        },
      ] as const,
    []
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.root}>
        {/* Header */}
        <LinearGradient
          colors={['#0d5c4b', '#10b981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingHorizontal: horizontalPadding }]}
        >
          <View style={[styles.headerRow, { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }]}
          >
            <View style={styles.logoBox}>
              <Feather name="shield" size={22} color="#ffffff" />
            </View>
            <View style={{ flex: 1}}>
              <Text style={styles.pageTitle}>Terms & Conditions</Text>
              <Text style={styles.pageSub}>شرائط و ضوابط</Text>
            </View>
          </View>

          <View style={[styles.headerRow, { marginTop: 18, maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }]}
          >
            <View style={[styles.iconSquare, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Feather name="shield" size={22} color="#ffffff" />
            </View>
            <View style={{ flex: 1}}>
              <Text style={styles.pageTitle}>Welcome to the Assan Kheti</Text>
              <Text style={styles.pageSub}>آسان کھیتی میں خوش آمدید</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Content */}
        <View style={[styles.contentWrap, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.card, { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center', height: 325 }]}>
            <View style={styles.cardTitleRow}>
              <Feather name="file-text" size={18} color="#0d5c4b" />
              <Text style={styles.cardTitle}>Please read carefully</Text>
            </View>

            <ScrollView
              style={{ height: isSmallHeight ? 240 : 280 }}
              contentContainerStyle={{ paddingRight: 8, paddingBottom: 6 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ gap: 14 }}>
                {sections.map((s) => (
                  <View key={s.title}>
                    <Text style={styles.sectionTitle}>{s.title}</Text>
                    <Text style={styles.sectionBody}>{s.body}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Agreement */}
          <View style={[styles.agreeBox, { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setAgreed((v) => !v)}
              style={[styles.checkbox, agreed ? styles.checkboxChecked : styles.checkboxUnchecked]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
            >
              {agreed ? <Feather name="check" size={16} color="#ffffff" /> : null}
            </TouchableOpacity>
            <Text style={styles.agreeText}>
              I have read and agree to the <Text style={styles.agreeBold}>Terms & Conditions</Text> and{' '}
              <Text style={styles.agreeBold}>Privacy Policy</Text>
            </Text>
          </View>
        </View>

        {/* Bottom button */}
        <View style={[styles.bottomBar, { paddingHorizontal: horizontalPadding }]}
        >
          <View style={{ maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }}>
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={!agreed}
              onPress={onContinue}
              style={[styles.continueBtn, !agreed ? styles.continueBtnDisabled : styles.continueBtnEnabled]}
            >
              {agreed ? (
                <>
                  <Feather name="check-circle" size={18} color="#ffffff" />
                  <Text style={styles.continueText}>Continue</Text>
                </>
              ) : (
                <Text style={styles.continueText}>Please accept to continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    paddingTop: 18,
    paddingBottom: 42,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  brandSub: { color: 'rgba(255, 255, 255, 1)', fontSize: 20, marginTop: 2 },
  iconSquare: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  pageSub: { color: 'rgba(255, 255, 255, 1)', marginTop: 3,fontSize: 18 },

  contentWrap: { flex: 1, marginTop: -18, paddingTop: 0 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { color: '#0d5c4b', fontWeight: '900' },

  sectionTitle: { color: '#111827', fontWeight: '900', marginBottom: 6 },
  sectionBody: { color: '#6b7280', lineHeight: 18, fontSize: 13 },

  agreeBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Platform.OS === 'ios' ? 1 : 2,
  },
  checkboxUnchecked: { borderWidth: 2, borderColor: '#0d5c4b', backgroundColor: 'transparent' },
  checkboxChecked: { backgroundColor: '#0d5c4b', borderWidth: 2, borderColor: '#0d5c4b' },
  agreeText: { flex: 1, color: '#111827', lineHeight: 18, fontSize: 13 },
  agreeBold: { color: '#0d5c4b', fontWeight: '900' },

  bottomBar: {
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 18 : 12,
  },
  continueBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  continueBtnEnabled: { backgroundColor: '#0d5c4b' },
  continueBtnDisabled: { backgroundColor: '#e5e7eb' },
  continueText: { color: '#ffffff', fontWeight: '900' },
});