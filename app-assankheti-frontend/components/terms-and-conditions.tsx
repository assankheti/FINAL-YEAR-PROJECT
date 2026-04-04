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

interface TermsSection {
  title: string;
  body: string;
  urdu?: string;
  bodyUrdu?: string;
  icon?: 'check-circle' | 'briefcase' | 'user' | 'lock' | 'shopping-cart' | 'zap' | 'shield' | 'edit';
}

export function TermsAndConditions({ onContinue }: { onContinue: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const { width, height } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 540);
  const isSmallHeight = height < 700;

  const translations = {
    headerTitle: 'Terms & Conditions',
    headerSubtitleUrdu: 'شرائط و ضوابط',
    infoText: 'Please read these terms carefully before using Assan Kheti',
    infoTextUrdu: 'براہ کرم Assan Kheti استعمال کرنے سے پہلے ان شرائط کو احتیاط سے پڑھیں',
    agreementText: 'I have read and agree to the',
    agreementBoldText: 'Terms & Conditions',
    privacyPolicyText: 'Privacy Policy',
    agreementTextUrdu: 'میں نے پڑھا ہے اور اتفاق ہے',
    termsUrdu: 'شرائط و ضوابط',
    privacyUrdu: 'رازداری کی پالیسی',
    continueButtonEnabled: 'Continue',
    continueButtonDisabled: 'Please Accept Terms',
    continueButtonEnabledUrdu: 'جاری رکھیں',
    continueButtonDisabledUrdu: 'براہ کرم شرائط قبول کریں',
  };

  const sections: TermsSection[] = useMemo(
    () =>
      [
        {
          title: '1. Acceptance of Terms',
          urdu: '۱۔ شرائط کی قبولیت',
          icon: 'check-circle',
          body: 'By accessing and using the Assan Kheti application, you accept and agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use this application.',
          bodyUrdu: 'Assan Kheti ایپلیکیشن تک رسائی اور اس کو استعمال کر کے، آپ ان شرائط و ضوابط سے متفق ہیں۔ اگر آپ ان شرائط کے کسی بھی حصے سے اتفاق نہیں رکھتے تو براہ کرم اس ایپلیکیشن کو استعمال نہ کریں۔',
        },
        {
          title: '2. Service Description',
          urdu: '۲۔ خدمات کی تفصیل',
          icon: 'briefcase',
          body: 'Assan Kheti provides comprehensive agricultural services including AI-powered crop disease detection, smart budget calculators, secure marketplace features, and personalized farming recommendations. These services are designed to support farmers, agricultural traders, and buyers.',
          bodyUrdu: 'Assan Kheti جامع زرعی خدمات فراہم کرتا ہے جن میں AI سے چلایا جانے والا فصل کی بیماری کی شناخت، اسمارٹ بجٹ کیلکولیٹر، محفوظ مارکیٹ پلیس کی خصوصیات، اور ذاتی نوعیت کی زرعی تجاویز شامل ہیں۔',
        },
        {
          title: '3. User Responsibilities',
          urdu: '۳۔ صارف کی ذمہ داریاں',
          icon: 'user',
          body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities conducted under your account. You agree to provide accurate, truthful information and use our services in compliance with all applicable laws and regulations.',
          bodyUrdu: 'آپ اپنے اکاؤنٹ کی معلومات کی خصوصیت برقرار رکھنے اور اپنے اکاؤنٹ کے تحت تمام سرگرمیوں کے لیے ذمہ دار ہیں۔ آپ درست اور سچی معلومات فراہم کرنے اور تمام قابلِ اطلاق قوانین کی پیروی میں ہماری خدمات استعمال کرنے کے لیے اتفاق کرتے ہیں۔',
        },
        {
          title: '4. Data Privacy & Protection',
          urdu: '۴۔ ڈیٹا کی حفاظت',
          icon: 'lock',
          body: 'We are committed to protecting your personal information in accordance with applicable privacy laws. Your data is used solely to provide services, improve user experience, and deliver relevant agricultural insights. We employ industry-standard security measures to safeguard your information.',
          bodyUrdu: 'ہم اپنی ذاتی معلومات کو قابلِ اطلاق رازداری کے قوانین کے مطابق محفوظ رکھنے کا عہد کرتے ہیں۔ آپ کا ڈیٹا صرف خدمات فراہم کرنے، صارف کی تجربہ کو بہتر بنانے، اور متعلقہ زرعی معلومات فراہم کرنے کے لیے استعمال ہوتا ہے۔',
        },
        {
          title: '5. Marketplace & Transaction Terms',
          urdu: '۵۔ مارکیٹ پلیس کی شرائط',
          icon: 'shopping-cart',
          body: 'All transactions through our marketplace are conducted securely with built-in buyer and seller protection. Commission structures and payment terms are displayed transparently for each transaction. We facilitate payments but are not a party to individual transactions.',
          bodyUrdu: 'ہماری مارکیٹ پلیس کے ذریعے تمام ٹرانزیکشنز محفوظ طریقے سے خریدار اور فروخت کنندہ کی حفاظت کے ساتھ کی جاتی ہیں۔ کمیشن اور ادائیگی کی شرائط ہر ٹرانزیکشن کے لیے واضح طریقے سے دکھائی جاتی ہیں۔',
        },
        {
          title: '6. AI & Recommendation Disclaimer',
          urdu: '۶۔ ایٹی فیچرز سے متعلق اہم نوٹ',
          icon: 'zap',
          body: 'Our AI-powered recommendations are generated based on available agricultural data and algorithms. While we strive for accuracy, these recommendations are advisory in nature. Users should independently verify recommendations with agricultural experts before making critical farming decisions.',
          bodyUrdu: 'ہماری AI سے چلایا جانے والا تجاویز دستیاب زرعی ڈیٹا اور الگورتھم کی بنیاد پر تیار کی جاتی ہیں۔ ہم درستگی کے لیے کوشش کرتے ہیں لیکن یہ تجاویز صرف مشاورتی ہیں۔ صارفین کو اہم زرعی فیصلے کرنے سے پہلے زرعی ماہرین سے تصدیق کرنی چاہیے۔',
        },
        {
          title: '7. Limitation of Liability',
          urdu: '۷۔ ذمہ داری کی حد',
          icon: 'shield',
          body: 'Assan Kheti shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from the use of our services. This includes loss of profits, data, or other intangible losses.',
          bodyUrdu: 'Assan Kheti ہماری خدمات کے استعمال سے پیدا ہونے والے کسی بھی براہ راست یا بالواسطہ نقصان کے لیے ذمہ دار نہیں ہوگا۔ اس میں منافع، ڈیٹا، یا دیگر نامیاتی نقصان شامل ہیں۔',
        },
        {
          title: '8. Amendments to Terms',
          urdu: '۸۔ شرائط میں تبدیلی',
          icon: 'edit',
          body: 'We reserve the right to modify these Terms and Conditions at any time. Continued use of the application following any changes constitutes your acceptance of the new terms. We will notify users of significant changes where applicable.',
          bodyUrdu: 'ہم کسی بھی وقت ان شرائط و ضوابط میں تبدیلی کا حق محفوظ رکھتے ہیں۔ تبدیلیوں کے بعد ایپلیکیشن کا مسلسل استعمال نئی شرائط کی قبولیت کا مطلب ہے۔ ہم صارفین کو اہم تبدیلیوں سے آگاہ کریں گے۔',
        },
      ] as const,
    []
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={styles.root}>
        {/* Header */}
        <LinearGradient
          colors={['#0d5c4b', '#10b981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingHorizontal: horizontalPadding }]}
        >
          <View style={[styles.headerContent, { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }]}>
            <View style={styles.iconContainer}>
              <Feather name="file-text" size={28} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{translations.headerTitle}</Text>
              <Text style={styles.headerSubtitle}>{translations.headerSubtitleUrdu}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Main Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Card */}
          <View style={[styles.infoCard, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
            <View style={styles.infoIconRow}>
              <Feather name="info" size={20} color="#10b981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoText}>{translations.infoText}</Text>
                <Text style={styles.infoTextUrdu}>{translations.infoTextUrdu}</Text>
              </View>
            </View>
          </View>

          {/* Terms Sections */}
          <View style={[styles.sectionsContainer, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
            {sections.map((section, index) => (
              <View key={index} style={styles.section}>
                <View style={styles.sectionHeader}>
                  {section.icon && (
                    <View style={styles.sectionIconBox}>
                      <Feather name={section.icon} size={18} color="#0d5c4b" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    {section.urdu && <Text style={styles.sectionUrdu}>{section.urdu}</Text>}
                  </View>
                </View>
                <Text style={styles.sectionBody}>{section.body}</Text>
                {section.bodyUrdu && <Text style={styles.sectionBodyUrdu}>{section.bodyUrdu}</Text>}
              </View>
            ))}
          </View>

          {/* Agreement Checkbox */}
          <View style={[styles.agreementContainer, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setAgreed(!agreed)}
              style={styles.checkboxRow}
              accessible={true}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              accessibilityLabel="Agree to terms and conditions"
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Feather name="check" size={14} color="#ffffff" strokeWidth={3} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.agreementText}>
                  {translations.agreementText}{' '}
                  <Text style={styles.agreementBold}>{translations.agreementBoldText}</Text> and{' '}
                  <Text style={styles.agreementBold}>{translations.privacyPolicyText}</Text>
                </Text>
                <Text style={styles.agreementTextUrdu}>
                  {translations.agreementTextUrdu}{' '}
                  <Text style={styles.agreementBold}>{translations.termsUrdu}</Text> اور{' '}
                  <Text style={styles.agreementBold}>{translations.privacyUrdu}</Text>
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Spacing */}
          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Action Button */}
        <View style={[styles.buttonContainer, { paddingHorizontal: horizontalPadding }]}>
          <View style={{ maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }}>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={!agreed}
              onPress={onContinue}
              style={[styles.continueButton, !agreed && styles.continueButtonDisabled]}
              accessible={true}
              accessibilityRole="button"
              accessibilityState={{ disabled: !agreed }}
              accessibilityLabel={agreed ? 'Continue to next step' : 'Please accept terms to continue'}
            >
              <View style={styles.buttonContent}>
                <Feather
                  name={agreed ? 'check-circle' : 'alert-circle'}
                  size={20}
                  color={agreed ? '#ffffff' : '#9ca3af'}
                />
                <View>
                  <Text style={[styles.buttonText, !agreed && styles.buttonTextDisabled]}>
                    {agreed ? translations.continueButtonEnabled : translations.continueButtonDisabled}
                  </Text>
                  <Text style={[styles.buttonTextUrdu, !agreed && styles.buttonTextDisabledUrdu]}>
                    {agreed ? translations.continueButtonEnabledUrdu : translations.continueButtonDisabledUrdu}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },

  // Header Styles
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '400',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 24,
    gap: 16,
  },

  // Info Card
  infoCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    marginBottom: 8,
  },
  infoIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    flex: 1,
    color: '#0d5c4b',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  infoTextUrdu: {
    flex: 1,
    color: '#0d5c4b',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
    marginTop: 5,
  },

  // Sections Container
  sectionsContainer: {
    gap: 18,
    marginBottom: 8,
  },
  section: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  sectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(13, 92, 75, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  sectionUrdu: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  sectionBody: {
    color: '#4b5563',
    lineHeight: 22,
    fontSize: 14,
    fontWeight: '400',
    marginTop: 6,
  },
  sectionBodyUrdu: {
    color: '#4b5563',
    lineHeight: 21,
    fontSize: 13,
    fontWeight: '400',
    marginTop: 8,
  },

  // Agreement Container
  agreementContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginVertical: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0d5c4b',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginTop: Platform.OS === 'ios' ? 0 : 1,
  },
  checkboxChecked: {
    backgroundColor: '#0d5c4b',
    borderColor: '#0d5c4b',
  },
  agreementText: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  agreementTextUrdu: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
    marginTop: 6,
  },
  agreementBold: {
    color: '#0d5c4b',
    fontWeight: '700',
  },

  // Button Container
  buttonContainer: {
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  continueButton: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: '#0d5c4b',
  },
  continueButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  buttonTextUrdu: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  buttonTextDisabled: {
    color: '#9ca3af',
  },
  buttonTextDisabledUrdu: {
    color: '#9ca3af',
  },
});