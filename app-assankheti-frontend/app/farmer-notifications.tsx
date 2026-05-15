import React, { useCallback, useEffect, useMemo } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Notification from '@/components/notification';
import { showMobileNotificationsOnce } from '@/lib/mobileNotifications';

export default function FarmerNotificationsPage() {
  const router = useRouter();

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
    { id: '1', type: 'weather', title: 'Heavy Rain Expected', titleUrdu: 'شدید بارش متوقع', description: 'Rain expected in Punjab region tomorrow. Protect your crops.', time: '30 min ago', isRead: false },
    { id: '2', type: 'price', title: 'Rice Prices Up 8%', titleUrdu: 'چاول کی قیمت میں اضافہ', description: 'Rice market prices have increased. Good time to sell!', time: '2 hours ago', isRead: false },
    { id: '3', type: 'scheme', title: 'PM Kisan Scheme Update', titleUrdu: 'پی ایم کسان اسکیم', description: 'New installment of PM Kisan Samman Nidhi is available.', time: '5 hours ago', isRead: true },
    { id: '4', type: 'order', title: 'New Order Received', titleUrdu: 'نیا آرڈر موصول', description: 'You have a new order for 50kg Premium Rice.', time: '1 day ago', isRead: true },
    { id: '5', type: 'alert', title: 'Pest Alert for Rice', titleUrdu: 'چاول میں کیڑے کا خطرہ', description: 'Brown planthopper detected in nearby areas. Take precautions.', time: '2 days ago', isRead: true },
    { id: '6', type: 'weather', title: 'Temperature Rising', titleUrdu: 'درجہ حرارت بڑھ رہا ہے', description: 'Expected temperature of 38°C this week. Ensure irrigation.', time: '3 days ago', isRead: true },
  ], []);

  useEffect(() => {
    showMobileNotificationsOnce(
      'farmer-notifications',
      initial.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.description,
        isRead: item.isRead,
        data: { type: item.type },
      }))
    );
  }, [initial]);

  return (
    <Notification
      initial={initial}
      title={{ english: 'Notifications', urdu: 'اطلاعات' }}
      onBack={goToDashboard}
    />
  );
}
