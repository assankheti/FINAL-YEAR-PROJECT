import { CropSelection, type CropId } from '@/components/crop-selection';
import { getOrCreateMobileId } from '@/lib/deviceId';
import { API_BASE } from '@/config/env';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

function tryParseJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function CropSelectionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { textLanguage, voiceLanguage, hydrated } = useLanguage();

  const handleContinue = async (selectedCrop: CropId) => {
    if (saving) return;
    setSaving(true);

    try {
      // 🔹 1. Get mobile_id from AsyncStorage
      const mobile_id = await getOrCreateMobileId();
      // 🔹 2. Save crop selection
      const cropRes = await fetch(
        `${API_BASE}/api/v1/user/crop-selection/${mobile_id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Backend validation requires these fields
            mobile_id,
            crop_type: selectedCrop,
            selection_date: new Date().toISOString(),

            // Keep this for backward compatibility if backend also accepts it
            selected_crops: [selectedCrop],
          }),
        }
      );

      const cropText = await cropRes.text();
      const cropJson = tryParseJson(cropText);

      if (!cropRes.ok) {
        const message =
          (cropJson && (cropJson.detail || cropJson.message)) ||
          cropText ||
          `Failed to save crop selection (${cropRes.status})`;
        throw new Error(message);
      }


      // 🔹 4. Navigate to farmer dashboard
      router.replace({
        pathname: '/farmer-dashboard',
        params: {
          textLanguage,
          voiceLanguage,
          selectedCrop,
        },
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
