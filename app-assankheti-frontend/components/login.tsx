import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
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
  const { width } = useWindowDimensions();

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
      }) as const,
    []
  );

  const t = (obj: any) => obj[textLanguage];

  const otpRefs = useRef<Array<TextInput | null>>([]);

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

  const contentMaxWidth = Math.min(width - 32, 520);
  // Calculate OTP input box size so 6 boxes always fit within card padding on narrow screens
  const otpBoxSize = Math.min(52, Math.floor((contentMaxWidth - 16 * 2 - 10 * 5) / 6));

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.screen}>
        {/* Header */}
        <LinearGradient
          colors={['#0d5c4b', '#10b981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTopRow}>
            <View style={styles.brandRow}>
              <View style={styles.logoBox}>
            <View style={styles.headerIconBox}>
              {step === 'phone' ? (
                <Feather name="phone" size={22} color="#ffffff" />
              ) : (
                <Feather name="shield" size={22} color="#ffffff" />
              )}
            </View>
              </View>
              <View>
              <Text style={styles.headerTitle}>{step === 'phone' ? t(translations.loginTitle) : t(translations.verifyTitle)}</Text>
              <Text style={styles.headerSubtitle}>{step === 'phone' ? t(translations.loginSubtitle) : t(translations.verifySubtitle)}</Text>
              </View>
            </View>

            {onBack ? (
              <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={8}>
                <Feather name="arrow-left" size={18} color="#ffffff" />
              </TouchableOpacity>
            ) : null}
          </View>
        </LinearGradient>

        {/* Content */}
        <View style={[styles.content, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
          {step === 'phone' ? (
            <View>
              <View style={styles.card}>
                <Text style={styles.label}>{t(translations.phoneLabel)}</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.phoneInputWrap}>
                    <TextInput
                      value={phone}
                      onChangeText={(v) => setPhone(v.replace(/\s/g, ''))}
                      placeholder={t(translations.phonePlaceholder)}
                      placeholderTextColor="#9ca3af"
                      keyboardType="phone-pad"
                      style={styles.phoneInput}
                      maxLength={16}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
                <Text style={styles.hint}>{t(translations.smsHint)}</Text>
              </View>

              <View style={{ marginTop: 14, gap: 10 }}>
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
            </View>
          ) : (
            <View>
              <View style={styles.card}>
                <View style={{ alignItems: 'center', marginBottom: 14 }}>
                  <Text style={styles.otpHelp}>{t(translations.enter4Digit)}</Text>
                  <Text style={styles.otpPhone}>{initialPhoneE164 ?? `+92 ${phone}`}</Text>
                </View>

                <View style={styles.otpRow}>
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
                        { width: otpBoxSize, height: otpBoxSize, fontSize: Math.max(18, Math.floor(otpBoxSize * 0.42)) },
                      ]}
                      returnKeyType="done"
                    />
                  ))}
                </View>

                <TouchableOpacity style={styles.resendBtn} onPress={handleResendOtp} disabled={loading}>
                  <Feather name="refresh-cw" size={14} color="#10b981" />
                  <Text style={styles.resendText}>{t(translations.resendOtp)}</Text>
                </TouchableOpacity>
              </View>

              {onBack || mode !== 'otp' ? (
                <TouchableOpacity style={styles.changePhoneBtn} onPress={handleChangePhone} disabled={loading}>
                  <Text style={styles.changePhoneText}>← {t(translations.changePhone)}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>

        {/* Bottom action */}
        <View style={[styles.bottomBar, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
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
                <Text style={styles.primaryBtnText}>{step === 'phone' ? t(translations.sendOtp) : t(translations.verifyContinue)}</Text>
                <Feather name="arrow-right" size={18} color="#ffffff" style={{ marginLeft: 10 }} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f1e8' },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  logoImg: { width: 40, height: 40 },
  brandTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  brandSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerMainRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  headerIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16, marginTop: -14 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  label: { color: '#111827', fontWeight: '600', marginBottom: 10 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  flag: { fontSize: 18 },
  pkCode: { fontSize: 16, fontWeight: '700', color: '#111827' },
  phoneInputWrap: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  phoneInput: { fontSize: 18, color: '#111827' },
  hint: { marginTop: 10, fontSize: 12, color: '#6b7280' },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(16,185,129,0.10)',
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16,185,129,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { color: '#111827', fontSize: 13, flex: 1 },

  otpHelp: { color: '#6b7280', fontSize: 13, textAlign: 'center' },
  otpPhone: { marginTop: 6, color: '#111827', fontSize: 16, fontWeight: '700' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 14 },
  otpInput: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  resendBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  resendText: { color: '#10b981', fontWeight: '700' },
  changePhoneBtn: { marginTop: 12, alignItems: 'center' },
  changePhoneText: { color: '#6b7280' },

  bottomBar: { paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 18 : 12, paddingTop: 12 },
  primaryBtn: {
    backgroundColor: '#0d5c4b',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#ffffff', fontWeight: '800' },
});

export default Login;
