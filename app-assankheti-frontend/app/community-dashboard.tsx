import { CommunityDashboard } from '@/components/community-dashboard';
import { useLocalSearchParams } from 'expo-router';
import { coerceAppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { normalizeRole, readAppFlowState, type AppRole } from '@/lib/appFlow';
import { useEffect, useState } from 'react';

export default function CommunityDashboardPage() {
  const params = useLocalSearchParams();
  const { textLanguage: ctxTextLanguage } = useLanguage();
  const requestedRole = normalizeRole(params?.userType as string);
  const [storedRole, setStoredRole] = useState<AppRole | null>(requestedRole);
  const userType =
    requestedRole === 'businessman' || requestedRole === 'simple-user'
      ? requestedRole
      : storedRole === 'businessman'
        ? 'businessman'
        : 'simple-user';
  const textLanguage = coerceAppLanguage(params?.textLanguage, ctxTextLanguage);

  useEffect(() => {
    if (requestedRole) return;
    let cancelled = false;

    readAppFlowState()
      .then((state) => {
        if (!cancelled) setStoredRole(state.role);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [requestedRole]);

  return <CommunityDashboard userType={userType} textLanguage={textLanguage} />;
}
