import FarmerDashboard from '@/components/farmer-dashboard';
import { useLocalSearchParams } from 'expo-router';
import { coerceAppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { readAppFlowState } from '@/lib/appFlow';
import { useEffect, useState } from 'react';

export default function FarmerDashboardPage() {
  const params = useLocalSearchParams();
  const { textLanguage: ctxTextLanguage, voiceLanguage: ctxVoiceLanguage } = useLanguage();

  const textLanguage = coerceAppLanguage(params?.textLanguage, ctxTextLanguage);
  const voiceLanguage = coerceAppLanguage(params?.voiceLanguage, ctxVoiceLanguage);
  const tab = (params?.tab as string) ?? 'home';
  const [storedCrop, setStoredCrop] = useState<string | undefined>((params?.selectedCrop as string) ?? undefined);
  const selectedCrop = (params?.selectedCrop as string) ?? storedCrop;
  const characterType = (params?.userType as string) ?? 'farmer';

  useEffect(() => {
    if (params?.selectedCrop) return;
    let cancelled = false;

    readAppFlowState()
      .then((state) => {
        if (!cancelled && state.selectedCrop) setStoredCrop(state.selectedCrop);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [params?.selectedCrop]);

  return (
    <FarmerDashboard
      textLanguage={textLanguage}
      voiceLanguage={voiceLanguage}
      initialTab={(tab as any) ?? 'home'}
      selectedCrop={selectedCrop}
      characterType={characterType as any}
    />
  );
}
