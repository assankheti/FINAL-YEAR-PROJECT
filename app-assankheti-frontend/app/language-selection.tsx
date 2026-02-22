import { LanguageSelection as LanguageSelectionComponent } from '@/components/language-selection-simple';
import { useRouter } from 'expo-router';
import { getOrCreateMobileId } from '@/lib/deviceId';
import { API_BASE } from '@/config/env';
import { useLanguage } from '@/contexts/LanguageContext';


export default function LanguageSelectionPage() {
  const router = useRouter();
  const { setTextLanguage, setVoiceLanguage } = useLanguage();

  const handleLanguageSelection = async (sel: {
    textLanguage: 'english' | 'urdu';
    voiceLanguage: 'english' | 'urdu';
  }) => {
    try {
      setTextLanguage(sel.textLanguage);
      setVoiceLanguage(sel.voiceLanguage);

      // 1️⃣ Get existing mobile_id
      const mobile_id = await getOrCreateMobileId();

      // 2️⃣ Map frontend → backend language
      const payload = {
        mobile_id,
        language: sel.textLanguage === 'english' ? 'en' : 'ur',
        voice: sel.voiceLanguage, // same values backend expects
      };

      // 3️⃣ Call backend
      const res = await fetch(`${API_BASE}/api/v1/user/language-voice/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to save language');
      }

      
      router.push({
        pathname: '/user-type-selection',
        params: {
          textLanguage: sel.textLanguage,
          voiceLanguage: sel.voiceLanguage,
        },
      });

    } catch (err) {
      console.error('Language save failed:', err);

      // Optional fallback: still allow navigation
      router.push('/user-type-selection');
    }
  };

  return <LanguageSelectionComponent onComplete={handleLanguageSelection} />;
}
