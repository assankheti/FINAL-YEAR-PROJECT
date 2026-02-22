import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { LanguageProvider } from '@/contexts/LanguageContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LanguageProvider>
      <Stack screenOptions={{ animation: 'none' }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="splash" options={{ headerShown: false }} />
        <Stack.Screen name="terms-and-conditions" options={{ headerShown: false }} />
        <Stack.Screen name="language-selection" options={{ headerShown: false }} />
        <Stack.Screen name="user-type-selection" options={{ headerShown: false }} />
        <Stack.Screen name="crop-selection" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
        <Stack.Screen name="add-product" options={{ headerShown: false }} />
        <Stack.Screen name="farmer-settings" options={{ headerShown: false }} />
        <Stack.Screen name="community-settings" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
        <Stack.Screen name="farmer-profile-edit" options={{ headerShown: false }} />
        <Stack.Screen name="help-center" options={{ headerShown: false }} />
        <Stack.Screen name="farmer-products" options={{ headerShown: false }} />
        <Stack.Screen name="farmer-orders" options={{ headerShown: false }} />
        <Stack.Screen name="farmer-notifications" options={{ headerShown: false }} />
        <Stack.Screen name="category-products/[category]" options={{ headerShown: false }} />
        <Stack.Screen name="product-buy/[productId]" options={{ headerShown: false }} />
        <Stack.Screen name="user-orders" options={{ headerShown: false }} />
        <Stack.Screen name="user-notifications" options={{ headerShown: false }} />
        <Stack.Screen name="call/[contactId]" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[contactId]" options={{ headerShown: false }} />
        <Stack.Screen name="order-details/[orderId]" options={{ headerShown: false }} />
        <Stack.Screen name="farmer-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="community-dashboard" options={{ headerShown: false }} />
      </Stack>
      </LanguageProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
