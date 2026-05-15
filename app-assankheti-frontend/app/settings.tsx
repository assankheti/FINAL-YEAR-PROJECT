import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { readAppFlowState, type RouteTarget } from '@/lib/appFlow';

export default function SettingsAliasPage() {
  const [target, setTarget] = useState<RouteTarget | null>(null);

  useEffect(() => {
    let cancelled = false;

    readAppFlowState()
      .then((state) => {
        if (cancelled) return;
        setTarget(state.role === 'farmer' ? '/farmer-settings' : '/community-settings');
      })
      .catch(() => {
        if (!cancelled) setTarget('/community-settings');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!target) return null;
  return <Redirect href={target as any} />;
}
