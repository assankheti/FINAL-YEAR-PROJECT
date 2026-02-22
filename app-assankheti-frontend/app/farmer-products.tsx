import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT } from '@/contexts/LanguageContext';
import ThreeDotMenu from '@/components/ThreeDotMenu';
import DeleteConfirmation from '@/components/DeleteConfirmation';

type ProductStatus = 'active' | 'sold' | 'draft';

type Product = {
  id: string;
  name: string;
  price: string;
  unit: string;
  stock: number;
  status: ProductStatus;
  views: number;
  image: string;
};

export default function FarmerProductsPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const initialProducts = useMemo<Product[]>(
    () => [
      { id: '1', name: 'Fresh Basmati Rice', price: '₨180', unit: '/kg', stock: 500, status: 'active', views: 234, image: '🌾' },
      { id: '2', name: 'Premium Rice - 50kg', price: '₨2,250', unit: '/bag', stock: 50, status: 'active', views: 156, image: '🌾' },
      { id: '3', name: 'Rice Bran - 25kg', price: '₨800', unit: '/bag', stock: 0, status: 'sold', views: 89, image: '🌾' },
      { id: '4', name: 'Organic Rice', price: '₨220', unit: '/kg', stock: 100, status: 'draft', views: 0, image: '🌾' },
    ],
    []
  );

  const [products, setProducts] = useState<Product[]>(initialProducts);

  const statusConfig: Record<ProductStatus, { label: string; bg: string; fg: string }> = {
    active: { label: 'Active', bg: 'rgba(16,185,129,0.18)', fg: '#10b981' },
    sold: { label: 'Sold Out', bg: 'rgba(239,68,68,0.16)', fg: '#ef4444' },
    draft: { label: 'Draft', bg: 'rgba(107,114,128,0.14)', fg: '#6b7280' },
  };

  const pushEdit = (p: Product) => {
    const unit = p.unit.replace('/', '').trim();
    const price = p.price.replace(/[^0-9.]/g, '');
    router.push({
      pathname: '/add-product',
      params: {
        mode: 'edit',
        productId: p.id,
        name: p.name,
        price,
        unit,
        stock: String(p.stock),
      },
    });
  };
  const [menuProduct, setMenuProduct] = useState<Product | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const openActions = (p: Product) => {
    setMenuProduct(p);
    setMenuVisible(true);
  };

  const confirmDelete = (p: Product) => {
    // show themed confirmation modal
    setDeleteProduct(p);
  };

  const t = useT();

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
          <View style={[styles.headerRow, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}> 
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{t({ english: 'My Products', urdu: 'میری مصنوعات' })}</Text>
              <Text style={styles.headerSub}>{t({ english: 'Your published listings', urdu: 'آپ کی شایع کردہ فہرستیں' })}</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/add-product')} style={styles.addBtnInline}>
                <Feather name="plus" size={14} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.replace({ pathname: '/farmer-dashboard', params: { tab: 'profile' } })}
                activeOpacity={0.9}
                style={styles.backBtnHeader}
              >
                <Feather name="arrow-left" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={{ paddingHorizontal: horizontalPadding, marginTop: -18 }}>
            <View style={[styles.statsCard, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
              {[
                { key: 'total', label: { english: 'Total Products', urdu: 'مجموعی مصنوعات' }, value: '12', icon: 'package', color: '#0d5c4b' },
                { key: 'active', label: { english: 'Active Listings', urdu: 'فعال فہرستیں' }, value: '8', icon: 'eye', color: '#10b981' },
                { key: 'views', label: { english: 'Total Views', urdu: 'کل ملاحظات' }, value: '1.2K', icon: 'eye', color: '#f59e0b' },
              ].map((s) => (
                <View key={s.key} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(17,24,39,0.05)' }]}>
                    <Feather name={s.icon as any} size={16} color={s.color} />
                  </View>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{t(s.label)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* List */}
          <View style={{ paddingHorizontal: horizontalPadding, marginTop: 18 }}>
            <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
              <Text style={styles.listTitle}>{t({ english: 'Your Listings', urdu: 'آپ کی فہرستیں' })}</Text>

              <View style={{ gap: 14 }}>
                {products.map((p) => {
                  const status = statusConfig[p.status];
                  return (
                    <View key={p.id} style={styles.card}>
                      <View style={styles.cardRow}>
                        <View style={styles.emojiBox}>
                          <Text style={{ fontSize: 28 }}>{p.image}</Text>
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                            <Text style={styles.productName} numberOfLines={2}>
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

                          <Text style={styles.price}>
                            {p.price}
                            <Text style={styles.unit}> {p.unit}</Text>
                          </Text>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.meta}>Stock: {p.stock}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Feather name="eye" size={12} color="#6b7280" />
                              <Text style={styles.meta}>{p.views}</Text>
                            </View>
                            <View style={[styles.statusPill, { backgroundColor: status.bg }]}
                            >
                              <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <View style={styles.cardActions}>
                          <TouchableOpacity
                            activeOpacity={0.9}
                            style={styles.editBtn}
                            onPress={() => pushEdit(p)}
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${p.name}`}
                          >
                            <Feather name="edit-3" size={14} color="#0d5c4b" />
                            <Text style={styles.editBtnText}>{t({ english: 'Edit', urdu: 'ترمیم کریں' })}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            activeOpacity={0.9}
                            style={styles.trashBtn}
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
            if (deleteProduct) setProducts((prev) => prev.filter((x) => x.id !== deleteProduct.id));
            setDeleteProduct(null);
            setMenuVisible(false);
          }}
          title={t({ english: 'Delete product', urdu: 'مصنوعات حذف کریں' })}
          message={t({ english: 'This will remove the product from your listings.', urdu: 'یہ مصنوعات کو آپ کی فہرست سے ہٹا دے گا۔' })}
        />
        {/* Bottom Add New button */}
        <View style={styles.bottomWrap} pointerEvents="box-none">
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: horizontalPadding }}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.addNewBottom}
                onPress={() => router.push('/add-product')}
              >
                <Feather name="plus" size={16} color="#ffffff" />
                <Text style={styles.addNewBottomText}>{t({ english: 'Add New Product', urdu: 'نئی مصنوعات شامل کریں' })}</Text>
              </TouchableOpacity>
          </View>
        </View>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
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

  addBtn: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtnText: { color: '#0d5c4b', fontWeight: '900', fontSize: 12 },
  addBtnInline: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  backBtnHeader: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },

  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 18 },
  addNewBottom: { height: 54, borderRadius: 14, backgroundColor: '#0d5c4b', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  addNewBottomText: { color: '#ffffff', fontWeight: '900', fontSize: 15 },

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
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontWeight: '900', color: '#111827', fontSize: 16 },
  statLabel: { color: '#6b7280', fontSize: 10, marginTop: 2, textAlign: 'center' },

  listTitle: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 12 },

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
  cardRow: { flexDirection: 'row', gap: 12, padding: 14 },
  emojiBox: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' },
  productName: { fontWeight: '900', color: '#111827', flex: 1 },
  moreBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  price: { fontWeight: '900', color: '#0d5c4b', fontSize: 16, marginTop: 2 },
  unit: { fontWeight: '600', color: '#6b7280', fontSize: 11 },
  meta: { color: '#6b7280', fontSize: 11 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '800' },

  cardActions: { paddingHorizontal: 14, paddingBottom: 14, flexDirection: 'row', gap: 10 },
  editBtn: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  editBtnText: { color: '#0d5c4b', fontWeight: '900', fontSize: 12 },
  trashBtn: {
    width: 44,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.10)',
  },
});
