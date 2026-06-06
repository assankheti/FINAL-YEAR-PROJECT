import { Feather } from '@expo/vector-icons';
import GreenHeader from '@/components/GreenHeader';
import OrdersList from '@/components/OrdersList';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SpeechHighlight } from '@/components/SpeechHighlight';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageVoiceReadout } from '@/hooks/usePageVoiceReadout';
import { authFetch } from '@/lib/authFetch';

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

function mapStatus(apiStatus: string): OrderStatus {
  switch (apiStatus) {
    case 'paid':
    case 'processing': return 'confirmed';
    case 'shipped':    return 'shipped';
    case 'delivered':
    case 'completed':  return 'delivered';
    default:           return 'pending';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function FarmerOrdersPage() {
  const router = useRouter();
  const { textLanguage } = useLanguage();
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);
  const pick = (english: string, urdu: string) => (textLanguage === 'urdu' ? urdu : english);

  const filters = useMemo(
    () => [
      { key: 'all' as const, label: pick('All Orders', 'تمام آرڈرز') },
      { key: 'pending' as const, label: pick('Pending', 'زیر التواء') },
      { key: 'confirmed' as const, label: pick('Confirmed', 'تصدیق شدہ') },
      { key: 'shipped' as const, label: pick('Shipped', 'بھیج دیا') },
      { key: 'delivered' as const, label: pick('Delivered', 'پہنچا دیا') },
    ],
    [pick]
  );

  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]['key']>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      // Real seller orders — ids here match the order-details endpoint.
      const res = await authFetch('/api/v1/payments/orders?role=farmer&limit=100');
      if (res.ok) {
        const data: any[] = await res.json();
        setOrders(
          data.map((o) => ({
            id: o.order_id,
            productName: o.product_name,
            quantity: `${o.quantity} units`,
            price: `₨${(o.total_pkr ?? 0).toLocaleString()}`,
            buyer: o.buyer_id,
            status: mapStatus(o.status),
            date: formatDate(o.created_at),
            image: '🌾',
          }))
        );
      }
    } catch {
      // network error — keep current list
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders])
  );

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [activeFilter, orders]);

  const stats = useMemo(() => {
    const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length;
    return {
      total: orders.length,
      pending: count('pending'),
      shipped: count('shipped'),
      delivered: count('delivered'),
    };
  }, [orders]);

  // ── Voice guidance: read the page aloud and highlight each section. ──
  const { voiceLanguage } = useLanguage();
  const voiceSteps = useMemo(() => {
    const v = (english: string, urdu: string) => (voiceLanguage === 'urdu' ? urdu : english);
    return [
      { id: 'orders.header', text: v('My Orders.', 'میرے آرڈرز۔') },
      { id: 'orders.stats', text: v('Order summary. Total, pending, shipped, and delivered counts.', 'آرڈرز کا خلاصہ۔ کل، زیر التواء، بھیجے گئے، اور پہنچائے گئے کی تعداد۔') },
      { id: 'orders.filters', text: v('Filter buttons. Tap to see all, pending, confirmed, shipped, or delivered orders.', 'فلٹر بٹن۔ تمام، زیر التواء، تصدیق شدہ، بھیجے گئے، یا پہنچائے گئے آرڈرز دیکھنے کے لیے دبائیں۔') },
      { id: 'orders.list', text: v('Your orders. Tap view details on any order to open it.', 'آپ کے آرڈرز۔ کسی بھی آرڈر کو کھولنے کے لیے تفصیلات دیکھیں دبائیں۔') },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceLanguage]);

  const { activeHighlightId } = usePageVoiceReadout(voiceSteps);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ flex: 1 }}>
        <SpeechHighlight active={activeHighlightId === 'orders.header'}>
          <GreenHeader
            title={{ english: 'My Orders', urdu: 'میرے آرڈرز' }}
            onBack={() => {
              // Return to wherever the user came from (e.g. the community
              // Settings tab), falling back to the farmer dashboard.
              if (router.canGoBack()) router.back();
              else router.replace({ pathname: '/farmer-dashboard', params: { tab: 'profile' } });
            }}
          />
        </SpeechHighlight>

        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={{ paddingHorizontal: horizontalPadding, marginTop: -18 }}>
            <SpeechHighlight active={activeHighlightId === 'orders.stats'} style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
            <View style={styles.statsCard}>
              {[
                { label: pick('Total', 'کل'), value: String(stats.total), color: '#111827' },
                { label: pick('Pending', 'زیر التواء'), value: String(stats.pending), color: '#f59e0b' },
                { label: pick('Shipped', 'بھیج دیا'), value: String(stats.shipped), color: '#10b981' },
                { label: pick('Delivered', 'پہنچا دیا'), value: String(stats.delivered), color: '#0d5c4b' },
              ].map((s) => (
                <View key={s.label} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            </SpeechHighlight>
          </View>

          {/* Filter Tabs */}
          <View style={{ paddingHorizontal: horizontalPadding, marginTop: 18 }}>
            <SpeechHighlight active={activeHighlightId === 'orders.filters'}>
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
                      accessibilityLabel={pick(`Filter ${f.label}`, `فلٹر ${f.label}`)}
                    >
                      <Text style={[styles.filterText, isActive ? styles.filterTextActive : styles.filterTextIdle]}>{f.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            </SpeechHighlight>
          </View>

          {/* Orders */}
          <View style={{ paddingHorizontal: horizontalPadding, marginTop: 14 }}>
            <SpeechHighlight active={activeHighlightId === 'orders.list'} style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
            <View>
              {isLoading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="large" color="#0d5c4b" />
                  <Text style={styles.emptySub}>{pick('Loading your orders...', 'آپ کے آرڈرز لوڈ ہو رہے ہیں...')}</Text>
                </View>
              ) : filteredOrders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="package" size={22} color="#0d5c4b" />
                  <Text style={styles.emptyTitle}>{pick('No orders', 'کوئی آرڈر نہیں')}</Text>
                  <Text style={styles.emptySub}>{pick('No orders found in this status.', 'اس حالت میں کوئی آرڈر نہیں ملا۔')}</Text>
                </View>
              ) : (
                <OrdersList
                  orders={filteredOrders.map((o) => ({
                    id: o.id,
                    productName: o.productName,
                    quantity: o.quantity,
                    price: o.price,
                    counterparty: pick(`Buyer: ${o.buyer}`, `خریدار: ${o.buyer}`),
                    status: o.status,
                    date: o.date,
                    image: o.image,
                  }))}
                  onView={(id) => router.push({ pathname: '/order-details/[orderId]', params: { orderId: id } })}
                />
              )}
            </View>
            </SpeechHighlight>
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

  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  emptySub: { fontSize: 12, color: '#6b7280', lineHeight: 18, textAlign: 'center' },

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
