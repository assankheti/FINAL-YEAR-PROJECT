import { UserTypeSelection } from '@/components/user-type-selection';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { getOrCreateMobileId } from '@/lib/deviceId';
import { API_BASE } from '@/config/env';
import { useLanguage } from '@/contexts/LanguageContext';

type UserType = 'farmer' | 'simple-user' | 'businessman';

export default function UserTypeSelectionPage() {
  const router = useRouter();

  const { textLanguage, voiceLanguage, hydrated } = useLanguage();
  const [saving, setSaving] = useState(false);

  // 🔹 Save character + finalize + navigate
  const handleSelect = async (type: UserType) => {
    if (saving) return;

    setSaving(true);

    try {
      const mobile_id = await getOrCreateMobileId();

      // 1️⃣ Save character
      const charRes = await fetch(
        `${API_BASE}/api/v1/user/character/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobile_id,
            character_id: type,
          }),
        }
      );

      if (!charRes.ok) {
        const err = await charRes.json();
        throw new Error(err.detail || 'Failed to save character');
      }

      // 2️⃣ Finalize settings
      const finalizeRes = await fetch(
        `${API_BASE}/api/v1/user/devicesetting/${mobile_id}`,
        { method: 'POST' }
      );

      if (!finalizeRes.ok) {
        const err = await finalizeRes.json();
        throw new Error(err.detail || 'Failed to finalize settings');
      }

      // 3️⃣ Navigate
      if (type === 'farmer') {
        router.replace({ pathname: '/crop-selection', params: { textLanguage, voiceLanguage } });
      } else {
        router.replace({
          pathname: '/login',
          params: { userType: type, textLanguage, voiceLanguage },
        });
      }
    } catch (err: any) {
      console.error('User setup failed:', err.message);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated) return null; // wait for persisted language

  return (
    <UserTypeSelection
      onSelectUserType={handleSelect}
      textLanguage={textLanguage}
    />
  );
}