import { Login } from '@/components/login';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { coerceAppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { API_BASE } from '@/config/env';


function tryParseJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { textLanguage: ctxTextLanguage, voiceLanguage: ctxVoiceLanguage } = useLanguage();
  const userType = (params?.userType as string) ?? 'simple-user';
  const textLanguage = coerceAppLanguage(params?.textLanguage, ctxTextLanguage);
  const voiceLanguage = coerceAppLanguage(params?.voiceLanguage, ctxVoiceLanguage);

  const handleSendOtp = async (phoneNumberE164: string) => {
    if (!/^\+[1-9]\d{7,14}$/.test(phoneNumberE164)) {
      throw new Error('Phone number must be in E.164 format (e.g., +10000000000)');
    }

    const res = await fetch(`${API_BASE}/api/v1/auth/send-otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number: phoneNumberE164,
        expiration_minutes: 5,
      }),
    });

    const text = await res.text();
    const json = tryParseJson(text);

    if (!res.ok) {
      const message =
        (json && (json.detail || json.message)) ||
        text ||
        `Send OTP failed (${res.status})`;
      throw new Error(message);
    }

    const methodId = json?.method_id;
    if (!methodId) {
      throw new Error('OTP method_id missing');
    }

    await AsyncStorage.setItem('auth.phone_number', phoneNumberE164);
    await AsyncStorage.setItem('auth.otp_method_id', methodId);

    router.push({
      pathname: '/verify-otp',
      params: {
        methodId,
        phoneNumber: phoneNumberE164,
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
      mode="phone"
      onSendOtp={handleSendOtp}
      onBack={handleBack}
    />
  );
}
