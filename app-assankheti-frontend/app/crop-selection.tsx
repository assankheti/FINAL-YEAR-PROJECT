import { CropSelection, type CropId } from '@/components/crop-selection';
import { getOrCreateMobileId } from '@/lib/deviceId';
import { API_BASE } from '@/config/env';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CropSelectionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { textLanguage, voiceLanguage, hydrated } = useLanguage();

  const handleContinue = async (selectedCrop: CropId) => {
    if (saving) return;
    setSaving(true);

    try {
      const mobile_id = await getOrCreateMobileId();

      // Save crop selection — backend expects only { selected_crops: [...] }
      const cropRes = await fetch(
        `${API_BASE}/api/v1/user/crop-selection/${mobile_id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selected_crops: [selectedCrop] }),
        }
      );

      if (!cropRes.ok) {
        const errBody = await cropRes.text();
        let message = `Failed to save crop selection (${cropRes.status})`;
        try {
          const json = JSON.parse(errBody);
          message = json.detail || json.message || message;
        } catch {}
        throw new Error(message);
      }

      router.replace({
        pathname: '/farmer-dashboard',
        params: { textLanguage, voiceLanguage, selectedCrop },
      });
    } catch (err: any) {
      console.error('Crop selection failed:', err.message);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated) return null;

  return <CropSelection onContinue={handleContinue} />;
}
