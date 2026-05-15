import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

type Props = {
  userType: 'simple-user' | 'businessman';
  textLanguage?: 'urdu' | 'english';
  mode?: 'phone' | 'otp';
  initialPhoneE164?: string;
  onSendOtp?: (phoneNumberE164: string) => Promise<void> | void;
  onVerifyOtp?: (code: string) => Promise<void> | void;
  onBack?: () => void;
};

export function Login({
  userType,
  textLanguage = 'english',
  mode = 'phone',
  initialPhoneE164,
  onSendOtp,
  onVerifyOtp,
  onBack,
}: Props) {
  const [step, setStep] = useState<'phone' | 'otp'>(mode === 'otp' ? 'otp' : 'phone');
  const [phone, setPhone] = useState(initialPhoneE164 ?? ''); // E.164 e.g. +10000000000
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const { width, height } = useWindowDimensions();
  const isCompact = width < 380 || height < 720;
  const isTiny = width < 350;
  const isOtpStep = step === 'otp';
  const horizontalPadding = Math.max(18, Math.min(28, Math.round(width * 0.06)));

  const translations = useMemo(
    () =>
      ({
        appTitle: { urdu: 'آسان کھیتی', english: 'ASSAN KHETI' },
        loginTitle: { urdu: 'لاگ اِن', english: 'Login' },
        verifyTitle: { urdu: 'OTP کی تصدیق', english: 'Verify OTP' },
        loginSubtitle: { urdu: 'اپنا فون نمبر درج کریں', english: 'Enter your phone number' },
        verifySubtitle: { urdu: 'OTP کی تصدیق کریں', english: 'Verify the OTP code' },
        phoneLabel: { urdu: 'فون نمبر', english: 'Phone Number' },
        phonePlaceholder: { urdu: '+10000000000', english: '+10000000000' },
        sendOtp: { urdu: 'OTP بھیجیں', english: 'Send OTP' },
        verifyContinue: { urdu: 'تصدیق کریں اور آگے بڑھیں', english: 'Verify & Continue' },
        smsHint: { urdu: 'ہم SMS کے ذریعے تصدیقی کوڈ بھیجیں گے', english: "We'll send you a verification code via SMS" },
        secure: { urdu: 'محفوظ اور انکرپٹڈ لاگ اِن', english: 'Secure & encrypted login' },
        noPassword: { urdu: 'پاس ورڈ کی ضرورت نہیں', english: 'No password required' },
        enter4Digit: { urdu: '6 ہندسوں کا کوڈ درج کریں جو بھیجا گیا ہے', english: 'Enter the 6-digit code sent to' },
        resendOtp: { urdu: 'OTP دوبارہ بھیجیں', english: 'Resend OTP' },
        changePhone: { urdu: 'فون نمبر تبدیل کریں', english: 'Change phone number' },
        farmerAccount: { urdu: 'کسان اکاؤنٹ', english: 'Farmer account' },
        marketplaceAccount: { urdu: 'مارکیٹ پلیس اکاؤنٹ', english: 'Marketplace account' },
        stepOne: { urdu: 'مرحلہ 1/2', english: 'Step 1 of 2' },
        stepTwo: { urdu: 'مرحلہ 2/2', english: 'Step 2 of 2' },
        codeSent: { urdu: 'کوڈ بھیج دیا گیا', english: 'Code sent' },
        phoneFormat: { urdu: 'ملکی کوڈ کے ساتھ نمبر لکھیں، مثال +923001234567', english: 'Use country code, for example +923001234567' },
        enterPhoneToContinue: { urdu: 'جاری رکھنے کے لیے درست فون نمبر درج کریں', english: 'Enter a valid phone number to continue' },
        enterOtpToContinue: { urdu: 'جاری رکھنے کے لیے 6 ہندسوں کا کوڈ درج کریں', english: 'Enter the 6-digit code to continue' },
        protectedSession: { urdu: 'آپ کا سیشن محفوظ رکھا جائے گا', english: 'Your session will be kept secure' },
        phoneStep: { urdu: 'فون', english: 'Phone' },
        otpStep: { urdu: 'OTP', english: 'OTP' },
      }) as const,
    []
  );

  const t = (obj: any) => obj[textLanguage];
  const accountLabel = userType === 'businessman' ? t(translations.marketplaceAccount) : t(translations.farmerAccount);

  const otpRefs = useRef<(TextInput | null)[]>([]);

  const canSendOtp = /^\+[1-9]\d{7,14}$/.test(phone.trim());
  const otpValue = otp.join('');
  const canVerifyOtp = otpValue.length === 6;

  const handleSendOtp = async () => {
    if (!canSendOtp || loading) return;
    const e164 = phone.trim();

    setLoading(true);
    try {
      if (onSendOtp) {
        await onSendOtp(e164);
        return;
      }

      setTimeout(() => {
        setLoading(false);
        setStep('otp');
        requestAnimationFrame(() => otpRefs.current?.[0]?.focus());
      }, 1500);
    } finally {
      if (onSendOtp) setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) otpRefs.current?.[index + 1]?.focus();
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key !== 'Backspace') return;
    if (otp[index]) {
      const next = [...otp];
      next[index] = '';
      setOtp(next);
      return;
    }
    if (index > 0) otpRefs.current?.[index - 1]?.focus();
  };

  const handleVerifyOtp = async () => {
    if (!canVerifyOtp || loading) return;
    setLoading(true);
    try {
      if (onVerifyOtp) {
        await onVerifyOtp(otpValue);
        return;
      }

      setTimeout(() => {
        setLoading(false);
      }, 1500);
    } finally {
      if (onVerifyOtp) setLoading(false);
    }
  };

  const handleResendOtp = () => {
    setOtp(['', '', '', '', '', '']);
    requestAnimationFrame(() => otpRefs.current?.[0]?.focus());
  };

  const handleChangePhone = () => {
    setOtp(['', '', '', '', '', '']);
    if (mode === 'otp') {
      onBack?.();
      return;
    }
    setStep('phone');
  };

  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);
  const otpBoxGap = isCompact ? 6 : 8;
  const otpBoxSize = Math.min(isCompact ? 46 : 50, Math.floor((contentMaxWidth - 36 - otpBoxGap * 5) / 6));
  const buttonHelperText =
    step === 'phone' && !canSendOtp
      ? t(translations.enterPhoneToContinue)
      : step === 'otp' && !canVerifyOtp
        ? t(translations.enterOtpToContinue)
        : t(translations.protectedSession);
  const phoneStepLabel = isCompact ? t(translations.phoneStep) : t(translations.phoneLabel);
  const otpStepLabel = isCompact ? t(translations.otpStep) : t(translations.verifyTitle);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: horizontalPadding, paddingBottom: isCompact ? 24 : 32 },
          ]}
        >
          <LinearGradient
            colors={['#0d5c4b', '#10b981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.headerGradient,
              {
                marginHorizontal: -horizontalPadding,
                paddingHorizontal: horizontalPadding,
                paddingBottom: isOtpStep ? (isCompact ? 38 : 44) : isCompact ? 28 : 34,
              },
            ]}
          >
            <View style={[styles.headerTopRow, isCompact ? styles.headerTopRowCompact : null]}>
              {onBack ? (
                <TouchableOpacity
                  onPress={onBack}
                  style={[styles.backBtn, isCompact ? styles.backBtnCompact : null]}
                  hitSlop={8}
                  activeOpacity={0.9}
                >
                  <Feather name="arrow-left" size={isCompact ? 18 : 20} color="#ffffff" />
                </TouchableOpacity>
              ) : (
                <View style={[styles.headerSpacer, isCompact ? styles.headerSpacerCompact : null]} />
              )}

              <View style={styles.headerCopy}>
                <Text style={[styles.headerTitle, isCompact ? styles.headerTitleCompact : null]} numberOfLines={1}>
                  {step === 'phone' ? t(translations.loginTitle) : t(translations.verifyTitle)}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {step === 'phone' ? t(translations.loginSubtitle) : t(translations.verifySubtitle)}
                </Text>
                <View style={styles.headerMetaRow}>
                  <View style={styles.headerPill}>
                    <Feather name={userType === 'businessman' ? 'shopping-bag' : 'user'} size={12} color="#ffffff" />
                    <Text style={styles.headerPillText} numberOfLines={1}>{accountLabel}</Text>
                  </View>
                  <View style={styles.headerPillMuted}>
                    <Text style={styles.headerPillText} numberOfLines={1}>
                      {step === 'phone' ? t(translations.stepOne) : t(translations.stepTwo)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.headerIconBox, isCompact ? styles.headerIconBoxCompact : null]}>
                {step === 'phone' ? (
                  <Feather name="phone" size={isCompact ? 20 : 22} color="#ffffff" />
                ) : (
                  <Feather name="shield" size={isCompact ? 20 : 22} color="#ffffff" />
                )}
              </View>
            </View>
          </LinearGradient>

          <View
            style={[
              styles.content,
              isOtpStep ? styles.otpContent : null,
              { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
            ]}
          >
            <View style={[styles.stepTrack, isTiny ? styles.stepTrackTiny : null]}>
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, styles.stepDotActive]}>
                  <Feather name="phone" size={13} color="#ffffff" />
                </View>
                <Text style={[styles.stepLabel, styles.stepLabelActive]} numberOfLines={1}>
                  {phoneStepLabel}
                </Text>
              </View>
              <View style={[styles.stepLine, isTiny ? styles.stepLineTiny : null, isOtpStep ? styles.stepLineActive : null]} />
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, isOtpStep ? styles.stepDotActive : null]}>
                  <Feather name="shield" size={13} color={isOtpStep ? '#ffffff' : '#98a2b3'} />
                </View>
                <Text style={[styles.stepLabel, isOtpStep ? styles.stepLabelActive : null]} numberOfLines={1}>
                  {otpStepLabel}
                </Text>
              </View>
            </View>

            {step === 'phone' ? (
              <>
                <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeaderCopy}>
                      <Text style={styles.label}>{t(translations.phoneLabel)}</Text>
                      <Text style={styles.hint}>{t(translations.smsHint)}</Text>
                    </View>
                    <View style={styles.cardBadge}>
                      <Feather name="message-square" size={15} color="#0d5c4b" />
                    </View>
                  </View>

                  <View style={styles.phoneInputWrap}>
                    <View style={styles.phoneInputIcon}>
                      <Feather name="smartphone" size={18} color="#0d5c4b" />
                    </View>
                    <TextInput
                      value={phone}
                      onChangeText={(v) => setPhone(v.replace(/\s/g, ''))}
                      placeholder={t(translations.phonePlaceholder)}
                      placeholderTextColor="#9ca3af"
                      keyboardType="phone-pad"
                      style={[styles.phoneInput, isCompact ? styles.phoneInputCompact : null]}
                      maxLength={16}
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={styles.inlineHint}>
                    <Feather name="info" size={13} color="#667085" />
                    <Text style={styles.inlineHintText}>{t(translations.phoneFormat)}</Text>
                  </View>
                </View>

                <View style={styles.featureList}>
                  <View style={styles.featureRow}>
                    <View style={styles.featureIcon}>
                      <Feather name="lock" size={16} color="#10b981" />
                    </View>
                    <Text style={styles.featureText}>{t(translations.secure)}</Text>
                  </View>
                  <View style={styles.featureRow}>
                    <View style={styles.featureIcon}>
                      <Feather name="message-circle" size={16} color="#10b981" />
                    </View>
                    <Text style={styles.featureText}>{t(translations.noPassword)}</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.card, styles.otpCard]}>
                  <View style={styles.otpIntro}>
                    <View style={styles.codeSentPill}>
                      <Feather name="check-circle" size={14} color="#0d5c4b" />
                      <Text style={styles.codeSentText}>{t(translations.codeSent)}</Text>
                    </View>
                    <Text style={styles.otpHelp} numberOfLines={2}>{t(translations.enter4Digit)}</Text>
                    <Text style={[styles.otpPhone, isTiny ? styles.otpPhoneTiny : null]} numberOfLines={1}>
                      {initialPhoneE164 ?? phone}
                    </Text>
                  </View>

                  <View style={[styles.otpRow, { gap: otpBoxGap }]}>
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(r) => {
                          otpRefs.current[index] = r;
                        }}
                        value={digit}
                        onChangeText={(v) => handleOtpChange(index, v)}
                        onKeyPress={({ nativeEvent }) => handleOtpKeyPress(index, nativeEvent.key)}
                        keyboardType="number-pad"
                        textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : 'none'}
                        maxLength={1}
                        style={[
                          styles.otpInput,
                          digit ? styles.otpInputFilled : null,
                          { width: otpBoxSize, height: otpBoxSize, fontSize: Math.max(18, Math.floor(otpBoxSize * 0.42)) },
                        ]}
                        returnKeyType="done"
                        selectionColor="#0d5c4b"
                      />
                    ))}
                  </View>

                  <View style={styles.otpActionRow}>
                    <TouchableOpacity style={styles.otpActionBtn} onPress={handleResendOtp} disabled={loading}>
                      <Feather name="refresh-cw" size={14} color="#0d5c4b" />
                      <Text style={styles.otpActionText} numberOfLines={1}>{t(translations.resendOtp)}</Text>
                    </TouchableOpacity>

                    {onBack || mode !== 'otp' ? (
                      <TouchableOpacity style={styles.otpActionBtn} onPress={handleChangePhone} disabled={loading}>
                        <Feather name="edit-2" size={14} color="#0d5c4b" />
                        <Text style={styles.otpActionText} numberOfLines={1}>{t(translations.changePhone)}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.primaryBtn, ((step === 'phone' && !canSendOtp) || (step === 'otp' && !canVerifyOtp) || loading) && styles.primaryBtnDisabled]}
              disabled={(step === 'phone' && !canSendOtp) || (step === 'otp' && !canVerifyOtp) || loading}
              onPress={step === 'phone' ? handleSendOtp : handleVerifyOtp}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.primaryBtnRow}>
                  <Text style={styles.primaryBtnText} numberOfLines={1}>
                    {step === 'phone' ? t(translations.sendOtp) : t(translations.verifyContinue)}
                  </Text>
                  <Feather name="arrow-right" size={18} color="#ffffff" style={styles.primaryBtnIcon} />
                </View>
              )}
            </TouchableOpacity>
            <Text style={[styles.primaryHint, canSendOtp || canVerifyOtp ? styles.primaryHintReady : null]}>{buttonHelperText}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0d5c4b' },
  screen: { flex: 1, backgroundColor: '#f7f3ea' },
  scrollContent: {
    flexGrow: 1,
  },
  headerGradient: {
    paddingTop: 18,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  headerTopRowCompact: { gap: 10 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerSpacer: { width: 44, height: 44 },
  headerSpacerCompact: { width: 40, height: 40 },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBoxCompact: {
    width: 44,
    height: 44,
    borderRadius: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  headerTitleCompact: { fontSize: 24, lineHeight: 30 },
  headerSubtitle: { color: 'rgba(255,255,255,0.82)', marginTop: 2, fontSize: 14, fontWeight: '700' },
  headerMetaRow: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerPill: {
    minHeight: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerPillMuted: {
    minHeight: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: 'rgba(13,92,75,0.28)',
    justifyContent: 'center',
  },
  headerPillText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },

  content: {
    marginTop: -24,
  },
  otpContent: {
    marginTop: -30,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.08)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  stepTrack: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepTrackTiny: {
    paddingHorizontal: 10,
  },
  stepItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f2f4f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#0d5c4b',
  },
  stepLine: {
    flex: 1,
    height: 3,
    borderRadius: 99,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 10,
  },
  stepLineTiny: { marginHorizontal: 6 },
  stepLineActive: {
    backgroundColor: '#10b981',
  },
  stepLabel: { color: '#98a2b3', fontSize: 12, fontWeight: '900' },
  stepLabelActive: { color: '#0d5c4b' },
  otpCard: {
    paddingVertical: 22,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  cardHeaderCopy: { flex: 1, minWidth: 0 },
  cardBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(13,92,75,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: '#111827', fontSize: 16, fontWeight: '900' },
  phoneInputWrap: {
    minHeight: 60,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  phoneInputIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(13,92,75,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneInput: { flex: 1, fontSize: 22, color: '#111827', fontWeight: '700' },
  phoneInputCompact: { fontSize: 19 },
  hint: { marginTop: 4, fontSize: 13, lineHeight: 18, color: '#6b7280', fontWeight: '600' },
  inlineHint: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  inlineHintText: { flex: 1, color: '#667085', fontSize: 12, lineHeight: 17, fontWeight: '600' },

  featureList: {
    marginTop: 14,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(13,92,75,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.04)',
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(16,185,129,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { color: '#111827', fontSize: 15, lineHeight: 20, fontWeight: '700', flex: 1 },

  otpIntro: { alignItems: 'center', marginBottom: 18, gap: 8 },
  codeSentPill: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: 'rgba(13,92,75,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  codeSentText: { color: '#0d5c4b', fontSize: 12, fontWeight: '900' },
  otpHelp: { color: '#667085', fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '600' },
  otpPhone: { color: '#111827', fontSize: 17, fontWeight: '900' },
  otpPhoneTiny: { fontSize: 15 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 18 },
  otpInput: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  otpInputFilled: {
    borderColor: '#0d5c4b',
    backgroundColor: '#f0fdf4',
  },
  otpActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  otpActionBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    backgroundColor: 'rgba(13,92,75,0.08)',
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpActionText: { color: '#0d5c4b', fontWeight: '900', fontSize: 13 },
  resendBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  resendText: { color: '#0d5c4b', fontWeight: '900' },
  changePhoneBtn: {
    marginTop: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  changePhoneText: { color: '#0d5c4b', fontWeight: '800' },

  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#0d5c4b',
    borderRadius: 18,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0d5c4b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  primaryBtnDisabled: { opacity: 0.48, shadowOpacity: 0 },
  primaryBtnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 16, flexShrink: 1 },
  primaryBtnIcon: { marginLeft: 10 },
  primaryHint: { marginTop: 10, color: '#8a9286', fontSize: 12, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  primaryHintReady: { color: '#0d5c4b' },
});

export default Login;
