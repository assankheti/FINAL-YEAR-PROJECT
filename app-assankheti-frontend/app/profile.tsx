import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { readAppFlowState, type RouteTarget } from '@/lib/appFlow';

export default function ProfileAliasPage() {
  const [target, setTarget] = useState<RouteTarget | null>(null);

  useEffect(() => {
    let cancelled = false;

    readAppFlowState()
      .then((state) => {
        if (cancelled) return;
        if (state.role === 'farmer') {
          setTarget({ pathname: '/farmer-dashboard', params: { tab: 'profile' } });
          return;
        }
        setTarget({ pathname: '/community-dashboard', params: { userType: state.role ?? 'simple-user' } });
      })
      .catch(() => {
        if (!cancelled) setTarget('/community-dashboard');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!target) return null;
  return <Redirect href={target as any} />;
}
