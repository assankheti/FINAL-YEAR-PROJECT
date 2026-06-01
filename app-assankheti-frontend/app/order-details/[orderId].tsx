import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useT } from '../../contexts/LanguageContext';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authFetch } from '@/lib/authFetch';
import { usePageVoiceGuidance } from '@/hooks/usePageVoiceGuidance';

type DisplayStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered';

type TimelineStep = { label: string; time: string; completed: boolean };

type OrderDetail = {
  id: string;
  productName: string;
  quantity: string;
  totalPkr: number;
  farmerAmountPkr: number;
  commissionPkr: number;
  serviceFee: number;
  farmerId: string;
  deliveryAddress: string;
  status: DisplayStatus;
  paymentStatus: string;
  date: string;
  timeline: TimelineStep[];
};

const STATUS_SEQUENCE: DisplayStatus[] = ['pending', 'confirmed', 'shipped', 'delivered'];

function mapStatus(apiStatus: string): DisplayStatus {
  switch (apiStatus) {
    case 'paid':
    case 'processing': return 'confirmed';
    case 'shipped':    return 'shipped';
    case 'delivered':
    case 'completed':  return 'delivered';
    default:           return 'pending';
  }
}

function buildTimeline(displayStatus: DisplayStatus, createdAt: string): TimelineStep[] {
  const idx = STATUS_SEQUENCE.indexOf(displayStatus);
  const dateStr = new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const labels = ['Order Placed', 'Payment Confirmed', 'Shipped', 'Delivered'];
  return STATUS_SEQUENCE.map((_, i) => ({
    label: labels[i],
    time: i <= idx ? dateStr : 'Pending',
    completed: i <= idx,
  }));
}

function formatPkr(n: number) { return `₨${n.toLocaleString()}`; }

export default function OrderDetailsPage() {
  const t = useT();
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = (params?.orderId as string) ?? '';

  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  usePageVoiceGuidance(
    { english: 'Order details', urdu: 'آرڈر کی تفصیلات' },
    {
      english: 'Review order status, delivery timeline, payment details, and copy the order ID if needed.',
      urdu: 'آرڈر کی حالت، ڈیلیوری ٹائم لائن، ادائیگی کی تفصیلات، اور ضرورت پڑنے پر آرڈر آئی ڈی کاپی کریں۔',
    }
  );

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);
    try {
      const res = await authFetch(`/api/v1/payments/orders/${orderId}`);
      if (res.ok) {
        const d = await res.json();
        const displayStatus = mapStatus(d.status);
        setOrder({
          id: d.order_id,
          productName: d.product_name,
          quantity: `${d.quantity} units`,
          totalPkr: d.total_pkr ?? 0,
          farmerAmountPkr: d.farmer_amount_pkr ?? 0,
          commissionPkr: d.commission_pkr ?? 0,
          serviceFee: d.service_fee_pkr ?? 100,
          farmerId: d.farmer_id,
          deliveryAddress: d.delivery_address ?? '',
          status: displayStatus,
          paymentStatus: d.payment_status ?? '',
          date: new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          timeline: buildTimeline(displayStatus, d.created_at),
        });
      }
    } catch {
      // leave null — will show error state
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => { void loadOrder(); }, [loadOrder]);

  const STATUS_CONFIG: Record<DisplayStatus, { label: string; fg: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
    pending:   { label: 'Pending',   fg: '#f59e0b', icon: 'clock' },
    confirmed: { label: 'Confirmed', fg: '#10b981', icon: 'check-circle' },
    shipped:   { label: 'Shipped',   fg: '#0d5c4b', icon: 'truck' },
    delivered: { label: 'Delivered', fg: '#0d5c4b', icon: 'package' },
  };

  const copyOrderId = async () => {
    try {
      await Clipboard.setStringAsync(order?.id ?? orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert(t({ english: 'Copy failed', urdu: 'کاپی ناکام' }), t({ english: 'Unable to copy Order ID.', urdu: 'آرڈر آئی ڈی کی کاپی نہیں ہو سکی۔' }));
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0d5c4b" />
        <Text style={{ color: '#6b7280', marginTop: 12, fontWeight: '600' }}>Loading order...</Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 40 }}>📦</Text>
        <Text style={{ color: '#111827', fontWeight: '900', fontSize: 18, marginTop: 12 }}>Order not found</Text>
        <TouchableOpacity onPress={() => router.replace('/user-orders')} style={{ marginTop: 16, backgroundColor: '#0d5c4b', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '900' }}>My Orders</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentStatus = STATUS_CONFIG[order.status];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <LinearGradient
          colors={['#0d5c4b', '#10b981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingHorizontal: horizontalPadding }]}
        >
          <View style={[styles.headerRow, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', justifyContent: 'space-between' }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.headerTitle}>{t({ english: 'Order Details', urdu: 'آرڈر کی تفصیلات' })}</Text>
              <View style={{ marginTop: 8 }}>
                <View style={[styles.statusPill, { backgroundColor: "white", alignSelf: 'flex-start' }]}>
                  <Feather name={currentStatus.icon} size={12} color={currentStatus.fg} />
                  <Text style={[styles.statusText, { color: currentStatus.fg }]}>{t(currentStatus.label)}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/user-orders');
              }}
              style={styles.backBtn}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={t({ english: 'Back', urdu: 'واپس' })}
            >
              <Feather name="arrow-left" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: horizontalPadding, marginTop: 16 }}>
            <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', gap: 14 }}>
              {/* Order ID */}
              <View style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <View>
                    <Text style={styles.mutedSmall}>{t({ english: 'Order ID', urdu: 'آرڈر آئی ڈی' })}</Text>
                    <Text style={styles.bold}>#{order.id}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={copyOrderId}
                    activeOpacity={0.9}
                    style={styles.copyBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t({ english: 'Copy Order ID', urdu: 'آرڈر آئی ڈی کاپی کریں' })}
                  >
                    <Feather name={copied ? 'check' : 'copy'} size={18} color={copied ? '#10b981' : '#6b7280'} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Product Info */}
              <View style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={styles.emojiBox}>
                    <Text style={{ fontSize: 26 }}>🌾</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.productName} numberOfLines={2}>{order.productName}</Text>
                    <Text style={styles.muted}>{order.quantity}</Text>
                    <Text style={styles.price}>{formatPkr(order.totalPkr)}</Text>
                  </View>
                </View>
              </View>

              {/* Timeline */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{t({ english: 'Order Status Timeline', urdu: 'آرڈر کی حالت ٹائم لائن' })}</Text>
                <View style={{ gap: 12, marginTop: 10 }}>
                  {order.timeline.map((step, idx) => {
                    const isDone = step.completed;
                    return (
                      <View key={`step-${idx}`} style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ alignItems: 'center' }}>
                          <View style={[styles.stepDot, isDone ? styles.stepDotDone : styles.stepDotTodo]}>
                            <Feather name={isDone ? 'check-circle' : 'clock'} size={14} color={isDone ? '#ffffff' : '#6b7280'} />
                          </View>
                          {idx < order.timeline.length - 1 && (
                            <View style={[styles.stepLine, { backgroundColor: isDone ? '#0d5c4b' : '#e5e7eb' }]} />
                          )}
                        </View>
                        <View style={{ flex: 1, paddingBottom: 6 }}>
                          <Text style={[styles.stepLabel, { color: isDone ? '#111827' : '#6b7280' }]}>{t(step.label)}</Text>
                          <Text style={styles.mutedSmall}>{step.time}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Delivery Info */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{t({ english: 'Delivery Information', urdu: 'ترسیل کی معلومات' })}</Text>
                <View style={{ gap: 10, marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Feather name="map-pin" size={18} color="#6b7280" style={{ marginTop: 2 }} />
                    <Text style={[styles.muted, { flex: 1 }]}>
                      {order.deliveryAddress || t({ english: 'No address provided', urdu: 'پتہ فراہم نہیں کیا گیا' })}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Feather name="user" size={18} color="#6b7280" style={{ marginTop: 2 }} />
                    <Text style={[styles.muted, { flex: 1 }]}>{t({ english: 'Farmer', urdu: 'کسان' })}: {order.farmerId}</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.actionBtn, styles.actionBtnOutline]}
                    onPress={() =>
                      router.push({
                        pathname: '/community/chat/[conversationId]',
                        params: { conversationId: 'new', otherId: order.farmerId, contextType: 'direct' },
                      })
                    }
                  >
                    <Feather name="message-circle" size={16} color="#0d5c4b" />
                    <Text style={styles.actionBtnOutlineText}>{t({ english: 'Message Farmer', urdu: 'کسان کو پیغام' })}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Payment Info */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{t({ english: 'Payment Details', urdu: 'ادائیگی کی تفصیلات' })}</Text>
                <View style={{ gap: 8, marginTop: 10 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.muted}>{t({ english: 'Platform Commission', urdu: 'پلیٹ فارم کمیشن' })}</Text>
                    <Text style={styles.bold}>{formatPkr(order.commissionPkr)}</Text>
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.muted}>{t({ english: 'Service Fee', urdu: 'سروس فیس' })}</Text>
                    <Text style={styles.bold}>{formatPkr(order.serviceFee)}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>{t({ english: 'Total Paid', urdu: 'کل ادا کیا' })}</Text>
                    <Text style={styles.receive}>{formatPkr(order.totalPkr)}</Text>
                  </View>
                  <View style={styles.paymentNote}>
                    <Text style={styles.paymentNoteTitle}>
                      {t({ english: `💰 Payment: ${order.paymentStatus}`, urdu: `💰 ادائیگی: ${order.paymentStatus}` })}
                    </Text>
                    <Text style={styles.paymentNoteDesc}>
                      {t({ english: 'Funds are held in escrow and released to the farmer after delivery.', urdu: 'فنڈز ایسکرو میں محفوظ ہیں اور ترسیل کے بعد کسان کو جاری کیے جائیں گے۔' })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action: buyer marks delivered when shipped */}
              {order.status === 'shipped' && (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.primaryBtn}
                  onPress={async () => {
                    try {
                      const res = await authFetch(`/api/v1/payments/orders/${order.id}/status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'delivered' }),
                      });
                      if (res.ok) {
                        await loadOrder();
                        Alert.alert(t({ english: 'Confirmed', urdu: 'تصدیق شدہ' }), t({ english: 'Order marked as delivered.', urdu: 'آرڈر ترسیل شدہ کے طور پر نشان زد کیا گیا۔' }));
                      }
                    } catch {
                      Alert.alert(t({ english: 'Error', urdu: 'خرابی' }), t({ english: 'Could not update status.', urdu: 'حالت تازہ نہیں ہو سکی۔' }));
                    }
                  }}
                >
                  <Feather name="package" size={18} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>{t({ english: 'Confirm Delivery', urdu: 'ترسیل کی تصدیق کریں' })}</Text>
                </TouchableOpacity>
              )}

              <View style={{ height: 6 }} />
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
    paddingBottom: 28,
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

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontWeight: '900', fontSize: 11 },

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

  mutedSmall: { color: '#6b7280', fontSize: 11, fontWeight: '600' },
  muted: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  bold: { color: '#111827', fontWeight: '900', fontSize: 14 },

  copyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emojiBox: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' },
  productName: { fontWeight: '900', color: '#111827' },
  price: { color: '#0d5c4b', fontWeight: '900', marginTop: 4 },

  sectionTitle: { color: '#111827', fontWeight: '900' },

  stepDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepDotDone: { backgroundColor: '#0d5c4b' },
  stepDotTodo: { backgroundColor: '#f3f4f6' },
  stepLine: { width: 2, height: 28, marginTop: 6, borderRadius: 1 },
  stepLabel: { fontWeight: '800' },

  buyerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  divider: { height: 1, backgroundColor: '#e5e7eb', marginTop: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  actionBtn: { flex: 1, height: 40, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionBtnOutline: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff' },
  actionBtnOutlineText: { color: '#0d5c4b', fontWeight: '900' },

  receive: { color: '#0d5c4b', fontWeight: '900', fontSize: 16 },
  paymentNote: { marginTop: 10, backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 14, padding: 12 },
  paymentNoteTitle: { color: '#b45309', fontWeight: '900', fontSize: 12 },
  paymentNoteDesc: { color: '#6b7280', fontSize: 11, marginTop: 4, lineHeight: 16 },

  primaryBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#0d5c4b',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '900' },
});
