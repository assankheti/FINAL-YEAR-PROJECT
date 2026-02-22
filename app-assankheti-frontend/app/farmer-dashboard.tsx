import FarmerDashboard from '@/components/farmer-dashboard';
import { useLocalSearchParams } from 'expo-router';
import { coerceAppLanguage, useLanguage } from '@/contexts/LanguageContext';

export default function FarmerDashboardPage() {
  const params = useLocalSearchParams();
  const { textLanguage: ctxTextLanguage, voiceLanguage: ctxVoiceLanguage } = useLanguage();

  const textLanguage = coerceAppLanguage(params?.textLanguage, ctxTextLanguage);
  const voiceLanguage = coerceAppLanguage(params?.voiceLanguage, ctxVoiceLanguage);
  const tab = (params?.tab as string) ?? 'home';

  return (
    <FarmerDashboard
      textLanguage={textLanguage}
      voiceLanguage={voiceLanguage}
      initialTab={(tab as any) ?? 'home'}
    />
  );
}
