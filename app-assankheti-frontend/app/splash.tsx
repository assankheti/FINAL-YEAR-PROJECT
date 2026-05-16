//imports your custom UI splash component.
import { SplashScreen } from '@/components/splash-screen-simple';

// Import Redirect component from Expo Router
// Redirect is used to navigate to another route automatically
// without rendering any UI on the screen
import { useRouter } from 'expo-router';

import { getOrCreateMobileId } from '@/lib/deviceId';
import { API_BASE } from '@/config/env';
import { getStartupRoute, readAppFlowState } from '@/lib/appFlow';
//defines the screen component for this route file.
export default function SplashPage() {
  const router = useRouter();

  const handleSplashComplete = async () => {
    try {
      const mobile_id = await getOrCreateMobileId();

      // Hit backend bootstrap
      const res = await fetch(`${API_BASE}/api/v1/user/generate/mobileid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile_id
        }),
      });

      const data = await res.json();

      // Optional: verify response mobile_id
      console.log('BOOTSTRAP:', data);

      const flowState = await readAppFlowState();
      router.replace(getStartupRoute(flowState) as any);
    } catch {
      // Even if backend fails, local flow state is enough to continue safely.
      const flowState = await readAppFlowState();
      router.replace(getStartupRoute(flowState) as any);
    }
  };

  return <SplashScreen onComplete={handleSplashComplete} />;
}
