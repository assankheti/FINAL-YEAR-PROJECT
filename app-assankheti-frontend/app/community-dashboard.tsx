import { CommunityDashboard } from '@/components/community-dashboard';
import { useLocalSearchParams } from 'expo-router';
import { coerceAppLanguage, useLanguage } from '@/contexts/LanguageContext';

export default function CommunityDashboardPage() {
  const params = useLocalSearchParams();
  const { textLanguage: ctxTextLanguage } = useLanguage();
  const userType = (params?.userType as string) ?? 'simple-user';
  const textLanguage = coerceAppLanguage(params?.textLanguage, ctxTextLanguage);

  return <CommunityDashboard userType={userType as any} textLanguage={textLanguage} />;
}
