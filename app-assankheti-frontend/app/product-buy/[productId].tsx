import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useT } from '@/contexts/LanguageContext';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProductBuyPage() {
  const router = useRouter();
  const t = useT();
  const params = useLocalSearchParams();
  const productId = (params?.productId as string) ?? '1';

  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const product = useMemo(
    () => ({
      id: productId,
      name: 'Fresh Basmati Rice',
      price: 180,
      unit: 'kg',
      farmer: 'Ahmad Ali',
      farmerRating: 4.8,
      farmerPhone: '+92 300 1234567',
      location: 'Gujranwala, Punjab',
      minOrder: 10,
      maxOrder: 500,
      stock: 500,
      image: '🌾',
      description:
        'Premium quality Basmati rice from Punjab farms. Fresh harvest, aromatic and long grain. Best for biryani and pulao.',
      deliveryTime: '2-3 days',
      deliveryFee: 200,
    }),
    [productId]
  );

  const [quantity, setQuantity] = useState(product.minOrder);
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const totalPrice = product.price * quantity;
  const platformFee = Math.round(totalPrice * 0.02);
  const grandTotal = totalPrice + product.deliveryFee + platformFee;

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < product.minOrder) return prev;
      if (next > product.maxOrder) return prev;
      return next;
    });
  };

  const handleBuy = () => {
    router.push('/user-orders');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f1e8' }}>
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={['#0d5c4b', '#10b981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingHorizontal: horizontalPadding }]}
        >
          <View style={[styles.headerRow, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', justifyContent: 'space-between' }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.headerTitle}>{t({ english: 'Buy Product', urdu: 'مصنوعات خریدیں' })}</Text>
              <Text style={styles.headerSub}>{t({ english: 'Purchase from farmer', urdu: 'کسان سے خریداری' })}</Text>
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
            <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', gap: 16 }}>
              {/* Product Card */}
              <View style={styles.card}>
                <View style={styles.productImgArea}>
                  <Text style={{ fontSize: 64 }}>{product.image}</Text>
                </View>

                <View style={{ padding: 14 }}>
                  <Text style={styles.productName}>{product.name}</Text>

                  <View style={styles.metaRow}>
                    <Feather name="star" size={14} color="#f59e0b" />
                    <Text style={styles.metaText}>{product.farmerRating}</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaText}>{product.location}</Text>
                  </View>

                  <Text style={styles.price}>
                    ₨{product.price}
                    <Text style={styles.unit}>/{product.unit}</Text>
                  </Text>

                  <Text style={styles.desc}>{product.description}</Text>
                </View>
              </View>

              {/* Farmer Info */}
              <View style={styles.cardPad}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <LinearGradient colors={['#0d5c4b', '#10b981']} style={styles.farmerAvatar}>
                    <Text style={{ fontSize: 18 }}>👨‍🌾</Text>
                  </LinearGradient>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.farmerName}>{product.farmer}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Feather name="star" size={12} color="#f59e0b" />
                      <Text style={styles.farmerMeta}>{product.farmerRating} Rating</Text>
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.farmerMeta}>Verified Farmer</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.iconCircle}
                      onPress={() => router.push({ pathname: '/call/[contactId]', params: { contactId: product.farmer } })}
                      accessibilityRole="button"
                      accessibilityLabel="Call Farmer"
                    >
                      <Feather name="phone" size={18} color="#10b981" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={[styles.iconCircle, { backgroundColor: 'rgba(13,92,75,0.10)' }]}
                      onPress={() => router.push({ pathname: '/chat/[contactId]', params: { contactId: product.farmer } })}
                      accessibilityRole="button"
                      accessibilityLabel="Chat Farmer"
                    >
                      <Feather name="message-circle" size={18} color="#0d5c4b" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Quantity Selector */}
              <View style={styles.cardPad}>
                <Text style={styles.label}>
                  Quantity <Text style={styles.labelMuted}>/ مقدار</Text>
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => handleQuantityChange(-10)}
                      style={[styles.qtyBtn, quantity <= product.minOrder ? styles.qtyBtnDisabled : null]}
                      activeOpacity={0.9}
                      disabled={quantity <= product.minOrder}
                    >
                      <Feather name="minus" size={18} color="#111827" />
                    </TouchableOpacity>

                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.qtyValue}>{quantity}</Text>
                      <Text style={styles.qtyUnit}>{product.unit}</Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleQuantityChange(10)}
                      style={[styles.qtyBtn, styles.qtyBtnPlus, quantity >= product.maxOrder ? styles.qtyBtnDisabled : null]}
                      activeOpacity={0.9}
                      disabled={quantity >= product.maxOrder}
                    >
                      <Feather name="plus" size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.qtyPrice}>₨{totalPrice.toLocaleString()}</Text>
                    <Text style={styles.qtyHint}>
                      Min: {product.minOrder} {product.unit}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Delivery Address */}
              <View style={styles.cardPad}>
                <Text style={styles.label}>
                  Delivery Address <Text style={styles.labelMuted}>/ پتہ</Text>
                </Text>

                <View style={styles.addressWrap}>
                  <Feather name="map-pin" size={18} color="#6b7280" style={styles.addressIcon} />
                  <TextInput
                    value={deliveryAddress}
                    onChangeText={setDeliveryAddress}
                    placeholder="Enter complete delivery address..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    textAlignVertical="top"
                    style={styles.addressInput}
                  />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <Feather name="truck" size={14} color="#6b7280" />
                  <Text style={styles.deliveryMeta}>Delivery in {product.deliveryTime}</Text>
                </View>
              </View>

              {/* Order Summary */}
              <View style={styles.cardPad}>
                <Text style={styles.summaryTitle}>Order Summary</Text>

                <View style={{ gap: 8 }}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Subtotal ({quantity} {product.unit})
                    </Text>
                    <Text style={styles.summaryValue}>₨{totalPrice.toLocaleString()}</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Delivery Fee</Text>
                    <Text style={styles.summaryValue}>₨{product.deliveryFee}</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Platform Fee (2%)</Text>
                    <Text style={styles.summaryValue}>₨{platformFee}</Text>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryTotal}>Total</Text>
                    <Text style={styles.summaryTotalValue}>₨{grandTotal.toLocaleString()}</Text>
                  </View>
                </View>
              </View>

              {/* Escrow Info */}
              <View style={styles.escrowCard}>
                <Feather name="shield" size={20} color="#10b981" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.escrowTitle}>Secure Escrow Payment</Text>
                  <Text style={styles.escrowDesc}>
                    Your payment is held securely until you confirm receipt of the product. Full protection against fraud.
                  </Text>
                </View>
              </View>

              {/* Buy Button */}
              <TouchableOpacity activeOpacity={0.9} style={styles.buyCta} onPress={handleBuy}>
                <Text style={styles.buyCtaText}>Place Order • ₨{grandTotal.toLocaleString()}</Text>
              </TouchableOpacity>

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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  cardPad: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },

  productImgArea: { height: 160, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 18, fontWeight: '900', color: '#111827' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  metaText: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  metaDot: { color: '#9ca3af', fontSize: 12, fontWeight: '900' },
  price: { marginTop: 10, fontSize: 22, fontWeight: '900', color: '#0d5c4b' },
  unit: { fontSize: 12, color: '#6b7280', fontWeight: '700' },
  desc: { marginTop: 10, color: '#6b7280', fontSize: 12, lineHeight: 18 },

  farmerAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  farmerName: { fontWeight: '900', color: '#111827' },
  farmerMeta: { color: '#6b7280', fontSize: 11, fontWeight: '600' },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16,185,129,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: { fontWeight: '800', color: '#111827', fontSize: 13 },
  labelMuted: { color: '#6b7280', fontWeight: '700' },

  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnPlus: { backgroundColor: '#0d5c4b' },
  qtyBtnDisabled: { opacity: 0.5 },
  qtyValue: { fontSize: 22, fontWeight: '900', color: '#111827' },
  qtyUnit: { fontSize: 12, color: '#6b7280', marginTop: 2, fontWeight: '700' },
  qtyPrice: { fontSize: 18, fontWeight: '900', color: '#0d5c4b' },
  qtyHint: { fontSize: 11, color: '#6b7280', marginTop: 4, fontWeight: '600' },

  addressWrap: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    paddingLeft: 40,
    paddingRight: 12,
    paddingVertical: 10,
    minHeight: 86,
  },
  addressIcon: { position: 'absolute', left: 12, top: 12 },
  addressInput: { fontSize: 13, color: '#111827', flex: 1 },
  deliveryMeta: { color: '#6b7280', fontSize: 12, fontWeight: '600' },

  summaryTitle: { fontWeight: '900', color: '#111827', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  summaryValue: { color: '#111827', fontSize: 12, fontWeight: '800' },
  summaryDivider: { height: 1, backgroundColor: '#e5e7eb', marginTop: 6 },
  summaryTotal: { color: '#111827', fontSize: 14, fontWeight: '900' },
  summaryTotalValue: { color: '#0d5c4b', fontSize: 16, fontWeight: '900' },

  escrowCard: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  escrowTitle: { fontWeight: '900', color: '#111827' },
  escrowDesc: { color: '#6b7280', fontSize: 12, lineHeight: 18, marginTop: 4 },

  buyCta: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#0d5c4b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyCtaText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
});
