import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage, useT } from '@/contexts/LanguageContext';
import ThreeDotMenu from '@/components/ThreeDotMenu';
import DeleteConfirmation from '@/components/DeleteConfirmation';
import {
  deleteProduct as deleteProductApi,
  getProductOwnerId,
  listFarmerProducts,
  type ProductListing,
  type ProductStatus,
} from '@/lib/productsApi';

type Product = ProductListing & { image?: string };

export default function FarmerProductsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { textLanguage, voiceLanguage } = useLanguage();
  const { width } = useWindowDimensions();
  const isTiny = width < 350;
  const isCompact = width < 390;
  const horizontalPadding = Math.max(16, Math.min(26, Math.round(width * 0.055)));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 540);

  const initialProducts = useMemo<Product[]>(
    () => [
      { id: 'demo-1', farmer_id: 'demo', name: 'Fresh Basmati Rice', category: 'grains', price: 180, unit: 'kg', stock: 500, status: 'active', views: 234, images: [], image: '🌾' },
      { id: 'demo-2', farmer_id: 'demo', name: 'Premium Rice - 50kg', category: 'grains', price: 2250, unit: 'bag', stock: 50, status: 'active', views: 156, images: [], image: '🌾' },
      { id: 'demo-3', farmer_id: 'demo', name: 'Rice Bran - 25kg', category: 'grains', price: 800, unit: 'bag', stock: 0, status: 'sold', views: 89, images: [], image: '🌾' },
      { id: 'demo-4', farmer_id: 'demo', name: 'Organic Rice', category: 'grains', price: 220, unit: 'kg', stock: 100, status: 'draft', views: 0, images: [], image: '🌾' },
    ],
    []
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [farmerId, setFarmerId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const totalViews = products.reduce((sum, product) => sum + product.views, 0);
  const activeCount = products.filter((product) => product.status === 'active').length;

  const statusConfig: Record<ProductStatus, { label: string; bg: string; fg: string }> = {
    active: { label: 'Active', bg: 'rgba(16,185,129,0.18)', fg: '#10b981' },
    sold: { label: 'Sold Out', bg: 'rgba(239,68,68,0.16)', fg: '#ef4444' },
    draft: { label: 'Draft', bg: 'rgba(107,114,128,0.14)', fg: '#6b7280' },
  };

  const pushEdit = (p: Product) => {
    router.push({
      pathname: '/add-product',
      params: {
        mode: 'edit',
        productId: p.id,
        name: p.name,
        price: String(p.price),
        unit: p.unit,
        stock: String(p.stock),
        category: p.category,
        minOrder: p.min_order ?? '',
        deliveryArea: p.delivery_area ?? '',
        description: p.description ?? '',
        images: JSON.stringify(p.images ?? []),
        isLocalFallback: isFallback ? '1' : '0',
        textLanguage,
        voiceLanguage,
      },
    });
  };
  const [menuProduct, setMenuProduct] = useState<Product | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setIsLoading(true);
      try {
        const ownerId = await getProductOwnerId();
        const remoteProducts = await listFarmerProducts(ownerId);
        if (cancelled) return;

        setFarmerId(ownerId);
        setProducts(remoteProducts);
        setIsFallback(false);
      } catch {
        if (cancelled) return;
        setProducts(initialProducts);
        setIsFallback(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [initialProducts]);

  const openActions = (p: Product) => {
    setMenuProduct(p);
    setMenuVisible(true);
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace({ pathname: '/farmer-dashboard', params: { tab: 'profile', textLanguage, voiceLanguage } });
  };

  const t = useT();
  const formatPrice = (price: number) => `Rs${Number(price || 0).toLocaleString('en-PK')}`;
  const addProductParams = { textLanguage, voiceLanguage, farmerId };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <LinearGradient
          colors={['#0d5c4b', '#10b981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, isTiny ? styles.headerTiny : null, { paddingHorizontal: horizontalPadding }]}
        >
          <View style={[styles.headerRow, isTiny ? styles.headerRowTiny : null, { maxWidth: contentMaxWidth }]}>
            <TouchableOpacity
              onPress={goBack}
              activeOpacity={0.9}
              style={[styles.backBtnHeader, isTiny ? styles.headerCircleTiny : null]}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t({ english: 'Back', urdu: 'واپس' })}
            >
              <Feather name="arrow-left" size={isTiny ? 17 : 18} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.headerCopy}>
              <Text style={[styles.headerTitle, isTiny ? styles.headerTitleTiny : null]} numberOfLines={1}>
                {t({ english: 'My Products', urdu: 'میری مصنوعات' })}
              </Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {t({ english: 'Your published listings', urdu: 'آپ کی شایع کردہ فہرستیں' })}
              </Text>
            </View>

            <View style={[styles.headerActions, isTiny ? styles.headerActionsTiny : null]}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/add-product', params: addProductParams })}
                style={[styles.addBtnInline, isTiny ? styles.headerCircleTiny : null]}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t({ english: 'Add product', urdu: 'مصنوعات شامل کریں' })}
              >
                <Feather name="plus" size={isTiny ? 15 : 16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={{ paddingBottom: Math.max(132, insets.bottom + 124) }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: horizontalPadding, marginTop: -18 }}>
            <View style={[styles.statsCard, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
              {[
                { key: 'total', label: { english: 'Products', urdu: 'مصنوعات' }, value: String(products.length), icon: 'package', color: '#0d5c4b' },
                { key: 'active', label: { english: 'Active', urdu: 'فعال' }, value: String(activeCount), icon: 'check-circle', color: '#10b981' },
                { key: 'views', label: { english: 'Views', urdu: 'ملاحظات' }, value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : String(totalViews), icon: 'eye', color: '#f59e0b' },
              ].map((s) => (
                <View key={s.key} style={styles.statItem}>
                  <View style={[styles.statIcon, isTiny ? styles.statIconTiny : null]}>
                    <Feather name={s.icon as any} size={isTiny ? 15 : 16} color={s.color} />
                  </View>
                  <Text style={[styles.statValue, isTiny ? styles.statValueTiny : null]} numberOfLines={1}>
                    {s.value}
                  </Text>
                  <Text style={styles.statLabel} numberOfLines={1}>
                    {t(s.label)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ paddingHorizontal: horizontalPadding, marginTop: 18 }}>
            <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
              <View style={styles.listHeader}>
                <Text style={[styles.listTitle, isTiny ? styles.listTitleTiny : null]} numberOfLines={1}>
                  {t({ english: 'Your Listings', urdu: 'آپ کی فہرستیں' })}
                </Text>
                <Text style={styles.listCount} numberOfLines={1}>
                  {products.length} {t({ english: 'items', urdu: 'آئٹمز' })}
                </Text>
              </View>

              {isLoading ? (
                <View style={styles.loadingCard}>
                  <ActivityIndicator color="#0d5c4b" />
                  <Text style={styles.loadingText}>
                    {t({ english: 'Loading your listings...', urdu: 'آپ کی فہرستیں لوڈ ہو رہی ہیں...' })}
                  </Text>
                </View>
              ) : null}

              {!isLoading && isFallback ? (
                <View style={styles.noticeCard}>
                  <Feather name="wifi-off" size={16} color="#b54708" />
                  <Text style={styles.noticeText} numberOfLines={2}>
                    {t({
                      english: 'Backend is offline. Showing sample listings for preview.',
                      urdu: 'بیک اینڈ آف لائن ہے۔ پیش نظارہ کے لیے نمونہ فہرستیں دکھائی جا رہی ہیں۔',
                    })}
                  </Text>
                </View>
              ) : null}

              {!isLoading && !isFallback && products.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <Feather name="package" size={24} color="#0d5c4b" />
                  </View>
                  <Text style={styles.emptyTitle}>{t({ english: 'No products yet', urdu: 'ابھی کوئی مصنوعات نہیں' })}</Text>
                  <Text style={styles.emptySub}>
                    {t({ english: 'Add your first listing and start selling directly.', urdu: 'اپنی پہلی فہرست شامل کریں اور براہ راست فروخت شروع کریں۔' })}
                  </Text>
                </View>
              ) : null}

              <View style={{ gap: 14 }}>
                {products.map((p) => {
                  const status = statusConfig[p.status];
                  return (
                    <View key={p.id} style={[styles.card, isTiny ? styles.cardTiny : null]}>
                      <View style={[styles.cardRow, isTiny ? styles.cardRowTiny : null]}>
                        <View style={[styles.emojiBox, isTiny ? styles.emojiBoxTiny : null]}>
                          {p.images?.[0] ? (
                            <Image source={{ uri: p.images[0] }} style={styles.productImage} />
                          ) : (
                            <Text style={{ fontSize: isTiny ? 24 : 28 }}>{p.image ?? '🌾'}</Text>
                          )}
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={styles.productTitleRow}>
                            <Text style={[styles.productName, isTiny ? styles.productNameTiny : null]} numberOfLines={2}>
                              {p.name}
                            </Text>
                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={() => openActions(p)}
                              accessibilityRole="button"
                              accessibilityLabel={`Product actions ${p.name}`}
                              style={styles.moreBtn}
                            >
                              <Feather name="more-vertical" size={16} color="#6b7280" />
                            </TouchableOpacity>
                          </View>

                          <Text style={[styles.price, isTiny ? styles.priceTiny : null]} numberOfLines={1}>
                            {formatPrice(p.price)}
                            <Text style={styles.unit}> /{p.unit}</Text>
                          </Text>

                          <View style={styles.metaRow}>
                            <Text style={styles.meta} numberOfLines={1}>Stock: {p.stock}</Text>
                            <View style={styles.metaInline}>
                              <Feather name="eye" size={12} color="#6b7280" />
                              <Text style={styles.meta} numberOfLines={1}>{p.views}</Text>
                            </View>
                            <View style={[styles.statusPill, { backgroundColor: status.bg }]}
                            >
                              <Text style={[styles.statusText, { color: status.fg }]} numberOfLines={1}>
                                {status.label}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <View style={[styles.cardActions, isTiny ? styles.cardActionsTiny : null]}>
                          <TouchableOpacity
                            activeOpacity={0.9}
                            style={[styles.editBtn, isTiny ? styles.editBtnTiny : null]}
                            onPress={() => pushEdit(p)}
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${p.name}`}
                          >
                            <Feather name="edit-3" size={14} color="#0d5c4b" />
                            <Text style={styles.editBtnText}>{t({ english: 'Edit', urdu: 'ترمیم کریں' })}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            activeOpacity={0.9}
                            style={[styles.trashBtn, isTiny ? styles.trashBtnTiny : null]}
                            onPress={() => setDeleteProduct(p)}
                            accessibilityRole="button"
                            accessibilityLabel={`Delete ${p.name}`}
                          >
                            <Feather name="trash-2" size={14} color="#ef4444" />
                          </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </ScrollView>
        <ThreeDotMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          title={menuProduct?.name}
          subtitle={t({ english: 'Choose action', urdu: 'ایکشن منتخب کریں' })}
          options={[
            { key: 'edit', icon: 'edit-3', label: t({ english: 'Edit', urdu: 'ترمیم کریں' }), onPress: () => menuProduct && pushEdit(menuProduct) },
            { key: 'delete', icon: 'trash-2', label: t({ english: 'Delete', urdu: 'حذف کریں' }), destructive: true, onPress: () => menuProduct && setDeleteProduct(menuProduct) },
          ]}
        />

        <DeleteConfirmation
          visible={!!deleteProduct}
          onCancel={() => setDeleteProduct(null)}
          onConfirm={() => {
            if (!deleteProduct || isDeleting) return;

            const productToDelete = deleteProduct;
            setIsDeleting(true);
            (async () => {
              try {
                if (!isFallback) await deleteProductApi(productToDelete.id);
                setProducts((prev) => prev.filter((x) => x.id !== productToDelete.id));
                setDeleteProduct(null);
                setMenuVisible(false);
              } catch (error) {
                Alert.alert(
                  t({ english: 'Delete failed', urdu: 'حذف نہیں ہوا' }),
                  error instanceof Error ? error.message : t({ english: 'Please try again.', urdu: 'دوبارہ کوشش کریں۔' })
                );
              } finally {
                setIsDeleting(false);
              }
            })();
          }}
          title={isDeleting ? t({ english: 'Deleting...', urdu: 'حذف ہو رہا ہے...' }) : t({ english: 'Delete product', urdu: 'مصنوعات حذف کریں' })}
          message={t({ english: 'This will remove the product from your listings.', urdu: 'یہ مصنوعات کو آپ کی فہرست سے ہٹا دے گا۔' })}
        />
        {/* Bottom Add New button */}
        <View style={[styles.bottomWrap, { bottom: Math.max(14, insets.bottom + 10) }]} pointerEvents="box-none">
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: horizontalPadding }}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.addNewBottom, isCompact ? styles.addNewBottomCompact : null]}
                onPress={() => router.push({ pathname: '/add-product', params: addProductParams })}
              >
                <Feather name="plus" size={16} color="#ffffff" />
                <Text style={styles.addNewBottomText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>
                  {t({ english: 'Add New Product', urdu: 'نئی مصنوعات شامل کریں' })}
                </Text>
              </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0d5c4b' },
  screen: { flex: 1, backgroundColor: '#f7faf6' },
  header: {
    paddingTop: 18,
    paddingBottom: 36,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTiny: { paddingTop: 14, paddingBottom: 32, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerRowTiny: { gap: 9 },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  headerTitleTiny: { fontSize: 18 },
  headerSub: { color: 'rgba(255,255,255,0.75)', marginTop: 2, fontSize: 13 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerActionsTiny: { gap: 8 },
  addBtnInline: { width: 40, height: 40, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  backBtnHeader: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerCircleTiny: { width: 36, height: 36, borderRadius: 14 },

  bottomWrap: { position: 'absolute', left: 0, right: 0 },
  addNewBottom: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#0d5c4b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#0d5c4b',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 8,
  },
  addNewBottomCompact: { height: 52, borderRadius: 16 },
  addNewBottomText: { color: '#ffffff', fontWeight: '900', fontSize: 15 },

  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.06)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center', minWidth: 0 },
  statIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(17,24,39,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statIconTiny: { width: 34, height: 34, borderRadius: 12 },
  statValue: { fontWeight: '900', color: '#111827', fontSize: 16 },
  statValueTiny: { fontSize: 15 },
  statLabel: { color: '#6b7280', fontSize: 10, marginTop: 2, textAlign: 'center' },

  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  listTitle: { flex: 1, fontSize: 20, fontWeight: '900', color: '#111827' },
  listTitleTiny: { fontSize: 18 },
  listCount: { color: '#667085', fontSize: 12, fontWeight: '800' },
  loadingCard: {
    minHeight: 84,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.06)',
  },
  loadingText: { color: '#667085', fontSize: 12, fontWeight: '800' },
  noticeCard: {
    borderRadius: 16,
    backgroundColor: '#fffaeb',
    borderWidth: 1,
    borderColor: '#fedf89',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: { flex: 1, minWidth: 0, color: '#b54708', fontSize: 12, lineHeight: 17, fontWeight: '800' },
  emptyCard: {
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    padding: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.06)',
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#ecfdf3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { color: '#111827', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptySub: { color: '#667085', marginTop: 6, fontSize: 12, lineHeight: 18, fontWeight: '700', textAlign: 'center' },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.04)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  cardTiny: { borderRadius: 18 },
  cardRow: { flexDirection: 'row', gap: 12, padding: 14 },
  cardRowTiny: { gap: 10, padding: 12 },
  emojiBox: { width: 66, height: 66, borderRadius: 18, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  emojiBoxTiny: { width: 56, height: 56, borderRadius: 16 },
  productImage: { width: '100%', height: '100%' },
  productTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  productName: { fontWeight: '900', color: '#111827', flex: 1, fontSize: 15, lineHeight: 20 },
  productNameTiny: { fontSize: 14, lineHeight: 19 },
  moreBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  price: { fontWeight: '900', color: '#0d5c4b', fontSize: 16, marginTop: 2 },
  priceTiny: { fontSize: 15 },
  unit: { fontWeight: '600', color: '#6b7280', fontSize: 11 },
  meta: { color: '#6b7280', fontSize: 11 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7, flexWrap: 'wrap' },
  metaInline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '800' },

  cardActions: { paddingHorizontal: 14, paddingBottom: 14, flexDirection: 'row', gap: 10 },
  cardActionsTiny: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  editBtn: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  editBtnTiny: { height: 38, borderRadius: 13 },
  editBtnText: { color: '#0d5c4b', fontWeight: '900', fontSize: 12 },
  trashBtn: {
    width: 46,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.10)',
  },
  trashBtnTiny: { width: 42, height: 38, borderRadius: 13 },
});
