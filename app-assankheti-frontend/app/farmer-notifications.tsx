import React, { useCallback, useMemo } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Notification from '@/components/notification';
import { usePageVoiceGuidance } from '@/hooks/usePageVoiceGuidance';

export default function FarmerNotificationsPage() {
  const router = useRouter();

  usePageVoiceGuidance(
    { english: 'Notifications', urdu: 'اطلاعات' },
    {
      english: 'Review weather alerts, price updates, government schemes, and new order notices.',
      urdu: 'موسم کے الرٹس، قیمت کی اپڈیٹس، حکومتی اسکیمیں، اور نئے آرڈر نوٹس دیکھیں۔',
    }
  );

  const goToDashboard = useCallback(() => {
    router.replace({ pathname: '/farmer-dashboard', params: { tab: 'home' } });
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;

      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goToDashboard();
        return true;
      });

      return () => subscription.remove();
    }, [goToDashboard])
  );

  const initial = useMemo(() => [
    { id: 'rain-expected', type: 'weather', title: 'Rain expected tomorrow', titleUrdu: 'کل بارش متوقع', description: 'Take precautions to protect your crop from rain.', time: '30 min ago', isRead: false },
    { id: 'rice-price-up', type: 'price', title: 'Rice price increased', titleUrdu: 'چاول کی قیمت میں اضافہ', description: 'Market price is better. It may be a good time to sell.', time: '2 hours ago', isRead: false },
    { id: 'pm-kisan-update', type: 'scheme', title: 'PM Kisan Scheme Update', titleUrdu: 'پی ایم کسان اسکیم', description: 'New installment of PM Kisan Samman Nidhi is available.', time: '5 hours ago', isRead: true },
    { id: 'new-order-received', type: 'order', title: 'New Order Received', titleUrdu: 'نیا آرڈر موصول', description: 'You have a new order for 50kg Premium Rice.', time: '1 day ago', isRead: true },
    { id: 'pest-alert-rice', type: 'alert', title: 'Pest Alert for Rice', titleUrdu: 'چاول میں کیڑے کا خطرہ', description: 'Brown planthopper detected in nearby areas. Take precautions.', time: '2 days ago', isRead: true },
    { id: 'temperature-rising', type: 'weather', title: 'Temperature Rising', titleUrdu: 'درجہ حرارت بڑھ رہا ہے', description: 'Expected temperature of 38°C this week. Ensure irrigation.', time: '3 days ago', isRead: true },
  ], []);

  return (
    <Notification
      initial={initial}
      title={{ english: 'Notifications', urdu: 'اطلاعات' }}
      onBack={goToDashboard}
      seedNamespace="farmer-notifications"
      storageNamespaces={['farmer-notifications']}
    />
  );
}
