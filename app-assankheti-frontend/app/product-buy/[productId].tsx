import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { useT } from '@/contexts/LanguageContext';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authFetch } from '@/lib/authFetch';
import { getProduct, normalizeProductImageUrl, type ProductListing } from '@/lib/productsApi';

type BuyProduct = {
  id: string;
  name: string;
  price: number;
  unit: string;
  farmer: string;
  farmerId: string;
  farmerRating: number;
  location: string;
  minOrder: number;
  maxOrder: number;
  stock: number;
  image: string;
  description: string;
  deliveryTime: string;
  deliveryFee: number;
};

function categoryEmoji(category?: string) {
  if (category === 'grains') return '🌾';
  if (category === 'veggies') return '🥬';
  if (category === 'fruits') return '🍎';
  return '🌿';
}

function farmerLabel(farmerId?: string) {
  if (!farmerId) return 'Verified Farmer';
  const digits = farmerId.replace(/\D/g, '');
  if (digits.length >= 4) return `Farmer ···${digits.slice(-4)}`;
  return farmerId.replace(/^device:/, 'Farmer ');
}

// Returns the correct deep-link URL for the current run environment.
// In Expo Go: exp://IP:PORT/--/payment  (intercepted by Expo Go on Android/iOS)
// In standalone: assankhetiapp://payment  (intercepted by the installed app)
function getAppRedirectUrl(): string {
  const c = Constants as any;
  const host =
    c.expoGoConfig?.debuggerHost ??
    c.manifest2?.debuggerHost ??
    c.manifest?.debuggerHost ??
    null;
  console.log('[getAppRedirectUrl] debuggerHost =', host);
  if (host) return `exp://${host}/--/payment`;
  return 'assankhetiapp://payment';
}

function parseMinimumOrder(value?: string | null) {
  const parsed = Number(String(value ?? '').match(/\d+/)?.[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function toBuyProduct(product: ProductListing): BuyProduct {
  const minOrder = parseMinimumOrder(product.min_order);
  const stock = Math.max(product.stock || minOrder, minOrder);
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    unit: product.unit,
    farmer: farmerLabel(product.farmer_id),
    farmerId: product.farmer_id,
    farmerRating: 4.8,
    location: product.delivery_area || 'Delivery area not specified',
    minOrder,
    maxOrder: stock,
    stock,
    image: normalizeProductImageUrl(product.images?.[0]) ?? categoryEmoji(product.category),
    description: product.description || 'Fresh farm product listed directly by a verified Assan Kheti farmer.',
    deliveryTime: '2-3 days',
    deliveryFee: 200,
  };
}

export default function ProductBuyPage() {
  const router = useRouter();
  const t = useT();
  const params = useLocalSearchParams();
  const productId = (params?.productId as string) ?? '1';

  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const [product, setProduct] = useState<BuyProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadProduct() {
      setIsLoading(true);
      setError(null);
      try {
        const row = await getProduct(productId);
        const nextProduct = toBuyProduct(row);
        if (!cancelled) {
          setProduct(nextProduct);
          setQuantity(nextProduct.minOrder);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Product not found');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadProduct();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const totalPrice = product ? product.price * quantity : 0;
  const platformFee = Math.round(totalPrice * 0.02);
  const grandTotal = totalPrice + (product?.deliveryFee ?? 0) + platformFee;

  const handleQuantityChange = (delta: number) => {
    if (!product) return;
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < product.minOrder) return prev;
      if (next > product.maxOrder) return prev;
      return next;
    });
  };

  const handleBuy = async () => {
    if (!deliveryAddress.trim()) {
      Alert.alert('Address Required', 'Please enter your delivery address to continue.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      // 1. Build the deep-link URL for the current environment.
      //    The backend's /payment-complete page will JS-redirect to this URL,
      //    causing the OS to close the browser and return to the app.
      const redirectUrl = getAppRedirectUrl();

      // 2. Create Stripe checkout session, passing the redirect URL
      const res = await authFetch('/api/v1/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product!.id,
          quantity,
          delivery_address: deliveryAddress.trim(),
          redirect_url: redirectUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || 'Could not create order. Please try again.');
      }

      const { order_id, session_id, checkout_url } = await res.json();

      // 3. iOS safety net: if SFSafariViewController doesn't auto-close when the
      //    custom scheme fires, dismiss it programmatically via Linking event.
      const linkingSub = Linking.addEventListener('url', () => {
        WebBrowser.dismissBrowser();
      });

      // 4. Open Stripe hosted checkout in the in-app browser.
      //    On Android (Chrome Custom Tab) the OS intercepts assankhetiapp:// and
      //    closes the tab automatically.  On iOS the Linking listener above handles it.
      await WebBrowser.openBrowserAsync(checkout_url, {
        dismissButtonStyle: 'close',
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      });

      linkingSub.remove();

      // 5. Browser closed — verify payment with Stripe (backend retries 3× internally).
      //    If the server returns a 5xx, retry once on the client side after a short delay.
      console.log('[confirm-payment] calling order=', order_id, 'session=', session_id);
      const confirmUrl = `/api/v1/payments/orders/${order_id}/confirm-payment?session_id=${encodeURIComponent(session_id)}`;
      let confirmRes = await authFetch(confirmUrl, { method: 'POST' });
      if (!confirmRes.ok) {
        await new Promise<void>(resolve => setTimeout(resolve, 3000));
        confirmRes = await authFetch(confirmUrl, { method: 'POST' });
      }

      if (!confirmRes.ok) {
        Alert.alert(
          'Verification Failed',
          'We could not verify your payment right now. Please check My Orders — if the payment went through, your order will appear there.',
          [{ text: 'OK' }],
        );
        return;
      }

      const confirm = await confirmRes.json();

      if (confirm.payment_confirmed) {
        router.replace({
          pathname: '/order-details/[orderId]',
          params: { orderId: order_id },
        });
      } else {
        Alert.alert(
          'Payment Not Completed',
          'Your payment was not completed. You can try again.',
          [{ text: 'OK' }],
        );
      }
    } catch (e: unknown) {
      if ((e as Error)?.message === 'SESSION_EXPIRED') return;
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <ActivityIndicator size="large" color="#0d5c4b" />
        <Text style={styles.stateText}>Loading farmer product...</Text>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <Text style={{ fontSize: 44 }}>⚠️</Text>
        <Text style={styles.stateTitle}>Product unavailable</Text>
        <Text style={styles.stateText}>{error || 'This farmer product could not be loaded.'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.stateButton} activeOpacity={0.9}>
          <Text style={styles.stateButtonText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
                  {product.image.startsWith('http') || product.image.startsWith('file:') ? (
                    <Image source={{ uri: product.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <Text style={{ fontSize: 64 }}>{product.image}</Text>
                  )}
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

                </View>

                {/* Message Farmer */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.messageBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/community/chat/[conversationId]',
                      params: {
                        conversationId: 'new',
                        otherId: product.farmerId,
                        contextType: 'product',
                        contextRef: String(product.id),
                        productName: product.name,
                        productPrice: String(product.price),
                        productUnit: product.unit,
                        productEmoji: product.image,
                      },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={t({ english: 'Message Farmer', urdu: 'کسان کو پیغام' })}
                >
                  <Feather name="message-circle" size={16} color="#0d5c4b" />
                  <Text style={styles.messageBtnText}>
                    {t({ english: 'Message Farmer', urdu: 'کسان کو پیغام' })}
                  </Text>
                </TouchableOpacity>
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
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.buyCta, isPlacingOrder && { opacity: 0.7 }]}
                onPress={handleBuy}
                disabled={isPlacingOrder}
              >
                {isPlacingOrder ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buyCtaText}>Place Order • ₨{grandTotal.toLocaleString()}</Text>
                )}
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
  stateScreen: {
    flex: 1,
    backgroundColor: '#f5f1e8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  stateTitle: { color: '#111827', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  stateText: { color: '#6b7280', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  stateButton: { backgroundColor: '#0d5c4b', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  stateButtonText: { color: '#fff', fontWeight: '900' },
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

  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginHorizontal: 14,
    marginBottom: 14,
  },
  messageBtnText: { color: '#0d5c4b', fontWeight: '900', fontSize: 13 },
});
