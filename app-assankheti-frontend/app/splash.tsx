//imports your custom UI splash component.
import { SplashScreen } from '@/components/splash-screen-simple';

// Import Redirect component from Expo Router
// Redirect is used to navigate to another route automatically
// without rendering any UI on the screen
import { useRouter } from 'expo-router';

import { getOrCreateMobileId } from '@/lib/deviceId';
import { API_BASE } from '@/config/env';
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

      router.replace('/terms-and-conditions');
    } catch (err) {
      // Even if backend fails, you can still proceed (your choice)
      // console.log('Bootstrap failed', err);
      router.replace('/terms-and-conditions');
    }
  };

  return <SplashScreen onComplete={handleSplashComplete} />;
}
