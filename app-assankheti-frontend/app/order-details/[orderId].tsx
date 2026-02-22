import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useT } from '../../contexts/LanguageContext';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered';

export default function OrderDetailsPage() {
  const t = useT();
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = (params?.orderId as string) ?? 'ORD001';

  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const [copied, setCopied] = useState(false);

  const order = useMemo(
    () => ({
      id: orderId,
      productName: 'Fresh Basmati Rice',
      quantity: '50 kg',
      price: '₨9,000',
      buyer: 'Ali Traders',
      buyerPhone: '+92 300 1234567',
      buyerAddress: 'Shop #12, Grain Market, Lahore',
      status: 'shipped' as OrderStatus,
      date: 'Dec 28, 2024',
      image: '🌾',
      timeline: [
        { status: 'pending', label: 'Order Placed', time: 'Dec 28, 10:00 AM', completed: true },
        { status: 'confirmed', label: 'Order Confirmed', time: 'Dec 28, 11:30 AM', completed: true },
        { status: 'shipped', label: 'Shipped', time: 'Dec 29, 09:00 AM', completed: true },
        { status: 'delivered', label: 'Delivered', time: 'Expected: Dec 30', completed: false },
      ],
      paymentMethod: 'Escrow',
      paymentStatus: 'Held in Escrow',
    }),
    [orderId]
  );

  const statusConfig: Record<
    OrderStatus,
    { label: string; bg: string; fg: string; icon: React.ComponentProps<typeof Feather>['name'] }
  > = {
    pending: { label: 'Pending', bg: 'rgba(245,158,11,0.16)', fg: '#f59e0b', icon: 'clock' },
    confirmed: { label: 'Confirmed', bg: 'rgba(16,185,129,0.18)', fg: '#10b981', icon: 'check-circle' },
    shipped: { label: 'Shipped', bg: 'rgba(13,92,75,0.14)', fg: '#0d5c4b', icon: 'truck' },
    delivered: { label: 'Delivered', bg: 'rgba(13,92,75,0.14)', fg: '#0d5c4b', icon: 'package' },
  };

  const currentStatus = statusConfig[order.status];

  const copyOrderId = async () => {
    try {
      await Clipboard.setStringAsync(order.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert(t({ english: 'Copy failed', urdu: 'کاپی ناکام' }), t({ english: 'Unable to copy Order ID.', urdu: 'آرڈر آئی ڈی کی کاپی نہیں ہو سکی۔' }));
    }
  };

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
              onPress={() => router.back()}
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
                    <Text style={{ fontSize: 26 }}>{order.image}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {order.productName}
                    </Text>
                    <Text style={styles.muted}>{order.quantity}</Text>
                    <Text style={styles.price}>{order.price}</Text>
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
                      <View key={`${step.status}-${idx}`} style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ alignItems: 'center' }}>
                          <View style={[styles.stepDot, isDone ? styles.stepDotDone : styles.stepDotTodo]}>
                            <Feather name={isDone ? 'check-circle' : 'clock'} size={14} color={isDone ? '#ffffff' : '#6b7280'} />
                          </View>
                          {idx < order.timeline.length - 1 ? (
                            <View style={[styles.stepLine, { backgroundColor: isDone ? '#0d5c4b' : '#e5e7eb' }]} />
                          ) : null}
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

              {/* Buyer Info */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{t({ english: 'Buyer Information', urdu: 'خرید کنندہ کی معلومات' })}</Text>

                <View style={{ gap: 10, marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <LinearGradient colors={['#fbbf24', '#f59e0b']} style={styles.buyerAvatar}>
                      <Text style={{ fontSize: 16 }}>👤</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bold}>{order.buyer}</Text>
                      <Text style={styles.mutedSmall}>{order.buyerPhone}</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Feather name="map-pin" size={18} color="#6b7280" style={{ marginTop: 2 }} />
                    <Text style={[styles.muted, { flex: 1 }]}>{order.buyerAddress}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={[styles.actionBtn, styles.actionBtnOutline]}
                      onPress={() => Alert.alert(t({ english: 'Call', urdu: 'کال' }), order.buyerPhone)}
                    >
                      <Feather name="phone" size={16} color="#0d5c4b" />
                      <Text style={styles.actionBtnOutlineText}>{t({ english: 'Call', urdu: 'کال' })}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={[styles.actionBtn, styles.actionBtnOutline]}
                      onPress={() => router.push({ pathname: '/chat/[contactId]', params: { contactId: order.buyer } })}
                    >
                      <Feather name="message-circle" size={16} color="#0d5c4b" />
                      <Text style={styles.actionBtnOutlineText}>{t({ english: 'Message', urdu: 'پیغام' })}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Payment Info */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{t({ english: 'Payment Details', urdu: 'ادائیگی کی تفصیلات' })}</Text>

                <View style={{ gap: 8, marginTop: 10 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.muted}>{t({ english: 'Subtotal', urdu: 'سب ٹوٹل' })}</Text>
                    <Text style={styles.bold}>{order.price}</Text>
                  </View>

                  <View style={styles.rowBetween}>
                    <Text style={styles.muted}>{t({ english: 'Platform Fee', urdu: 'پلیٹ فارم فیس' })}</Text>
                    <Text style={styles.bold}>₨100</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>{t({ english: "You'll Receive", urdu: 'آپ کو ملنے والا' })}</Text>
                    <Text style={styles.receive}>₨8,900</Text>
                  </View>

                  <View style={styles.paymentNote}>
                    <Text style={styles.paymentNoteTitle}>{t({ english: `💰 Payment Status: ${order.paymentStatus}`, urdu: `💰 ادائیگی کی حیثیت: ${order.paymentStatus}` })}</Text>
                    <Text style={styles.paymentNoteDesc}>{t({ english: 'Payment will be released after delivery confirmation.', urdu: 'ادائیگی حوالگی کی تصدیق کے بعد جاری کی جائے گی۔' })}</Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              {order.status === 'confirmed' ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.primaryBtn}
                  onPress={() => Alert.alert(t({ english: 'Marked', urdu: 'نشان زد' }), t({ english: 'Marked as shipped (mock).', urdu: 'شپ کے طور پر نشان زد کیا گیا (نمونہ).' }))}
                >
                  <Feather name="truck" size={18} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>{t({ english: 'Mark as Shipped', urdu: 'شپ کے طور پر نشان زد کریں' })}</Text>
                </TouchableOpacity>
              ) : null}

              {order.status === 'shipped' ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.primaryBtn}
                  onPress={() => Alert.alert(t({ english: 'Marked', urdu: 'نشان زد' }), t({ english: 'Marked as delivered (mock).', urdu: 'ترسیل کے طور پر نشان زد کیا گیا (نمونہ).' }))}
                >
                  <Feather name="package" size={18} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>{t({ english: 'Mark as Delivered', urdu: 'ترسیل کے طور پر نشان زد کریں' })}</Text>
                </TouchableOpacity>
              ) : null}

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
