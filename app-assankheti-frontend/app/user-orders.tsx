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
  seller: string;
  status: OrderStatus;
  date: string;
  image: string;
};

export default function UserOrdersPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const orders = useMemo<Order[]>(
    () => [
      { id: 'UORD001', productName: 'Fresh Basmati Rice', quantity: '20 kg', price: '₨3,600', seller: 'Hassan Farm', status: 'pending', date: 'Dec 30, 2024', image: '🌾' },
      { id: 'UORD002', productName: 'Premium Rice', quantity: '10 kg', price: '₨1,800', seller: 'Green Fields', status: 'confirmed', date: 'Dec 29, 2024', image: '🌾' },
      { id: 'UORD003', productName: 'Rice Bran', quantity: '25 kg', price: '₨800', seller: 'Punjab Agro', status: 'shipped', date: 'Dec 28, 2024', image: '🌾' },
      { id: 'UORD004', productName: 'Fresh Rice - 50kg', quantity: '50 kg', price: '₨2,250', seller: 'Sialkot Farms', status: 'delivered', date: 'Dec 26, 2024', image: '🌾' },
    ],
    []
  );

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

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [activeFilter, orders]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ flex: 1 }}>
        <GreenHeader title={{ english: 'My Orders', urdu: 'میرے آرڈرز' }} onBack={() => router.back()} />

        <ScrollView contentContainerStyle={{ paddingVertical: 18, paddingHorizontal: horizontalPadding }}>
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 2 }}>
                <View style={{ flexDirection: 'row', gap: 10}}>
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

            <View style={{ marginTop: 14 }}>
              {filteredOrders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="package" size={22} color="#0d5c4b" />
                  <Text style={styles.emptyTitle}>No orders</Text>
                  <Text style={styles.emptySub}>No orders found in this status.</Text>
                </View>
              ) : (
                <OrdersList
                  orders={filteredOrders.map((o) => ({ id: o.id, productName: o.productName, quantity: o.quantity, price: o.price, counterparty: `Seller: ${o.seller}`, status: o.status, date: o.date, image: o.image }))}
                  onView={(id) => router.push({ pathname: '/order-details/[orderId]', params: { orderId: id } })}
                />
              )}
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

  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  filterPillActive: { backgroundColor: '#0d5c4b' },
  filterPillIdle: { backgroundColor: 'rgba(17,24,39,0.06)' },
  filterText: { fontWeight: '800', fontSize: 12 },
  filterTextActive: { color: '#ffffff' },
  filterTextIdle: { color: '#6b7280' },

  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  emptySub: { fontSize: 12, color: '#6b7280', lineHeight: 18 },
});
