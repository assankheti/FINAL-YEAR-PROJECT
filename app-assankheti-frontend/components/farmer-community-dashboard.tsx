import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import NotificationBell from '@/components/NotificationBell';
import { authFetch } from '@/lib/authFetch';
import { getOrCreateMobileId } from '@/lib/deviceId';
import { showMobileNotificationsOnce } from '@/lib/mobileNotifications';
import { clearAuthSession } from '@/lib/appFlow';
import { getProductOwnerId, listFarmerProducts } from '@/lib/productsApi';

// ─── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  primary: '#0d5c4b',
  primaryLight: '#10b981',
  accent: '#059669',
  amber: '#f59e0b',
  red: '#ef4444',
  bg: '#f0f7f4',
  card: '#ffffff',
  text: '#0f172a',
  textSub: '#64748b',
  border: '#e2e8f0',
  greenTint: 'rgba(13,92,75,0.08)',
  greenTint2: 'rgba(16,185,129,0.12)',
  shadow: '#000',
};

const RADIUS = { sm: 12, md: 16, lg: 20, xl: 24, full: 999 };

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'home' | 'myshop' | 'favorites' | 'community' | 'profile';

type Props = { textLanguage?: 'urdu' | 'english' };

type APIProduct = {
  id: string;
  farmer_id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  stock: number;
  description?: string | null;
  images: string[];
  status: string;
  views: number;
};

type MyProduct = APIProduct & { editMode?: boolean };

// ─── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, { icon: string; label: string; color: string }> = {
  grains:     { icon: '🌾', label: 'Grains',     color: '#fef3c7' },
  veggies:    { icon: '🥬', label: 'Veggies',    color: '#d1fae5' },
  fruits:     { icon: '🍎', label: 'Fruits',     color: '#fce7f3' },
  dairy:      { icon: '🥛', label: 'Dairy',      color: '#e0f2fe' },
  meat:       { icon: '🥩', label: 'Meat',       color: '#fee2e2' },
  others:     { icon: '🌿', label: 'Others',     color: '#f0fdf4' },
};

function categoryEmoji(cat?: string) {
  return CATEGORY_MAP[cat ?? 'others']?.icon ?? '📦';
}

function formatPrice(price: number, unit: string) {
  return { main: `₨${Math.round(price)}`, sub: `/${unit}` };
}

function farmerLabel(farmer_id: string) {
  if (!farmer_id) return 'Verified Farmer';
  const digits = farmer_id.replace(/\D/g, '');
  if (digits.length >= 4) return `Farmer ···${digits.slice(-4)}`;
  return 'Verified Farmer';
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────

function SkeletonBox({ width, height, radius = 10, style }: {
  width: number | string; height: number; radius?: number; style?: object;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });
  return (
    <Animated.View style={[{ width: width as any, height, borderRadius: radius, backgroundColor: '#d1d5db', opacity }, style]} />
  );
}

// ─── Product card (grid) ────────────────────────────────────────────────────────

function ProductCard({ item, onBuy, onFav, isFav, lang }: {
  item: APIProduct;
  onBuy: () => void;
  onFav: () => void;
  isFav: boolean;
  lang: 'english' | 'urdu';
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(onBuy);
  };
  const { main, sub } = formatPrice(item.price, item.unit);
  const img = item.images?.[0];

  return (
    <Animated.View style={[styles.productCard, { transform: [{ scale }] }]}>
      <Pressable onPress={press} style={{ flex: 1 }}>
        <View style={styles.productCardTop}>
          {img
            ? <Image source={{ uri: img }} style={styles.productCardImg} resizeMode="cover" />
            : <Text style={{ fontSize: 42 }}>{categoryEmoji(item.category)}</Text>
          }
          {item.status === 'active' && item.stock > 0 ? null : (
            <View style={styles.soldOverlay}><Text style={styles.soldText}>Sold Out</Text></View>
          )}
          <TouchableOpacity activeOpacity={0.8} onPress={onFav} style={styles.favChip}>
            <Feather name="heart" size={13} color={isFav ? C.red : C.textSub} />
          </TouchableOpacity>
        </View>
        <View style={styles.productCardBody}>
          <Text style={styles.productCardName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productCardFarmer} numberOfLines={1}>
            <Feather name="user" size={10} color={C.textSub} /> {farmerLabel(item.farmer_id)}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceMain}>{main}<Text style={styles.priceSub}>{sub}</Text></Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.buyChip, item.stock <= 0 && { opacity: 0.4 }]}
              onPress={onBuy}
              disabled={item.stock <= 0}
            >
              <Text style={styles.buyChipText}>{lang === 'urdu' ? 'خریدیں' : 'Buy'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Featured card (horizontal) ───────────────────────────────────────────────

function FeaturedCard({ item, onPress }: { item: APIProduct; onPress: () => void }) {
  const img = item.images?.[0];
  const { main, sub } = formatPrice(item.price, item.unit);
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.featCard}>
      <LinearGradient
        colors={[C.primary, C.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.featCardGradient}
      >
        {img
          ? <Image source={{ uri: img }} style={styles.featCardImg} resizeMode="cover" />
          : <Text style={{ fontSize: 52 }}>{categoryEmoji(item.category)}</Text>
        }
      </LinearGradient>
      <View style={styles.featCardBody}>
        <Text style={styles.featCardName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.featCardFarmer} numberOfLines={1}>{farmerLabel(item.farmer_id)}</Text>
        <Text style={styles.featCardPrice}>
          {main}<Text style={{ fontSize: 12, fontWeight: '600', color: C.textSub }}>{sub}</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function FarmerCommunityDashboard({ textLanguage = 'english' }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const contentMaxWidth = Math.min(width - 0, 600);
  const cardW = (Math.min(width, contentMaxWidth) - 48) / 2;

  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [communityUnread, setCommunityUnread] = useState(0);

  // Browse products (home tab)
  const [browseProducts, setBrowseProducts] = useState<APIProduct[]>([]);
  const [browseLoading, setBrowseLoading] = useState(true);
  const [browseError, setBrowseError] = useState<string | null>(null);

  // My products (myshop tab)
  const [myProducts, setMyProducts] = useState<MyProduct[]>([]);
  const [myProductsLoading, setMyProductsLoading] = useState(false);

  // Profile
  const [farmerName, setFarmerName] = useState('');
  const [farmerAvatarUri, setFarmerAvatarUri] = useState('');

  const t = useCallback((en: string, ur: string) => textLanguage === 'urdu' ? ur : en, [textLanguage]);

  // ─── Load browse products ────────────────────────────────────────────────────

  const loadBrowseProducts = useCallback(async () => {
    setBrowseLoading(true);
    setBrowseError(null);
    try {
      const res = await authFetch('/api/v1/products/all?status=active&limit=30');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data: APIProduct[] = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      setBrowseProducts(data.filter((p) => p.stock > 0));
    } catch (e: any) {
      setBrowseError(e?.message ?? 'Failed to load products');
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  useEffect(() => { loadBrowseProducts(); }, [loadBrowseProducts]);

  // ─── Load my products ────────────────────────────────────────────────────────

  const loadMyProducts = useCallback(async () => {
    setMyProductsLoading(true);
    try {
      const ownerId = await getProductOwnerId();
      const data = (await listFarmerProducts(ownerId)) as APIProduct[];
      setMyProducts(data);
    } catch { /* silent */ }
    finally { setMyProductsLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'myshop') loadMyProducts();
  }, [activeTab, loadMyProducts]);

  useFocusEffect(
    useCallback(() => {
      if (activeTab !== 'myshop') return undefined;
      void loadMyProducts();
      return undefined;
    }, [activeTab, loadMyProducts])
  );

  // ─── Unread count ────────────────────────────────────────────────────────────

  const refreshUnread = useCallback(async () => {
    try {
      const mobileId = await getOrCreateMobileId();
      const token = await AsyncStorage.getItem('auth.access_token');
      if (!token) return;
      const [inboxRes, grpRes] = await Promise.all([
        authFetch(`/api/v1/community/dm/inbox/${encodeURIComponent(mobileId)}`),
        authFetch(`/api/v1/community/groups/list/${encodeURIComponent(mobileId)}`),
      ]);
      if (!inboxRes.ok || !grpRes.ok) return;
      const inbox = await inboxRes.json();
      const grp = await grpRes.json();
      const total =
        (inbox?.conversations ?? []).reduce((s: number, c: any) => s + (c?.unread_count || 0), 0) +
        (grp?.groups ?? []).reduce((s: number, g: any) => s + (g?.unread_count || 0), 0);
      setCommunityUnread(total);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    refreshUnread();
    const id = setInterval(refreshUnread, 30000);
    return () => clearInterval(id);
  }, [refreshUnread]);

  // ─── Profile ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== 'profile') return;
    let cancelled = false;
    (async () => {
      try {
        const [[, name], [, avatarUri]] = await AsyncStorage.multiGet([
          'farmerProfile.name',
          'farmerProfile.avatarUri',
        ]);
        if (!cancelled) {
          setFarmerName(name ?? '');
          setFarmerAvatarUri(avatarUri ?? '');
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [activeTab]);

  // ─── Notifications ────────────────────────────────────────────────────────────

  useEffect(() => {
    showMobileNotificationsOnce('farmer-community-alerts', [
      {
        id: 'new-offer',
        title: t('New offer received', 'نئی پیشکش موصول ہوئی'),
        body: t('A buyer made an offer on your product.', 'ایک خریدار نے آپ کی مصنوع پر پیشکش کی ہے۔'),
        data: { type: 'offer' },
      },
    ]);
  }, [t]);

  // ─── Filtered / featured ─────────────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return browseProducts;
    return browseProducts.filter((p) =>
      `${p.name} ${p.category} ${farmerLabel(p.farmer_id)}`.toLowerCase().includes(q)
    );
  }, [searchQuery, browseProducts]);

  const featuredProducts = useMemo(
    () => browseProducts.slice(0, 6),
    [browseProducts]
  );

  const favoriteProducts = useMemo(
    () => browseProducts.filter((p) => favorites.has(p.id)),
    [browseProducts, favorites]
  );

  const toggleFav = (id: string) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleDeleteProduct = useCallback((id: string, name: string) => {
    Alert.alert(
      t('Delete Product', 'مصنوع حذف کریں'),
      `${t('Delete', 'حذف کریں')} "${name}"?`,
      [
        { text: t('Cancel', 'منسوخ'), style: 'cancel' },
        {
          text: t('Delete', 'حذف'),
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await authFetch(`/api/v1/products/${id}`, { method: 'DELETE' });
              if (res.ok) setMyProducts((prev) => prev.filter((p) => p.id !== id));
            } catch { /* silent */ }
          },
        },
      ]
    );
  }, [t]);

  // ─── Header ──────────────────────────────────────────────────────────────────

  const Header = () => (
    <LinearGradient
      colors={['#064e3b', '#0d5c4b', '#059669']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={[styles.headerInner, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.brandRow}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons name="sprout" size={20} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerSub}>{t('Farmer Marketplace', 'کسان بازار')}</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {farmerName?.trim() ? farmerName : t('Welcome Back', 'خوش آمدید')} 👋
              </Text>
            </View>
          </View>
          <NotificationBell onHeader localNamespaces={['farmer-notifications']} />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={17} color={C.textSub} style={{ marginLeft: 14 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('Search crops, products...', 'فصلیں، مصنوعات تلاش کریں...')}
              placeholderTextColor="#9ca3af"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
                <Feather name="x" size={14} color={C.textSub} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.filterPill}
            onPress={() => router.push('/category-products/grains' as any)}
          >
            <Feather name="sliders" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );

  // ─── Categories ───────────────────────────────────────────────────────────────

  const Categories = () => (
    <View style={[styles.section, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }}>
        {Object.entries(CATEGORY_MAP).map(([key, { icon, label, color }]) => (
          <TouchableOpacity
            key={key}
            activeOpacity={0.82}
            onPress={() => router.push({ pathname: '/category-products/[category]', params: { category: key } })}
            style={[styles.categoryChip, { backgroundColor: color }]}
          >
            <Text style={{ fontSize: 20 }}>{icon}</Text>
            <Text style={styles.categoryChipLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // ─── Featured (horizontal) ────────────────────────────────────────────────────

  const Featured = () => {
    if (browseLoading || featuredProducts.length === 0) return null;
    return (
      <View style={[{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('Featured Products', 'نمایاں مصنوعات')}</Text>
          <TouchableOpacity onPress={() => router.push('/category-products/grains' as any)}>
            <Text style={styles.seeAll}>{t('See all', 'سب دیکھیں')}</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={featuredProducts}
          keyExtractor={(p) => p.id + '_feat'}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          renderItem={({ item }) => (
            <FeaturedCard
              item={item}
              onPress={() =>
                router.push({ pathname: '/product-buy/[productId]', params: { productId: item.id } })
              }
            />
          )}
        />
      </View>
    );
  };

  // ─── Browse grid ─────────────────────────────────────────────────────────────

  const BrowseGrid = () => {
    if (browseLoading) {
      return (
        <View style={[styles.section, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
          <View style={styles.sectionHeader}>
            <SkeletonBox width={140} height={20} />
          </View>
          <View style={styles.grid}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.productCard, { width: cardW }]}>
                <SkeletonBox width="100%" height={130} radius={0} />
                <View style={{ padding: 12, gap: 8 }}>
                  <SkeletonBox width="80%" height={14} />
                  <SkeletonBox width="50%" height={12} />
                  <SkeletonBox width="60%" height={14} />
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (browseError) {
      return (
        <View style={[styles.section, { alignItems: 'center', paddingVertical: 32 }]}>
          <Text style={{ fontSize: 40 }}>🌾</Text>
          <Text style={styles.emptyTitle}>{t('Could not load products', 'مصنوعات لوڈ نہیں ہو سکیں')}</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={loadBrowseProducts} style={styles.retryBtn}>
            <Text style={styles.retryText}>{t('Retry', 'دوبارہ کوشش کریں')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const items = searchQuery.trim() ? filteredProducts : browseProducts;

    if (items.length === 0) {
      return (
        <View style={[styles.section, { alignItems: 'center', paddingVertical: 32 }]}>
          <Text style={{ fontSize: 40 }}>🔍</Text>
          <Text style={styles.emptyTitle}>{t('No products found', 'کوئی مصنوع نہیں ملا')}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.section, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {searchQuery.trim()
              ? t('Search Results', 'تلاش کے نتائج')
              : t('All Products', 'تمام مصنوعات')}
          </Text>
          <Text style={styles.countBadge}>{items.length}</Text>
        </View>
        <View style={styles.grid}>
          {items.map((p) => (
            <View key={p.id} style={{ width: cardW }}>
              <ProductCard
                item={p}
                onBuy={() =>
                  router.push({ pathname: '/product-buy/[productId]', params: { productId: p.id } })
                }
                onFav={() => toggleFav(p.id)}
                isFav={favorites.has(p.id)}
                lang={textLanguage}
              />
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ─── Home tab ─────────────────────────────────────────────────────────────────

  const HomeTab = () => (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      <Header />
      <View style={{ marginTop: -22 }}>
        <View style={[styles.statsBar, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
          {[
            { label: t('Products', 'مصنوعات'), value: browseProducts.length, icon: 'package' as const },
            { label: t('My Listings', 'میری فہرستیں'), value: myProducts.length, icon: 'tag' as const },
            { label: t('Saved', 'محفوظ'), value: favorites.size, icon: 'heart' as const },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Feather name={s.icon} size={15} color={C.primary} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <Categories />
      <Featured />
      <BrowseGrid />
    </ScrollView>
  );

  // ─── My Shop tab ──────────────────────────────────────────────────────────────

  const MyShopTab = () => {
    const statsConfig = [
      { label: t('Active', 'فعال'), count: myProducts.filter((p) => p.status === 'active').length, color: '#10b981', bg: '#d1fae5' },
      { label: t('Sold', 'فروخت'), count: myProducts.filter((p) => p.status === 'sold').length, color: '#f59e0b', bg: '#fef3c7' },
      { label: t('Draft', 'مسودہ'), count: myProducts.filter((p) => p.status === 'draft').length, color: '#64748b', bg: '#f1f5f9' },
    ];

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Shop Header */}
        <LinearGradient colors={['#064e3b', '#0d5c4b']} style={styles.shopHeader}>
          <View style={[{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: 16 }]}>
            <View style={styles.shopHeaderRow}>
              <View>
                <Text style={styles.shopHeaderTitle}>{t('My Shop', 'میری دکان')}</Text>
                <Text style={styles.shopHeaderSub}>
                  {myProducts.length} {t('listings', 'فہرستیں')}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.addBtn}
                onPress={() => router.push('/add-product')}
              >
                <Feather name="plus" size={16} color="#fff" />
                <Text style={styles.addBtnText}>{t('Add Product', 'مصنوع شامل کریں')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <View style={[{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: 16, marginTop: -20 }]}>
          {/* Stats */}
          <View style={styles.shopStats}>
            {statsConfig.map((s) => (
              <View key={s.label} style={[styles.shopStatCard, { backgroundColor: s.bg }]}>
                <Text style={[styles.shopStatValue, { color: s.color }]}>{s.count}</Text>
                <Text style={[styles.shopStatLabel, { color: s.color }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Loading */}
          {myProductsLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          ) : myProducts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 56 }}>🌾</Text>
              <Text style={styles.emptyTitle}>{t('No listings yet', 'ابھی کوئی فہرست نہیں')}</Text>
              <Text style={styles.emptySubtitle}>
                {t('Start selling your produce to buyers across Pakistan',
                   'پاکستان بھر کے خریداروں کو اپنی پیداوار فروخت کریں')}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.addBtn, { marginTop: 18, paddingHorizontal: 28 }]}
                onPress={() => router.push('/add-product')}
              >
                <Feather name="plus" size={16} color="#fff" />
                <Text style={styles.addBtnText}>{t('Add Your First Product', 'پہلا مصنوع شامل کریں')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 12, marginTop: 16 }}>
              {myProducts.map((p) => {
                const emoji = categoryEmoji(p.category);
                const statusColor = p.status === 'active' ? '#10b981' : p.status === 'sold' ? '#f59e0b' : '#64748b';
                const statusBg = p.status === 'active' ? '#d1fae5' : p.status === 'sold' ? '#fef3c7' : '#f1f5f9';
                const statusLabel = p.status === 'active' ? t('Active', 'فعال') : p.status === 'sold' ? t('Sold', 'فروخت') : t('Draft', 'مسودہ');
                const img = p.images?.[0];

                return (
                  <View key={p.id} style={styles.myProductCard}>
                    <View style={styles.myProductImg}>
                      {img
                        ? <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                        : <Text style={{ fontSize: 30 }}>{emoji}</Text>
                      }
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.myProductTopRow}>
                        <Text style={styles.myProductName} numberOfLines={1}>{p.name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                        </View>
                      </View>
                      <Text style={styles.myProductPrice}>
                        ₨{Math.round(p.price)}<Text style={styles.myProductUnit}>/{p.unit}</Text>
                      </Text>
                      <View style={styles.myProductMeta}>
                        <Feather name="package" size={11} color={C.textSub} />
                        <Text style={styles.myProductMetaText}>{t('Stock', 'اسٹاک')}: {p.stock}</Text>
                        <Text style={styles.metaDot}>·</Text>
                        <Feather name="eye" size={11} color={C.textSub} />
                        <Text style={styles.myProductMetaText}>{p.views} {t('views', 'مناظر')}</Text>
                      </View>
                      <View style={styles.myProductActions}>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          style={styles.editBtn}
                          onPress={() =>
                            router.push({ pathname: '/add-product', params: { productId: p.id, editMode: 'true' } })
                          }
                        >
                          <Feather name="edit-2" size={13} color={C.primary} />
                          <Text style={styles.editBtnText}>{t('Edit', 'ترمیم')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteProduct(p.id, p.name)}
                        >
                          <Feather name="trash-2" size={13} color={C.red} />
                          <Text style={styles.deleteBtnText}>{t('Delete', 'حذف')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  // ─── Favorites tab ────────────────────────────────────────────────────────────

  const FavoritesTab = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#f8fffc', '#eef8f4']} style={styles.savedHero}>
        <View style={[styles.savedHeroInner, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
          <View style={styles.savedHeroBadge}>
            <Feather name="heart" size={16} color={C.primary} />
            <Text style={styles.savedHeroBadgeText}>{t('Saved Collection', 'محفوظ کلیکشن')}</Text>
          </View>
          <Text style={styles.pageTitle}>{t('Saved Products', 'محفوظ مصنوعات')}</Text>
          <Text style={styles.savedHeroSubtitle}>
            {t('Keep your favorite products in one place for quick buying later.', 'اپنی پسندیدہ مصنوعات کو ایک جگہ محفوظ رکھیں تاکہ بعد میں آسانی سے خرید سکیں۔')}
          </Text>
          <View style={styles.savedStatsRow}>
            <View style={styles.savedStatCard}>
              <Text style={styles.savedStatValue}>{favorites.size}</Text>
              <Text style={styles.savedStatLabel}>{t('Saved', 'محفوظ')}</Text>
            </View>
            <View style={styles.savedStatCard}>
              <Text style={styles.savedStatValue}>{favoriteProducts.length}</Text>
              <Text style={styles.savedStatLabel}>{t('Ready to buy', 'خریدنے کے لیے تیار')}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.savedContent, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <View style={styles.savedSectionHead}>
          <Text style={styles.savedSectionTitle}>{t('Your Wishlist', 'آپ کی پسندیدہ فہرست')}</Text>
          <Text style={styles.pageSubtitle}>
            {favorites.size} {t('items saved', 'آئٹمز محفوظ')}
          </Text>
        </View>

        {favoriteProducts.length === 0 ? (
          <View style={styles.savedEmptyCard}>
            <View style={styles.savedEmptyIcon}>
              <Feather name="heart" size={28} color={C.primary} />
            </View>
            <Text style={styles.savedEmptyTitle}>{t('Nothing saved yet', 'ابھی کچھ محفوظ نہیں')}</Text>
            <Text style={styles.savedEmptySubtitle}>
              {t('Tap the heart on any product to build your personal shortlist here.', 'کسی بھی مصنوع پر دل دبائیں تاکہ آپ کی ذاتی پسندیدہ فہرست یہاں بن سکے۔')}
            </Text>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.savedCtaBtn}
              onPress={() => setActiveTab('home')}
            >
              <Feather name="search" size={15} color="#fff" />
              <Text style={styles.savedCtaText}>{t('Browse Products', 'مصنوعات دیکھیں')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {favoriteProducts.map((p) => {
              const img = p.images?.[0];
              const { main, sub } = formatPrice(p.price, p.unit);
              return (
                <View key={p.id} style={styles.favRow}>
                  <View style={styles.favRowImg}>
                    {img
                      ? <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                      : <Text style={{ fontSize: 28 }}>{categoryEmoji(p.category)}</Text>
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.myProductName} numberOfLines={2}>{p.name}</Text>
                    <Text style={styles.myProductMetaText} numberOfLines={1}>{farmerLabel(p.farmer_id)}</Text>
                    <View style={styles.favRowBottom}>
                      <Text style={styles.myProductPrice}>
                        {main}<Text style={styles.myProductUnit}>{sub}</Text>
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          style={styles.iconBtn}
                          onPress={() => toggleFav(p.id)}
                        >
                          <Feather name="heart" size={14} color={C.red} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          style={styles.buyChip}
                          onPress={() =>
                            router.push({ pathname: '/product-buy/[productId]', params: { productId: p.id } })
                          }
                        >
                          <Text style={styles.buyChipText}>{t('Buy Now', 'ابھی خریدیں')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );

  // ─── Profile tab ──────────────────────────────────────────────────────────────

  const ProfileTab = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#064e3b', '#0d5c4b']} style={styles.profileHeader}>
        <View style={{ alignItems: 'center' }}>
          {farmerAvatarUri
            ? <Image source={{ uri: farmerAvatarUri }} style={styles.profileAvatar} />
            : (
              <LinearGradient colors={['#10b981', '#059669']} style={styles.profileAvatar}>
                <Text style={{ fontSize: 38 }}>👨‍🌾</Text>
              </LinearGradient>
            )}
          <Text style={styles.profileName}>{farmerName?.trim() ? farmerName : t('Farmer', 'کسان')}</Text>
          <View style={styles.profileBadge}>
            <MaterialCommunityIcons name="sprout" size={13} color="#10b981" />
            <Text style={styles.profileBadgeText}>{t('Verified Farmer', 'تصدیق شدہ کسان')}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={[{ paddingHorizontal: 16, marginTop: 20, gap: 10, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.profileEditBtn}
          onPress={() => router.push('/farmer-profile-edit')}
        >
          <Feather name="edit-3" size={16} color={C.primary} />
          <Text style={styles.profileEditText}>{t('Edit Profile', 'پروفائل ترمیم کریں')}</Text>
        </TouchableOpacity>

        {[
          { label: t('My Sales', 'میری فروخت'), icon: 'shopping-bag' as const, route: '/farmer-orders' },
          { label: t('Settings', 'ترتیبات'), icon: 'settings' as const, route: '/farmer-settings' },
          { label: t('Notifications', 'اطلاعات'), icon: 'bell' as const, route: '/farmer-notifications' },
          { label: t('Privacy Policy', 'پرائیویسی پالیسی'), icon: 'shield' as const, route: '/privacy-policy' },
          { label: t('Help Center', 'ہیلپ سینٹر'), icon: 'help-circle' as const, route: '/help-center' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            activeOpacity={0.85}
            style={styles.profileRow}
            onPress={() => router.push(item.route as any)}
          >
            <View style={styles.profileRowIcon}>
              <Feather name={item.icon} size={18} color={C.primary} />
            </View>
            <Text style={styles.profileRowText}>{item.label}</Text>
            <Feather name="chevron-right" size={16} color={C.textSub} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.logoutBtn}
          onPress={async () => {
            await clearAuthSession();
            router.replace({ pathname: '/farmer-dashboard', params: { userType: 'farmer' } });
          }}
        >
          <Feather name="log-out" size={16} color="#fff" />
          <Text style={styles.logoutText}>{t('Sign Out', 'سائن آؤٹ')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ─── Tab bar ──────────────────────────────────────────────────────────────────

  const TABS: { id: Tab; icon: string; label: string; customPress?: () => void; badge?: number }[] = [
    { id: 'home', icon: 'home', label: t('Home', 'ہوم') },
    { id: 'myshop', icon: 'tag', label: t('My Shop', 'دکان') },
    { id: 'favorites', icon: 'heart', label: t('Saved', 'محفوظ') },
    { id: 'community', icon: 'message-circle', label: t('Chat', 'چیٹ'), customPress: () => router.push('/community/inbox' as any), badge: communityUnread },
    { id: 'profile', icon: 'user', label: t('Profile', 'پروفائل') },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={{ flex: 1 }}>
        {activeTab === 'home'      && <HomeTab />}
        {activeTab === 'myshop'    && <MyShopTab />}
        {activeTab === 'favorites' && <FavoritesTab />}
        {activeTab === 'profile'   && <ProfileTab />}

        {/* Tab Bar */}
        <View style={styles.tabBarWrap}>
          <View style={[styles.tabBar, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
            {TABS.map((tab) => {
              const isActive = !tab.customPress && activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  activeOpacity={0.8}
                  style={styles.tabBtn}
                  onPress={tab.customPress ?? (() => setActiveTab(tab.id))}
                >
                  <View>
                    <Feather name={tab.icon as any} size={22} color={isActive ? C.primary : C.textSub} />
                    {tab.badge && tab.badge > 0 ? (
                      <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{tab.badge > 99 ? '99+' : String(tab.badge)}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.tabLabel, { color: isActive ? C.primary : C.textSub }]}>
                    {tab.label}
                  </Text>
                  {isActive && <View style={styles.tabDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },

  // Header
  header: { paddingTop: 12, paddingBottom: 36, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerInner: { paddingHorizontal: 16 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerSub: { color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '900', marginTop: 2 },
  searchRow: { flexDirection: 'row', gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: RADIUS.md, height: 46 },
  searchInput: { flex: 1, paddingHorizontal: 10, color: C.text, fontSize: 14, fontWeight: '600' },
  searchClear: { paddingHorizontal: 12 },
  filterPill: { width: 46, height: 46, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },

  // Stats bar
  statsBar: { flexDirection: 'row', backgroundColor: C.card, borderRadius: RADIUS.lg, marginHorizontal: 16, padding: 16, shadowColor: C.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 5, gap: 0 },
  statItem: { flex: 1, alignItems: 'center', gap: 4, borderRightWidth: 0 },
  statValue: { fontSize: 20, fontWeight: '900', color: C.text },
  statLabel: { fontSize: 10, fontWeight: '700', color: C.textSub },

  // Section
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: C.text },
  seeAll: { color: C.primary, fontWeight: '800', fontSize: 13 },
  countBadge: { backgroundColor: C.greenTint, color: C.primary, fontWeight: '800', fontSize: 12, paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.full },

  // Categories
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: RADIUS.md },
  categoryChipLabel: { fontWeight: '700', fontSize: 13, color: C.text },

  // Featured card
  featCard: { width: 200, backgroundColor: C.card, borderRadius: RADIUS.lg, overflow: 'hidden', shadowColor: C.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  featCardGradient: { height: 130, alignItems: 'center', justifyContent: 'center' },
  featCardImg: { position: 'absolute', width: '100%', height: '100%', opacity: 0.75 },
  featCardBody: { padding: 12 },
  featCardName: { fontWeight: '900', fontSize: 14, color: C.text, marginBottom: 4 },
  featCardFarmer: { fontSize: 11, color: C.textSub, fontWeight: '600', marginBottom: 6 },
  featCardPrice: { fontSize: 15, fontWeight: '900', color: C.primary },

  // Product grid card
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  productCard: { backgroundColor: C.card, borderRadius: RADIUS.lg, overflow: 'hidden', shadowColor: C.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4 },
  productCardTop: { height: 130, backgroundColor: C.greenTint2, alignItems: 'center', justifyContent: 'center' },
  productCardImg: { position: 'absolute', width: '100%', height: '100%' },
  soldOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center' },
  soldText: { color: '#fff', fontWeight: '900', fontSize: 13, backgroundColor: 'rgba(239,68,68,0.85)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  favChip: { position: 'absolute', top: 9, right: 9, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  productCardBody: { padding: 12 },
  productCardName: { fontWeight: '800', color: C.text, fontSize: 13, lineHeight: 18 },
  productCardFarmer: { fontSize: 11, color: C.textSub, fontWeight: '600', marginTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  priceMain: { fontSize: 15, fontWeight: '900', color: C.primary },
  priceSub: { fontSize: 11, fontWeight: '600', color: C.textSub },
  buyChip: { backgroundColor: C.primary, borderRadius: RADIUS.sm, paddingVertical: 7, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  buyChipText: { color: '#fff', fontWeight: '900', fontSize: 12 },

  // Shared plain header
  plainHeader: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  pageTitle: { fontSize: 22, fontWeight: '900', color: C.text },
  pageSubtitle: { fontSize: 13, fontWeight: '600', color: C.textSub, marginTop: 4 },

  // Empty/error states
  emptyBox: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, fontWeight: '600', color: C.textSub, textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: C.greenTint, borderRadius: RADIUS.md },
  retryText: { color: C.primary, fontWeight: '800' },
  centerBox: { paddingVertical: 48, alignItems: 'center' },

  // My Shop header
  shopHeader: { paddingTop: 18, paddingBottom: 44, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  shopHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  shopHeaderTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  shopHeaderSub: { color: 'rgba(255,255,255,0.72)', fontWeight: '700', marginTop: 2, fontSize: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 14 },
  addBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  shopStats: { flexDirection: 'row', gap: 10 },
  shopStatCard: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  shopStatValue: { fontSize: 24, fontWeight: '900' },
  shopStatLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  // My Product card
  myProductCard: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: RADIUS.lg, backgroundColor: C.card, shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  myProductImg: { width: 80, height: 80, borderRadius: RADIUS.md, backgroundColor: C.greenTint2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  myProductTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  myProductName: { flex: 1, fontWeight: '800', color: C.text, fontSize: 14 },
  statusBadge: { borderRadius: RADIUS.full, paddingHorizontal: 9, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '800' },
  myProductPrice: { marginTop: 6, color: C.primary, fontWeight: '900', fontSize: 16 },
  myProductUnit: { color: C.textSub, fontWeight: '700', fontSize: 12 },
  myProductMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  myProductMetaText: { fontSize: 11, color: C.textSub, fontWeight: '600' },
  metaDot: { color: C.textSub, fontSize: 14 },
  myProductActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: RADIUS.sm, backgroundColor: C.greenTint },
  editBtnText: { color: C.primary, fontWeight: '800', fontSize: 12 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: RADIUS.sm, backgroundColor: '#fee2e2' },
  deleteBtnText: { color: C.red, fontWeight: '800', fontSize: 12 },

  // Favorites row
  savedHero: {
    paddingTop: 18,
    paddingBottom: 20,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  savedHeroInner: { paddingHorizontal: 16 },
  savedHeroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.08)',
    marginBottom: 14,
  },
  savedHeroBadgeText: { color: C.primary, fontWeight: '800', fontSize: 12 },
  savedHeroSubtitle: { marginTop: 8, fontSize: 13, lineHeight: 20, color: C.textSub, fontWeight: '600', maxWidth: 420 },
  savedStatsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  savedStatCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.06)',
  },
  savedStatValue: { fontSize: 24, fontWeight: '900', color: C.primary },
  savedStatLabel: { marginTop: 4, fontSize: 11, fontWeight: '700', color: C.textSub },
  savedContent: { paddingHorizontal: 16, paddingTop: 18, gap: 12 },
  savedSectionHead: { marginBottom: 4 },
  savedSectionTitle: { fontSize: 18, fontWeight: '900', color: C.text },
  savedEmptyCard: {
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: RADIUS.xl,
    paddingVertical: 34,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.08)',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  savedEmptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  savedEmptyTitle: { fontSize: 22, fontWeight: '900', color: C.text, textAlign: 'center' },
  savedEmptySubtitle: { fontSize: 14, fontWeight: '600', color: C.textSub, textAlign: 'center', lineHeight: 22, marginTop: 10, maxWidth: 320 },
  savedCtaBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  savedCtaText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  favRow: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: RADIUS.lg, backgroundColor: C.card, shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  favRowImg: { width: 72, height: 72, borderRadius: RADIUS.md, backgroundColor: C.greenTint2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  favRowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  iconBtn: { width: 34, height: 34, borderRadius: RADIUS.sm, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },

  // Profile
  profileHeader: { paddingTop: 30, paddingBottom: 40, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  profileAvatar: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  profileName: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 12 },
  profileBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: RADIUS.full },
  profileBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  profileEditBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: C.primary, borderRadius: RADIUS.md, paddingVertical: 12, marginBottom: 4 },
  profileEditText: { color: C.primary, fontWeight: '800', fontSize: 14 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: RADIUS.md, backgroundColor: C.card, shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  profileRowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.greenTint, alignItems: 'center', justifyContent: 'center' },
  profileRowText: { flex: 1, fontWeight: '700', color: C.text, fontSize: 14 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, backgroundColor: C.red, borderRadius: RADIUS.md, paddingVertical: 14 },
  logoutText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  // Tab bar
  tabBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 20 : 8, backgroundColor: 'transparent' },
  tabBar: { backgroundColor: C.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: C.border, flexDirection: 'row', paddingVertical: 8, shadowColor: C.shadow, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 8 },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4, position: 'relative' },
  tabLabel: { fontSize: 10, fontWeight: '700' },
  tabBadge: { position: 'absolute', top: -5, right: -8, backgroundColor: '#dc2626', borderRadius: 10, paddingHorizontal: 4, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  tabDot: { position: 'absolute', bottom: -2, width: 4, height: 4, borderRadius: 2, backgroundColor: C.primary },
});
