import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { StreamChatProvider } from '@/contexts/StreamChatProvider';
import { configureMobileNotifications } from '@/lib/mobileNotifications';
import { AppRouteGuard } from '@/components/AppRouteGuard';

const STACK_SCREEN_OPTIONS = { animation: 'none', headerShown: false } as const;
const HIDDEN_HEADER = { headerShown: false } as const;

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    void configureMobileNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <LanguageProvider>
          <StreamChatProvider>
            <AppRouteGuard />
            <Stack screenOptions={STACK_SCREEN_OPTIONS}>
          <Stack.Screen name="index" options={HIDDEN_HEADER} />
          <Stack.Screen name="splash" options={HIDDEN_HEADER} />
          <Stack.Screen name="terms-and-conditions" options={HIDDEN_HEADER} />
          <Stack.Screen name="language-selection" options={HIDDEN_HEADER} />
          <Stack.Screen name="user-type-selection" options={HIDDEN_HEADER} />
          <Stack.Screen name="characteristics" options={HIDDEN_HEADER} />
          <Stack.Screen name="crop-selection" options={HIDDEN_HEADER} />
          <Stack.Screen name="login" options={HIDDEN_HEADER} />
          <Stack.Screen name="verify-otp" options={HIDDEN_HEADER} />
          <Stack.Screen name="community-design-preview" options={HIDDEN_HEADER} />
          <Stack.Screen name="add-product" options={HIDDEN_HEADER} />
          <Stack.Screen name="farmer-settings" options={HIDDEN_HEADER} />
          <Stack.Screen name="community-settings" options={HIDDEN_HEADER} />
          <Stack.Screen name="privacy-policy" options={HIDDEN_HEADER} />
          <Stack.Screen name="farmer-profile-edit" options={HIDDEN_HEADER} />
          <Stack.Screen name="help-center" options={HIDDEN_HEADER} />
          <Stack.Screen name="farmer-products" options={HIDDEN_HEADER} />
          <Stack.Screen name="farmer-orders" options={HIDDEN_HEADER} />
          <Stack.Screen name="farmer-notifications" options={HIDDEN_HEADER} />
          <Stack.Screen name="disease-detection" options={HIDDEN_HEADER} />
          <Stack.Screen name="smart-budget" options={HIDDEN_HEADER} />
          <Stack.Screen name="crop-recommendations" options={HIDDEN_HEADER} />
          <Stack.Screen name="category-products/[category]" options={HIDDEN_HEADER} />
          <Stack.Screen name="product-buy/[productId]" options={HIDDEN_HEADER} />
          <Stack.Screen name="user-orders" options={HIDDEN_HEADER} />
          <Stack.Screen name="user-notifications" options={HIDDEN_HEADER} />
          <Stack.Screen name="call/[contactId]" options={HIDDEN_HEADER} />
          <Stack.Screen name="community/inbox" options={HIDDEN_HEADER} />
          <Stack.Screen name="community/chat/[conversationId]" options={HIDDEN_HEADER} />
          <Stack.Screen name="community/group/[groupId]" options={HIDDEN_HEADER} />
          <Stack.Screen name="community/group/[groupId]/members" options={HIDDEN_HEADER} />
          <Stack.Screen name="community/blocked-users" options={HIDDEN_HEADER} />
          <Stack.Screen name="stream-chat/index" options={HIDDEN_HEADER} />
          <Stack.Screen name="stream-chat/channel/[cid]" options={HIDDEN_HEADER} />
          <Stack.Screen name="stream-chat/community" options={HIDDEN_HEADER} />
          <Stack.Screen name="order-details/[orderId]" options={HIDDEN_HEADER} />
          <Stack.Screen name="farmer-dashboard" options={HIDDEN_HEADER} />
          <Stack.Screen name="community-dashboard" options={HIDDEN_HEADER} />
          <Stack.Screen name="farmer/community" options={HIDDEN_HEADER} />
            </Stack>
          </StreamChatProvider>
        </LanguageProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
