import { Login } from '@/components/login';
import { getOrCreateMobileId } from '@/lib/deviceId';
import { API_BASE } from '@/config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { coerceAppLanguage, useLanguage } from '@/contexts/LanguageContext';

function tryParseJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function VerifyOtpPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { textLanguage: ctxTextLanguage, voiceLanguage: ctxVoiceLanguage } = useLanguage();

  const userType = (params?.userType as string) ?? 'simple-user';
  const textLanguage = coerceAppLanguage(params?.textLanguage, ctxTextLanguage);
  const voiceLanguage = coerceAppLanguage(params?.voiceLanguage, ctxVoiceLanguage);

  const methodId = (params?.methodId as string) ?? '';
  const phoneNumber = (params?.phoneNumber as string) ?? '';

  const handleVerifyOtp = async (code: string) => {
    if (!methodId) throw new Error('Missing method_id');
    if (!phoneNumber) throw new Error('Missing phone number');

    const mobile_id = await getOrCreateMobileId();

    const res = await fetch(`${API_BASE}/api/v1/auth/verify-otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method_id: methodId,
        code,
        phone_number: phoneNumber,
        mobile_id,
      }),
    });

    const text = await res.text();
    const json = tryParseJson(text);

    if (!res.ok) {
      const message =
        (json && (json.detail || json.message)) ||
        text ||
        `Verify OTP failed (${res.status})`;
      throw new Error(message);
    }

    const accessToken = json?.access_token;
    const tokenType = json?.token_type ?? 'bearer';
    const userId = json?.user_id;

    if (!accessToken) throw new Error('Missing access_token from server');

    await AsyncStorage.setItem('auth.access_token', accessToken);
    await AsyncStorage.setItem('auth.token_type', tokenType);
    if (userId) await AsyncStorage.setItem('auth.user_id', String(userId));
    await AsyncStorage.setItem('auth.phone_number', phoneNumber);

    router.replace({
      pathname: '/community-dashboard',
      params: {
        userType,
        textLanguage,
        voiceLanguage,
      },
    });
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <Login
      userType={userType as any}
      textLanguage={textLanguage}
      mode="otp"
      initialPhoneE164={phoneNumber}
      onVerifyOtp={handleVerifyOtp}
      onBack={handleBack}
    />
  );
}
