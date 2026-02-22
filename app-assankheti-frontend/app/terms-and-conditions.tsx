import { TermsAndConditions } from '@/components/terms-and-conditions';
import { useRouter } from 'expo-router';
import { getOrCreateMobileId } from '@/lib/deviceId';
import { API_BASE } from '@/config/env';

export default function TermsAndConditionsPage() {
  const router = useRouter();

  const handleContinue = async () => {
    try {
      // 1️⃣ Get stored mobile_id
      const mobile_id = await getOrCreateMobileId();

      const res = await fetch(`${API_BASE}/api/v1/user/accept-terms/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile_id,
          terms_accepted: true,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save terms');
      }

      router.replace('/language-selection');
    } catch (err) {
      console.error('Accept terms error:', err);

      router.replace('/language-selection');
    }
  };

  return <TermsAndConditions onContinue={handleContinue} />;
}