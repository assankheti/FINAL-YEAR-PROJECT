import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { getRedirectForPath, readAppFlowState, type RouteTarget } from '@/lib/appFlow';

function replace(target: RouteTarget) {
  router.replace(target as any);
}

export function AppRouteGuard() {
  const pathname = usePathname();
  const lastRedirectRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const state = await readAppFlowState();
        if (cancelled) return;

        const redirectTarget = getRedirectForPath(pathname, state);
        if (!redirectTarget) {
          lastRedirectRef.current = null;
          return;
        }

        const redirectPath = typeof redirectTarget === 'string' ? redirectTarget : redirectTarget.pathname;
        if (redirectPath === pathname || lastRedirectRef.current === `${pathname}->${redirectPath}`) return;

        lastRedirectRef.current = `${pathname}->${redirectPath}`;
        replace(redirectTarget);
      } catch (err) {
        console.error('Route guard failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
