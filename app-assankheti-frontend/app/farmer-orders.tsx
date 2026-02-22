import { Feather } from '@expo/vector-icons';
import GreenHeader from '@/components/GreenHeader';
import OrdersList from '@/components/OrdersList';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered';

type Order = {
  id: string;
  productName: string;
  quantity: string;
  price: string;
  buyer: string;
  status: OrderStatus;
  date: string;
  image: string;
};

export default function FarmerOrdersPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const filters = useMemo(
    () => [
      { key: 'all' as const, label: 'All Orders' },
      { key: 'pending' as const, label: 'Pending' },
      { key: 'confirmed' as const, label: 'Confirmed' },
      { key: 'shipped' as const, label: 'Shipped' },
      { key: 'delivered' as const, label: 'Delivered' },
    ],
    []
  );

  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]['key']>('all');

  const orders = useMemo<Order[]>(
    () => [
      { id: 'ORD001', productName: 'Fresh Basmati Rice', quantity: '50 kg', price: '₨9,000', buyer: 'Ali Traders', status: 'delivered', date: 'Dec 28, 2024', image: '🌾' },
      { id: 'ORD002', productName: 'Premium Rice', quantity: '100 kg', price: '₨18,000', buyer: 'Karachi Foods', status: 'shipped', date: 'Dec 29, 2024', image: '🌾' },
      { id: 'ORD003', productName: 'Rice Bran', quantity: '25 kg', price: '₨800', buyer: 'Lahore Mills', status: 'confirmed', date: 'Dec 30, 2024', image: '🌾' },
      { id: 'ORD004', productName: 'Fresh Rice - 50kg', quantity: '50 kg', price: '₨2,250', buyer: 'Hassan Store', status: 'pending', date: 'Dec 30, 2024', image: '🌾' },
    ],
    []
  );

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [activeFilter, orders]);

  const statusConfig: Record<OrderStatus, { label: string; labelUrdu: string; bg: string; fg: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
    pending: { label: 'Pending', labelUrdu: 'زیر التواء', bg: 'rgba(245,158,11,0.16)', fg: '#f59e0b', icon: 'clock' },
    confirmed: { label: 'Confirmed', labelUrdu: 'تصدیق شدہ', bg: 'rgba(16,185,129,0.18)', fg: '#10b981', icon: 'check-circle' },
    shipped: { label: 'Shipped', labelUrdu: 'بھیج دیا', bg: 'rgba(13,92,75,0.14)', fg: '#0d5c4b', icon: 'truck' },
    delivered: { label: 'Delivered', labelUrdu: 'پہنچا دیا', bg: 'rgba(13,92,75,0.14)', fg: '#0d5c4b', icon: 'package' },
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ flex: 1 }}>
        <GreenHeader title={{ english: 'My Orders', urdu: 'میرے آرڈرز' }} onBack={() => router.replace({ pathname: '/farmer-dashboard', params: { tab: 'profile' } })} />

        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={{ paddingHorizontal: horizontalPadding, marginTop: -18 }}>
            <View style={[styles.statsCard, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
              {[
                { label: 'Total', value: '24', color: '#111827' },
                { label: 'Pending', value: '3', color: '#f59e0b' },
                { label: 'Shipped', value: '5', color: '#10b981' },
                { label: 'Delivered', value: '16', color: '#0d5c4b' },
              ].map((s) => (
                <View key={s.label} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={{ paddingHorizontal: horizontalPadding, marginTop: 18 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {filters.map((f) => {
                  const isActive = f.key === activeFilter;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      activeOpacity={0.9}
                      onPress={() => setActiveFilter(f.key)}
                      style={[styles.filterPill, isActive ? styles.filterPillActive : styles.filterPillIdle]}
                      accessibilityRole="button"
                      accessibilityLabel={`Filter ${f.label}`}
                    >
                      <Text style={[styles.filterText, isActive ? styles.filterTextActive : styles.filterTextIdle]}>{f.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Orders */}
          <View style={{ paddingHorizontal: horizontalPadding, marginTop: 14 }}>
            <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
              <OrdersList
                orders={filteredOrders.map((o) => ({
                  id: o.id,
                  productName: o.productName,
                  quantity: o.quantity,
                  price: o.price,
                  counterparty: `Buyer: ${o.buyer}`,
                  status: o.status,
                  date: o.date,
                  image: o.image,
                }))}
                onView={(id) => router.push({ pathname: '/order-details/[orderId]', params: { orderId: id } })}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 18,
    paddingBottom: 36,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.75)', marginTop: 2, fontSize: 13 },

  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  statValue: { fontWeight: '900', fontSize: 18 },
  statLabel: { color: '#6b7280', fontSize: 10, marginTop: 2 },

  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  filterPillActive: { backgroundColor: '#0d5c4b' },
  filterPillIdle: { backgroundColor: 'rgba(17,24,39,0.06)' },
  filterText: { fontWeight: '800', fontSize: 12 },
  filterTextActive: { color: '#ffffff' },
  filterTextIdle: { color: '#6b7280' },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  emojiBox: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' },
  productName: { fontWeight: '900', color: '#111827' },
  subText: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  price: { fontWeight: '900', color: '#0d5c4b' },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontWeight: '900', fontSize: 11 },

  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: { color: '#6b7280', fontSize: 11 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
  viewBtnText: { color: '#0d5c4b', fontWeight: '900', fontSize: 12 },
});
