import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Platform,
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
import { listAllProducts, normalizeProductImageUrl, productFallbackImage, type ProductListing } from '@/lib/productsApi';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  primary: '#0d5c4b',
  primaryLight: '#10b981',
  primaryMid: '#059669',
  accent: '#f59e0b',
  accentDark: '#b45309',
  bg: '#f0f7f4',
  card: '#ffffff',
  text: '#111827',
  sub: '#6b7280',
  muted: '#9ca3af',
  border: '#e5e7eb',
  danger: '#ef4444',
  gradStart: '#0d5c4b',
  gradEnd: '#10b981',
  skeletonBase: '#e5e7eb',
  skeletonHighlight: '#f3f4f6',
} as const;

const RADIUS = { sm: 10, md: 14, lg: 18, xl: 24, full: 999 } as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'home' | 'products' | 'favorites' | 'messages' | 'profile';

export type Props = {
  userType: 'simple-user' | 'businessman';
  textLanguage?: 'urdu' | 'english';
};

type DisplayProduct = {
  id: string;
  name: string;
  price: string;
  unit: string;
  farmer: string;
  location: string;
  image: string;
  category: string;
  isFeatured?: boolean;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({ w, h, r = RADIUS.md }: { w: number | string; h: number; r?: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  return (
    <Animated.View
      style={{
        width: w as any,
        height: h,
        borderRadius: r,
        backgroundColor: C.skeletonBase,
        opacity,
      }}
    />
  );
}

// ─── Category emoji map ───────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  grains: '🌾',
  veggies: '🥬',
  fruits: '🍎',
  others: '🌿',
};

function categoryEmoji(cat?: string): string {
  const key = (cat ?? 'others').toLowerCase();
  return CATEGORY_EMOJI[key] ?? '📦';
}

function formatPrice(p?: number): string {
  if (!p) return '₨—';
  return `₨${p.toLocaleString()}`;
}

function farmerLabel(farmerId?: string): string {
  if (!farmerId) return 'Verified Farmer';
  const digits = farmerId.replace(/\D/g, '');
  if (digits.length >= 4) return `Farmer ···${digits.slice(-4)}`;
  return farmerId.replace(/^device:/, 'Farmer ');
}

function toDisplayProduct(p: ProductListing, index = 0): DisplayProduct {
  return {
    id: p.id,
    name: p.name,
    price: formatPrice(p.price),
    unit: p.unit ? `/${p.unit}` : '',
    farmer: farmerLabel(p.farmer_id),
    location: p.delivery_area ?? '',
    image: normalizeProductImageUrl(p.images?.[0]) ?? productFallbackImage(p.name, p.category),
    category: p.category ?? 'others',
    isFeatured: index < 8,
  };
}

// ─── Community profile keys ───────────────────────────────────────────────────

const PROFILE_KEYS = {
  name: 'communityProfile.name',
  avatarUri: 'communityProfile.avatarUri',
} as const;

// ─── Main component ───────────────────────────────────────────────────────────

export function CommunityDashboard({ userType, textLanguage = 'english' }: Props) {
  const router = useRouter();
  const { enabled: voiceGuidanceEnabled, speak: speakVoiceGuidance } = useVoiceGuidance();
  const { width } = useWindowDimensions();
  const contentMaxWidth = Math.min(width - 32, 520);
  const isCompactGrid = width < 410;
  const gridContentWidth = contentMaxWidth - 32;
  const productCardWidth = (gridContentWidth - 12) / 2;

  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [communityName, setCommunityName] = useState('');
  const [communityAvatarUri, setCommunityAvatarUri] = useState('');
  const [communityUnread, setCommunityUnread] = useState(0);

  // ── Translation helper ─────────────────────────────────────────────────────

  const t = useCallback(
    (en: string, ur: string) => (textLanguage === 'urdu' ? ur : en),
    [textLanguage]
  );

  useEffect(() => {
    if (!voiceGuidanceEnabled || productsLoading) return;
    if (!products.length) return;
    const message = t(
      `Marketplace update: ${products.length} products available now.`,
      `مارکیٹ پلیس اپ ڈیٹ: اس وقت ${products.length} مصنوعات دستیاب ہیں۔`
    );
    void speakVoiceGuidance(message);
  }, [products.length, productsLoading, speakVoiceGuidance, t, voiceGuidanceEnabled]);

  // ── Fetch products ─────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProductsLoading(true);
      try {
        const raw = await listAllProducts({ status: 'active', limit: 200 });
        if (!cancelled) setProducts(raw.map(toDisplayProduct));
      } catch {
        // network error — show empty state
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Unread badge ───────────────────────────────────────────────────────────

  const refreshUnread = useCallback(async () => {
    try {
      const mobile_id = await getOrCreateMobileId();
      const token = await AsyncStorage.getItem('auth.access_token');
      if (!token) return;
      const [inboxRes, groupsRes] = await Promise.all([
        authFetch(`/api/v1/community/dm/inbox/${encodeURIComponent(mobile_id)}`),
        authFetch(`/api/v1/community/groups/list/${encodeURIComponent(mobile_id)}`),
      ]);
      if (!inboxRes.ok || !groupsRes.ok) return;
      const inbox = await inboxRes.json();
      const groups = await groupsRes.json();
      const dm = (inbox?.conversations ?? []).reduce((s: number, c: any) => s + (Number(c?.unread_count) || 0), 0);
      const gr = (groups?.groups ?? []).reduce((s: number, g: any) => s + (Number(g?.unread_count) || 0), 0);
      setCommunityUnread(dm + gr);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    refreshUnread();
    const id = setInterval(refreshUnread, 30_000);
    return () => clearInterval(id);
  }, [refreshUnread]);

  // ── Notifications ──────────────────────────────────────────────────────────

  useEffect(() => {
    showMobileNotificationsOnce('community-dashboard-alerts', [
      {
        id: 'order-update',
        title: t('Order update', 'آرڈر اپڈیٹ'),
        body: t('Your order status has changed to Shipped.', 'آپ کے آرڈر کی حیثیت شپڈ ہو گئی ہے۔'),
        data: { type: 'order' },
        deliverPush: false,
      },
    ]);
  }, [t]);

  // ── Profile load ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== 'profile') return;
    let cancelled = false;
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([PROFILE_KEYS.name, PROFILE_KEYS.avatarUri]);
        if (cancelled) return;
        setCommunityName(entries.find(([k]) => k === PROFILE_KEYS.name)?.[1] ?? '');
        setCommunityAvatarUri(entries.find(([k]) => k === PROFILE_KEYS.avatarUri)?.[1] ?? '');
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.category.toLowerCase() === activeCategory);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        `${p.name} ${p.farmer} ${p.location} ${p.category}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCategory, searchQuery]);

  const featuredProducts = useMemo(() => products.filter((p) => p.isFeatured).slice(0, 8), [products]);
  const favoriteProducts = useMemo(() => products.filter((p) => favorites.has(p.id)), [products, favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─── Sub-components ────────────────────────────────────────────────────────

  const Header = () => (
    <LinearGradient
      colors={[C.gradStart, C.gradEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={S.header}
    >
      <View style={[S.headerInner, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <View style={S.headerTop}>
          <View style={S.brandRow}>
            <View style={S.logoBox}>
              <MaterialCommunityIcons
                name={userType === 'businessman' ? 'account-tie' : 'account'}
                size={22}
                color="#fff"
              />
            </View>
            <View>
              <Text style={S.welcomeName}>
                {userType === 'businessman' ? t('Business User', 'بزنس یوزر') : t('User', 'یوزر')}
              </Text>
            </View>
          </View>
          <NotificationBell onHeader />
        </View>

        <View style={S.searchWrap}>
          <Feather name="search" size={18} color={C.sub} style={S.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('Search products, farmers…', 'مصنوعات، کسان تلاش کریں…')}
            placeholderTextColor={C.muted}
            style={S.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={S.clearBtn}>
              <Feather name="x" size={14} color={C.sub} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </LinearGradient>
  );

  const StatsBar = () => (
    <View style={[S.statsBar, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
      {[
        { label: t('Products', 'مصنوعات'), value: products.length, icon: 'package' as const },
        { label: t('Favorites', 'پسندیدہ'), value: favorites.size, icon: 'heart' as const },
        { label: t('Farmers', 'کسان'), value: new Set(products.map((p) => p.farmer)).size, icon: 'users' as const },
      ].map((s) => (
        <View key={s.label} style={S.statItem}>
          <View style={S.statIcon}>
            <Feather name={s.icon} size={16} color={C.primary} />
          </View>
          <Text style={S.statValue}>{productsLoading ? '–' : s.value}</Text>
          <Text style={S.statLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );

  const CategoryChips = () => {
    const cats = [
      { key: 'all', label: t('All', 'سب'), icon: '🛒' },
      { key: 'grains', label: t('Grains', 'اناج'), icon: '🌾' },
      { key: 'veggies', label: t('Veggies', 'سبزیاں'), icon: '🥬' },
      { key: 'fruits', label: t('Fruits', 'پھل'), icon: '🍎' },
    ];
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        style={{ marginTop: 14 }}
      >
        {cats.map((c) => {
          const active = activeCategory === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              activeOpacity={0.8}
              onPress={() => setActiveCategory(c.key)}
              style={[S.chip, active ? S.chipActive : S.chipMuted]}
            >
              <Text style={{ fontSize: 14 }}>{c.icon}</Text>
              <Text style={[S.chipText, active ? S.chipTextActive : S.chipTextMuted]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  // Product card for grid
  const ProductCard = ({ item }: { item: DisplayProduct }) => {
    const isImg = item.image.startsWith('http');
    const isFav = favorites.has(item.id);
    return (
      <View style={[S.productCard, { width: productCardWidth }]}>
        <View style={S.productThumb}>
          {isImg ? (
            <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 46 }}>{item.image}</Text>
          )}
          <View style={S.categoryBadge}>
            <Text style={S.categoryBadgeText}>{item.category}</Text>
          </View>
          <TouchableOpacity
            onPress={() => toggleFavorite(item.id)}
            style={[S.favBtn, isFav && { backgroundColor: '#fff0f0' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="heart" size={14} color={isFav ? C.danger : C.sub} />
          </TouchableOpacity>
        </View>
        <View style={{ padding: 10 }}>
          <Text style={S.productName} numberOfLines={2}>{item.name}</Text>
          <View style={S.farmerRow2}>
            <Feather name="user" size={10} color={C.sub} />
            <Text style={S.productSub} numberOfLines={1}>{item.farmer}</Text>
          </View>
          <View style={S.locationPill}>
            <Feather name="map-pin" size={10} color={C.primary} />
            <Text style={S.locationPillText} numberOfLines={1}>{item.location || 'Local delivery'}</Text>
          </View>
          <View style={[S.priceRow, isCompactGrid ? S.priceRowCompact : null]}>
            <View style={S.priceBlock}>
              <Text style={S.priceCaption}>Price</Text>
              <Text style={S.price}>{item.price}<Text style={S.unit}>{item.unit}</Text></Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[S.buyBtn, isCompactGrid ? S.buyBtnCompact : null]}
              onPress={() =>
                router.push({
                  pathname: '/product-buy/[productId]',
                  params: { productId: item.id },
                })
              }
            >
              <Text style={S.buyBtnText}>{t('Buy Now', 'ابھی خریدیں')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Featured horizontal card
  const FeaturedCard = ({ item }: { item: DisplayProduct }) => {
    const isImg = item.image.startsWith('http');
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={S.featuredCard}
        onPress={() =>
          router.push({ pathname: '/product-buy/[productId]', params: { productId: item.id } })
        }
      >
        <LinearGradient
          colors={[C.gradStart + 'DD', C.gradEnd + '99']}
          style={S.featuredGrad}
        >
          {isImg ? (
            <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : null}
          <View style={S.featuredOverlay}>
            {!isImg && <Text style={{ fontSize: 42 }}>{item.image}</Text>}
            <Text style={S.featuredName} numberOfLines={2}>{item.name}</Text>
            <Text style={S.featuredPrice}>{item.price}{item.unit}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Skeleton grid
  const SkeletonGrid = () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginTop: 12 }}>
      {[1, 2, 3, 4].map((k) => (
        <View key={k} style={{ width: productCardWidth, borderRadius: RADIUS.lg, overflow: 'hidden' }}>
          <SkeletonBox w="100%" h={120} r={0} />
          <View style={{ padding: 10, gap: 8 }}>
            <SkeletonBox w="80%" h={14} />
            <SkeletonBox w="50%" h={11} />
            <SkeletonBox w="60%" h={28} />
          </View>
        </View>
      ))}
    </View>
  );

  // ─── Tabs ──────────────────────────────────────────────────────────────────

  const HomeTab = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <Header />
      <View style={{ marginTop: -22 }}>
        <View style={{ paddingHorizontal: 16 }}>
          <StatsBar />
        </View>
      </View>

      {/* Featured */}
      <View style={{ marginTop: 20 }}>
        <View style={[S.sectionTitleRow, { paddingHorizontal: 16, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
          <Text style={S.sectionTitle}>{t('Featured', 'نمایاں مصنوعات')}</Text>
          <TouchableOpacity onPress={() => setActiveTab('products')}>
            <Text style={S.viewAll}>{t('See all', 'سب دیکھیں')}</Text>
          </TouchableOpacity>
        </View>
        {productsLoading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {[1, 2, 3].map((k) => <SkeletonBox key={k} w={200} h={160} r={RADIUS.lg} />)}
          </ScrollView>
        ) : featuredProducts.length === 0 ? null : (
          <FlatList
            data={featuredProducts}
            keyExtractor={(i) => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            renderItem={({ item }) => <FeaturedCard item={item} />}
          />
        )}
      </View>

      {/* Category chips */}
      <CategoryChips />

      {/* Browse grid */}
      <View style={{ marginTop: 18 }}>
        <View style={[S.sectionTitleRow, { paddingHorizontal: 16, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
          <Text style={S.sectionTitle}>{t('Fresh from Farms', 'تازہ کھیتوں سے')}</Text>
        </View>
        {productsLoading ? (
          <SkeletonGrid />
        ) : filteredProducts.length === 0 ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ fontSize: 40 }}>🌾</Text>
            <Text style={{ color: C.sub, marginTop: 10, fontWeight: '700' }}>
              {t('No products found', 'کوئی مصنوعات نہیں ملیں')}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, justifyContent: 'space-between' }}>
            {filteredProducts.slice(0, 6).map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </View>
        )}
      </View>

    </ScrollView>
  );

  const ProductsTab = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <View style={[{ paddingHorizontal: 16, paddingTop: 18 }, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <Text style={S.bigTitle}>{t('All Products', 'تمام مصنوعات')}</Text>
        <Text style={S.subText}>{t('Browse fresh farm produce', 'تازہ زرعی مصنوعات دیکھیں')}</Text>
      </View>

      <CategoryChips />

      {productsLoading ? (
        <SkeletonGrid />
      ) : filteredProducts.length === 0 ? (
        <View style={{ padding: 48, alignItems: 'center' }}>
          <Text style={{ fontSize: 44 }}>🌾</Text>
          <Text style={{ color: C.sub, marginTop: 12, fontWeight: '700', fontSize: 15 }}>
            {t('No products found', 'کوئی مصنوعات نہیں ملیں')}
          </Text>
          <TouchableOpacity
            onPress={() => { setActiveCategory('all'); setSearchQuery(''); }}
            style={{ marginTop: 14, backgroundColor: C.primary, borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 10 }}
          >
            <Text style={{ color: '#fff', fontWeight: '900' }}>{t('Clear filters', 'فلٹر ہٹائیں')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginTop: 16, justifyContent: 'space-between', maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
          {filteredProducts.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </View>
      )}
    </ScrollView>
  );

  const FavoritesTab = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <View style={[{ paddingHorizontal: 16, paddingTop: 18 }, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <Text style={S.bigTitle}>{t('Favorites', 'پسندیدہ')}</Text>
        <Text style={S.subText}>{t('Your saved products', 'آپ کی محفوظ مصنوعات')}</Text>
      </View>

      {favoriteProducts.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 60 }}>
          <Text style={{ fontSize: 52 }}>❤️</Text>
          <Text style={{ color: C.sub, marginTop: 14, fontWeight: '700', fontSize: 15 }}>
            {t('No favorites yet', 'ابھی کوئی پسندیدہ نہیں')}
          </Text>
          <Text style={{ color: C.muted, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
            {t('Tap the heart icon on any product to save it here.', 'کسی بھی مصنوعات پر دل کا آئیکن دبائیں تاکہ اسے یہاں محفوظ کریں۔')}
          </Text>
          <TouchableOpacity
            onPress={() => setActiveTab('products')}
            style={{ marginTop: 20, backgroundColor: C.primary, borderRadius: RADIUS.md, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: '900' }}>{t('Browse Products', 'مصنوعات دیکھیں')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginTop: 16, justifyContent: 'space-between', maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
          {favoriteProducts.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </View>
      )}
    </ScrollView>
  );

  // Messages tab → redirect to real inbox
  const MessagesTab = () => {
    useEffect(() => {
      router.push('/community/inbox' as any);
    }, []);
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="chat-processing-outline" size={48} color={C.primaryLight} />
        <Text style={{ color: C.sub, marginTop: 12, fontWeight: '700' }}>
          {t('Opening inbox…', 'ان باکس کھل رہا ہے…')}
        </Text>
      </View>
    );
  };

  const ProfileTab = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <View style={[{ paddingHorizontal: 16 }, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        {/* Avatar */}
        <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 20 }}>
          {communityAvatarUri ? (
            <Image source={{ uri: communityAvatarUri }} style={S.profileAvatar} />
          ) : (
            <LinearGradient colors={[C.accent, '#f59e0b']} style={S.profileAvatarGrad}>
              <Feather name="user" size={36} color="#111827" />
            </LinearGradient>
          )}
          <Text style={S.profileName}>
            {communityName?.trim() ? communityName : (userType === 'businessman' ? t('Business User', 'بزنس یوزر') : t('User', 'یوزر'))}
          </Text>
          <View style={S.rolePill}>
            <Text style={S.roleText}>
              {userType === 'businessman' ? t('Businessman', 'تاجر') : t('Simple User', 'عام یوزر')}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {[
            { label: t('Orders', 'آرڈرز'), value: '—' },
            { label: t('Favorites', 'پسندیدہ'), value: favorites.size },
            { label: t('Reviews', 'جائزے'), value: '—' },
          ].map((s) => (
            <View key={s.label} style={{ flex: 1, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 }}>
              <Text style={{ fontWeight: '900', fontSize: 18, color: C.primary }}>{s.value}</Text>
              <Text style={{ color: C.sub, fontSize: 11, fontWeight: '700', marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {[
          { key: 'orders', label: t('My Orders', 'میرے آرڈرز'), icon: 'shopping-bag' as const, onPress: () => router.push('/user-orders') },
          { key: 'messages', label: t('Messages', 'پیغامات'), icon: 'message-circle' as const, onPress: () => router.push('/community/inbox' as any) },
          { key: 'settings', label: t('Settings', 'ترتیبات'), icon: 'settings' as const, onPress: () => router.push('/community-settings') },
          { key: 'notifications', label: t('Notifications', 'اطلاعات'), icon: 'bell' as const, onPress: () => router.push('/user-notifications') },
          { key: 'privacy', label: t('Privacy Policy', 'پرائیویسی پالیسی'), icon: 'shield' as const, onPress: () => router.push('/privacy-policy') },
          { key: 'help', label: t('Help Center', 'ہیلپ سینٹر'), icon: 'help-circle' as const, onPress: () => router.push('/help-center') },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.85}
            style={S.profileRow}
            onPress={item.onPress}
            accessibilityRole="button"
          >
            <View style={S.profileRowIcon}>
              <Feather name={item.icon} size={18} color={C.primary} />
            </View>
            <Text style={S.profileRowText}>{item.label}</Text>
            <Feather name="chevron-right" size={18} color={C.muted} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          activeOpacity={0.85}
          style={S.logoutBtn}
          onPress={async () => {
            await clearAuthSession();
            router.replace('/user-type-selection');
          }}
        >
          <Feather name="log-out" size={16} color="#fff" />
          <Text style={S.logoutText}>{t('Logout', 'لاگ آؤٹ')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ─── Tab bar ───────────────────────────────────────────────────────────────

  const TabBar = () => {
    const tabs: { id: Tab; label: string; icon: React.ComponentProps<typeof Feather>['name']; badge?: number; customPress?: () => void }[] = [
      { id: 'home', label: t('Home', 'ہوم'), icon: 'home' },
      { id: 'products', label: t('Products', 'مصنوعات'), icon: 'shopping-bag' },
      { id: 'favorites', label: t('Saved', 'محفوظ'), icon: 'heart' },
      { id: 'messages', label: t('Messages', 'پیغامات'), icon: 'message-circle', badge: communityUnread, customPress: () => router.push('/community/inbox' as any) },
      { id: 'profile', label: t('Profile', 'پروفائل'), icon: 'user' },
    ];

    return (
      <View style={S.tabBarWrap}>
        <View style={[S.tabBar, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
          {tabs.map((tab) => {
            const isActive = !tab.customPress && activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={tab.customPress ?? (() => setActiveTab(tab.id))}
                activeOpacity={0.8}
                style={S.tabBtn}
              >
                <View>
                  <Feather name={tab.icon} size={20} color={isActive ? C.primary : C.muted} />
                  {tab.badge && tab.badge > 0 ? (
                    <View style={S.tabBadge}>
                      <Text style={S.tabBadgeText}>{tab.badge > 99 ? '99+' : String(tab.badge)}</Text>
                    </View>
                  ) : null}
                </View>
                {isActive && <View style={S.activeDot} />}
                <Text style={[S.tabLabel, { color: isActive ? C.primary : C.muted }]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ─── Root render ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1 }}>
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'favorites' && <FavoritesTab />}
        {activeTab === 'messages' && <MessagesTab />}
        {activeTab === 'profile' && <ProfileTab />}
        <TabBar />
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // Header
  header: { paddingTop: 18, paddingBottom: 36, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerInner: { paddingHorizontal: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: { width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  welcomeSmall: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700' },
  welcomeName: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 1 },
  searchWrap: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: RADIUS.md, height: 48, flexDirection: 'row', alignItems: 'center' },
  searchIcon: { marginLeft: 14 },
  searchInput: { flex: 1, paddingLeft: 10, paddingRight: 8, height: 48, color: C.text, fontSize: 14 },
  clearBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  // Stats bar
  statsBar: { flexDirection: 'row', backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 14, gap: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statIcon: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: 'rgba(13,92,75,0.10)', alignItems: 'center', justifyContent: 'center' },
  statValue: { fontWeight: '900', fontSize: 18, color: C.text },
  statLabel: { fontSize: 10, color: C.sub, fontWeight: '700' },

  // Chips
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: C.primary },
  chipMuted: { backgroundColor: C.border },
  chipText: { fontWeight: '800', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  chipTextMuted: { color: C.sub },

  // Section
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: C.text },
  viewAll: { color: C.primary, fontWeight: '800', fontSize: 13 },

  // Featured card
  featuredCard: { width: 200, height: 160, borderRadius: RADIUS.lg, overflow: 'hidden' },
  featuredGrad: { flex: 1 },
  featuredOverlay: { flex: 1, padding: 14, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.18)' },
  featuredName: { color: '#fff', fontWeight: '900', fontSize: 14 },
  featuredPrice: { color: '#fff', fontWeight: '700', fontSize: 12, marginTop: 2 },

  // Product card
  productCard: { backgroundColor: C.card, borderRadius: RADIUS.xl, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  productThumb: { height: 126, backgroundColor: 'rgba(16,185,129,0.14)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  categoryBadge: { position: 'absolute', left: 10, top: 10, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  categoryBadgeText: { color: C.primary, fontSize: 10, fontWeight: '900', textTransform: 'capitalize' },
  favBtn: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  productName: { fontWeight: '900', color: C.text, fontSize: 13, lineHeight: 19, minHeight: 38 },
  farmerRow2: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  productSub: { color: C.sub, fontSize: 10, fontWeight: '700', flex: 1 },
  locationPill: { marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(13,92,75,0.08)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5, maxWidth: '100%' },
  locationPillText: { color: C.primary, fontSize: 10, fontWeight: '800', flexShrink: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10, gap: 12 },
  priceRowCompact: { flexDirection: 'column', alignItems: 'stretch' },
  priceBlock: { flex: 1 },
  priceCaption: { color: C.sub, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  price: { color: C.primary, fontWeight: '900', fontSize: 15 },
  unit: { color: C.sub, fontWeight: '700', fontSize: 10 },
  buyBtn: { backgroundColor: C.primary, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', minWidth: 86 },
  buyBtnCompact: { width: '100%' },
  buyBtnText: { color: '#fff', fontWeight: '900', fontSize: 11 },

  // Farmer card
  farmerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  farmerAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  farmerName: { fontWeight: '900', color: C.text, fontSize: 14 },
  farmerMeta: { fontSize: 11, color: C.sub, fontWeight: '700' },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(245,158,11,0.14)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full },
  ratingVal: { fontWeight: '900', color: C.accentDark, fontSize: 12 },

  // Products/Favorites header
  bigTitle: { fontSize: 22, fontWeight: '900', color: C.text },
  subText: { color: C.sub, marginTop: 4, fontWeight: '700' },

  // Profile
  profileAvatar: { width: 92, height: 92, borderRadius: 46 },
  profileAvatarGrad: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  profileName: { marginTop: 12, fontWeight: '900', fontSize: 18, color: C.text },
  rolePill: { marginTop: 6, backgroundColor: 'rgba(13,92,75,0.12)', borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 5 },
  roleText: { color: C.primary, fontWeight: '800', fontSize: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: RADIUS.lg, backgroundColor: C.card, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  profileRowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(16,185,129,0.14)', alignItems: 'center', justifyContent: 'center' },
  profileRowText: { flex: 1, fontWeight: '800', color: C.text },
  logoutBtn: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.danger, borderRadius: RADIUS.lg, paddingVertical: 14 },
  logoutText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  // Tab bar
  tabBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 18 : 10, backgroundColor: 'transparent' },
  tabBar: { backgroundColor: C.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: C.border, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 12 },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 4 },
  tabLabel: { fontSize: 10, fontWeight: '800' },
  tabBadge: { position: 'absolute', top: -4, right: -10, backgroundColor: C.danger, borderRadius: 10, paddingHorizontal: 4, minWidth: 17, height: 17, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.primary, marginTop: 2 },
});
