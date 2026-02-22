import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type CategoryKey = 'grains' | 'veggies' | 'fruits' | 'others' | 'rice';

type Product = {
  id: string;
  name: string;
  price: string;
  unit: string;
  farmer: string;
  location: string;
  rating: number;
  image: string;
  category: Exclude<CategoryKey, 'rice'>;
};

const ALL_PRODUCTS: Product[] = [
  // Grains
  { id: '1', name: 'Fresh Basmati Rice', price: '₨180', unit: '/kg', farmer: 'Ahmad Ali', location: 'Gujranwala', rating: 4.8, image: '🌾', category: 'grains' },
  { id: '2', name: 'Premium Wheat', price: '₨95', unit: '/kg', farmer: 'Hussain Khan', location: 'Multan', rating: 4.5, image: '🌾', category: 'grains' },
  { id: '3', name: 'Organic Rice', price: '₨220', unit: '/kg', farmer: 'Kamran Farm', location: 'Lahore', rating: 4.9, image: '🌾', category: 'grains' },
  { id: '4', name: 'Brown Rice', price: '₨250', unit: '/kg', farmer: 'Ali Traders', location: 'Faisalabad', rating: 4.6, image: '🌾', category: 'grains' },
  // Vegetables
  { id: '5', name: 'Fresh Tomatoes', price: '₨120', unit: '/kg', farmer: 'Rashid Farm', location: 'Sahiwal', rating: 4.7, image: '🍅', category: 'veggies' },
  { id: '6', name: 'Green Spinach', price: '₨80', unit: '/kg', farmer: 'Hassan Farm', location: 'Lahore', rating: 4.8, image: '🥬', category: 'veggies' },
  { id: '7', name: 'Fresh Potatoes', price: '₨60', unit: '/kg', farmer: 'Iqbal Agro', location: 'Okara', rating: 4.5, image: '🥔', category: 'veggies' },
  { id: '8', name: 'Onions', price: '₨90', unit: '/kg', farmer: 'Khan Farm', location: 'Multan', rating: 4.4, image: '🧅', category: 'veggies' },
  // Fruits
  { id: '9', name: 'Fresh Mangoes', price: '₨350', unit: '/kg', farmer: 'Sweet Farms', location: 'Multan', rating: 4.9, image: '🥭', category: 'fruits' },
  { id: '10', name: 'Apples', price: '₨280', unit: '/kg', farmer: 'Mountain Fresh', location: 'Swat', rating: 4.7, image: '🍎', category: 'fruits' },
  { id: '11', name: 'Bananas', price: '₨100', unit: '/dozen', farmer: 'Sindh Farms', location: 'Hyderabad', rating: 4.6, image: '🍌', category: 'fruits' },
  { id: '12', name: 'Oranges', price: '₨180', unit: '/kg', farmer: 'Citrus Valley', location: 'Sargodha', rating: 4.8, image: '🍊', category: 'fruits' },
  // Others
  { id: '13', name: 'Premium Cotton', price: '₨450', unit: '/kg', farmer: 'Cotton King', location: 'Faisalabad', rating: 4.7, image: '🌿', category: 'others' },
  { id: '14', name: 'Sugarcane', price: '₨80', unit: '/kg', farmer: 'Sweet Sugar', location: 'Larkana', rating: 4.5, image: '🎋', category: 'others' },
  { id: '15', name: 'Fresh Corn', price: '₨60', unit: '/kg', farmer: 'Golden Farms', location: 'Okara', rating: 4.4, image: '🌽', category: 'others' },
];

const CATEGORY_INFO: Record<CategoryKey, { title: string; titleUrdu: string; icon: string; gradient: [string, string] }> = {
  grains: { title: 'Grains', titleUrdu: 'اناج', icon: '🌾', gradient: ['#0d5c4b', '#10b981'] },
  veggies: { title: 'Vegetables', titleUrdu: 'سبزیاں', icon: '🥬', gradient: ['#0d5c4b', '#10b981'] },
  fruits: { title: 'Fruits', titleUrdu: 'پھل', icon: '🍎', gradient: ['#f59e0b', '#fbbf24'] },
  others: { title: 'Others', titleUrdu: 'دیگر', icon: '🌿', gradient: ['#0d5c4b', '#10b981'] },
  rice: { title: 'Rice Products', titleUrdu: 'چاول کی مصنوعات', icon: '🌾', gradient: ['#0d5c4b', '#10b981'] },
};

const normalizeParam = (v: unknown): string | undefined => {
  if (Array.isArray(v)) return v[0];
  if (typeof v === 'string') return v;
  return undefined;
};

export default function CategoryProductsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const categoryParam = normalizeParam(params?.category)?.toLowerCase();
  const category: CategoryKey =
    categoryParam === 'grains' || categoryParam === 'veggies' || categoryParam === 'fruits' || categoryParam === 'others' || categoryParam === 'rice'
      ? (categoryParam as CategoryKey)
      : 'grains';

  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const categoryData = CATEGORY_INFO[category];

  const products = useMemo(() => {
    if (category === 'rice') return ALL_PRODUCTS.filter((p) => p.name.toLowerCase().includes('rice'));
    return ALL_PRODUCTS.filter((p) => p.category === category);
  }, [category]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => `${p.name} ${p.farmer}`.toLowerCase().includes(q));
  }, [products, searchQuery]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const cardGap = 14;
  const cardWidth = Math.floor((contentMaxWidth - cardGap) / 2);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={[categoryData.gradient[0], categoryData.gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingHorizontal: horizontalPadding }]}
        >
          <View style={[styles.headerRow, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.9}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Feather name="arrow-left" size={18} color="#ffffff" />
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22 }}>{categoryData.icon}</Text>
                <Text style={styles.headerTitle}>{categoryData.title}</Text>
              </View>
              <Text style={styles.headerSub}>{categoryData.titleUrdu}</Text>
            </View>

            <TouchableOpacity activeOpacity={0.9} style={styles.filterBtn} accessibilityRole="button" accessibilityLabel="Filter">
              <Feather name="filter" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchWrap, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
            <Feather name="search" size={18} color="#6b7280" style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={`Search ${categoryData.title.toLowerCase()}...`}
              placeholderTextColor="#9ca3af"
              style={styles.searchInput}
            />
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: horizontalPadding, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
            <Text style={styles.countText}>{filteredProducts.length} products found</Text>

            <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: cardGap }}>
              {filteredProducts.map((p) => (
                <View key={p.id} style={[styles.card, { width: cardWidth }]}>
                  <View style={styles.cardTop}>
                    <Text style={{ fontSize: 44 }}>{p.image}</Text>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => toggleFavorite(p.id)}
                      style={styles.heartBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Favorite ${p.name}`}
                    >
                      <Feather name="heart" size={16} color={favorites.includes(p.id) ? '#ef4444' : '#6b7280'} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ padding: 12 }}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.farmerText} numberOfLines={1}>
                      {p.farmer}
                    </Text>

                    <View style={styles.ratingRow}>
                      <Feather name="star" size={12} color="#f59e0b" />
                      <Text style={styles.ratingText}>{p.rating}</Text>
                      <Text style={styles.dot}>•</Text>
                      <Text style={styles.ratingText}>{p.location}</Text>
                    </View>

                    <View style={styles.bottomRow}>
                      <Text style={styles.price}>
                        {p.price}
                        <Text style={styles.unit}> {p.unit}</Text>
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.buyBtn}
                        onPress={() => router.push({ pathname: '/product-buy/[productId]', params: { productId: p.id } })}
                        accessibilityRole="button"
                        accessibilityLabel={`Buy ${p.name}`}
                      >
                        <Text style={styles.buyBtnText}>Buy</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
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
    paddingBottom: 22,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
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

  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchWrap: {
    marginTop: 14,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#111827', fontWeight: '700' },

  countText: { color: '#6b7280', fontSize: 12, fontWeight: '700' },

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
  cardTop: {
    height: 112,
    backgroundColor: 'rgba(16,185,129,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  productName: { fontWeight: '900', color: '#111827', fontSize: 12 },
  farmerText: { color: '#6b7280', fontSize: 11, marginTop: 2, fontWeight: '700' },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  ratingText: { color: '#6b7280', fontSize: 11, fontWeight: '700' },
  dot: { color: '#9ca3af', fontSize: 10 },

  bottomRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  price: { fontWeight: '900', color: '#0d5c4b', fontSize: 13 },
  unit: { color: '#6b7280', fontSize: 11, fontWeight: '700' },

  buyBtn: { height: 32, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#0d5c4b', alignItems: 'center', justifyContent: 'center' },
  buyBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
});
