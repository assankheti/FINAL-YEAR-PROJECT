import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import OrdersList from '@/components/OrdersList';
import { showMobileNotificationsOnce } from '@/lib/mobileNotifications';

const COMMUNITY_PROFILE_KEYS = {
  name: 'communityProfile.name',
  avatarUri: 'communityProfile.avatarUri',
} as const;

type Tab = 'home' | 'products' | 'favorites' | 'messages' | 'profile';

type Props = {
  userType: 'simple-user' | 'businessman';
  textLanguage?: 'urdu' | 'english';
};

type Product = {
  id: string;
  name: string;
  price: string;
  unit: string;
  farmer: string;
  location: string;
  rating: number;
  image: string;
  isNew?: boolean;
};

const PRODUCTS: Product[] = [
  { id: '1', name: 'Fresh Basmati Rice', price: '₨180', unit: '/kg', farmer: 'Ahmad Ali', location: 'Gujranwala', rating: 4.8, image: '🌾', isNew: true },
  { id: '2', name: 'Organic Wheat', price: '₨95', unit: '/kg', farmer: 'Hussain Khan', location: 'Multan', rating: 4.5, image: '🌾' },
  { id: '3', name: 'Fresh Vegetables Mix', price: '₨250', unit: '/kg', farmer: 'Rashid Farm', location: 'Lahore', rating: 4.9, image: '🥬', isNew: true },
  { id: '4', name: 'Premium Cotton', price: '₨450', unit: '/kg', farmer: 'Iqbal Agro', location: 'Faisalabad', rating: 4.7, image: '🌿' },
  { id: '5', name: 'Sugarcane Juice', price: '₨80', unit: '/liter', farmer: 'Sweet Farms', location: 'Sahiwal', rating: 4.6, image: '🎋' },
  { id: '6', name: 'Fresh Corn', price: '₨60', unit: '/kg', farmer: 'Kamran Shah', location: 'Okara', rating: 4.4, image: '🌽' },
];

export function CommunityDashboard({ userType, textLanguage = 'english' }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [communityName, setCommunityName] = useState<string>('');
  const [communityAvatarUri, setCommunityAvatarUri] = useState<string>('');

  const { width } = useWindowDimensions();
  const contentMaxWidth = Math.min(width - 32, 520);

  const strings = useMemo(
    () =>
      ({
        home: { english: 'Home', urdu: 'ہوم' },
        products: { english: 'Products', urdu: 'مصنوعات' },
        profile: { english: 'Profile', urdu: 'پروفائل' },
        searchPlaceholder: { english: 'Search products, farmers...', urdu: 'مصنوعات، کسان تلاش کریں...' },
        freshFromFarms: { english: 'Fresh from Farms', urdu: 'تازہ کھیتوں سے' },
        viewAll: { english: 'View All', urdu: 'سب دیکھیں' },
        buy: { english: 'Buy', urdu: 'خریدیں' },
        topFarmers: { english: 'Top Farmers', urdu: 'بہترین کسان' },
        allProducts: { english: 'All Products', urdu: 'تمام مصنوعات' },
        buyNow: { english: 'Buy Now', urdu: 'ابھی خریدیں' },
        myOrders: { english: 'My Orders', urdu: 'میرے آرڈرز' },
        favorites: { english: 'Favorites', urdu: 'پسندیدہ' },
        messages: { english: 'Messages', urdu: 'پیغامات' },
        settings: { english: 'Settings', urdu: 'ترتیبات' },
        notifications: { english: 'Notifications', urdu: 'اطلاعات' },
        privacyPolicy: { english: 'Privacy Policy', urdu: 'پرائیویسی پالیسی' },
        helpCenter: { english: 'Help Center', urdu: 'ہیلپ سینٹر' },
        logout: { english: 'Logout', urdu: 'لاگ آؤٹ' },
      }) as const,
    []
  );

  const t = useCallback((obj: any) => obj[textLanguage], [textLanguage]);

  const userName = userType === 'businessman' ? 'Business User' : 'User';

  useEffect(() => {
    showMobileNotificationsOnce('community-dashboard-alerts', [
      {
        id: 'order-update',
        title: t({ english: 'Order update', urdu: 'آرڈر اپڈیٹ' }),
        body: t({
          english: 'Your order status has changed to Shipped.',
          urdu: 'آپ کے آرڈر کی حیثیت شپڈ ہو گئی ہے۔',
        }),
        data: { type: 'order' },
      },
      {
        id: 'new-deals',
        title: t({ english: 'New deals', urdu: 'نئی ڈیلز' }),
        body: t({
          english: 'Fresh products are available near you.',
          urdu: 'آپ کے قریب تازہ مصنوعات دستیاب ہیں۔',
        }),
        data: { type: 'promo' },
      },
    ]);
  }, [t]);

  useEffect(() => {
    if (activeTab !== 'profile') return;

    let cancelled = false;
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([COMMUNITY_PROFILE_KEYS.name, COMMUNITY_PROFILE_KEYS.avatarUri]);
        if (cancelled) return;
        const name = entries.find(([k]) => k === COMMUNITY_PROFILE_KEYS.name)?.[1] ?? '';
        const avatarUri = entries.find(([k]) => k === COMMUNITY_PROFILE_KEYS.avatarUri)?.[1] ?? '';
        setCommunityName(name);
        setCommunityAvatarUri(avatarUri);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return PRODUCTS;
    return PRODUCTS.filter((p) => `${p.name} ${p.farmer} ${p.location}`.toLowerCase().includes(q));
  }, [searchQuery]);

  const favoriteProducts = useMemo(() => {
    return filteredProducts.filter((p) => favorites.includes(p.id));
  }, [favorites, filteredProducts]);

  const Header = () => (
    <LinearGradient colors={['#0d5c4b', '#10b981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
      <View style={[styles.headerInner, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}
      >
        <View style={styles.headerTop}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <MaterialCommunityIcons name="account-tie" size={22} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.welcomeName}>Ahmad Naveed</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.bellBtn}
            onPress={() => router.push('/user-notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Feather name="bell" size={18} color="#ffffff" />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <Feather name="search" size={18} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t(strings.searchPlaceholder)}
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
          />
          <TouchableOpacity activeOpacity={0.9} style={styles.filterBtn}>
            <Feather name="filter" size={14} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );

  const Categories = () => (
    <View style={[styles.sectionWrap, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}
    >
      <View style={styles.categoriesCard}>
        {[
          { key: 'grains', icon: '🌾', label: 'Grains' },
          { key: 'veggies', icon: '🥬', label: 'Veggies' },
          { key: 'fruits', icon: '🍎', label: 'Fruits' },
          { key: 'others', icon: '🌿', label: 'Others' },
        ].map((c) => (
          <TouchableOpacity
            key={c.key}
            activeOpacity={0.9}
            style={styles.categoryBtn}
            onPress={() => router.push({ pathname: '/category-products/[category]', params: { category: c.key } })}
            accessibilityRole="button"
            accessibilityLabel={`Open ${c.label} products`}
          >
            <View style={styles.categoryIcon}><Text style={{ fontSize: 22 }}>{c.icon}</Text></View>
            <Text style={styles.categoryLabel}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const ProductGrid = () => (
    <View style={[styles.sectionWrap, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}
    >
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>{t(strings.freshFromFarms)}</Text>
        <TouchableOpacity activeOpacity={0.9}><Text style={styles.viewAll}>{t(strings.viewAll)}</Text></TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {filteredProducts.slice(0, 4).map((p) => (
          <View key={p.id} style={styles.productCard}>
            <View style={styles.productTop}>
              <Text style={{ fontSize: 44 }}>{p.image}</Text>
              {p.isNew ? (
                <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
              ) : null}
              <TouchableOpacity activeOpacity={0.9} onPress={() => toggleFavorite(p.id)} style={styles.favBtn}>
                <Feather name="heart" size={14} color={favorites.includes(p.id) ? '#ef4444' : '#6b7280'} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 12 }}>
              <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
              <View style={styles.ratingRow}>
                <Feather name="star" size={12} color="#f59e0b" />
                <Text style={styles.ratingText}>{p.rating}</Text>
                <Text style={styles.ratingDot}>•</Text>
                <Text style={styles.ratingText}>{p.location}</Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.price}>{p.price}<Text style={styles.unit}>{p.unit}</Text></Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.buyBtn}
                  onPress={() => router.push({ pathname: '/product-buy/[productId]', params: { productId: p.id } })}
                >
                  <Text style={styles.buyBtnText}>{t(strings.buy)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const TopFarmers = () => (
    <View style={[styles.sectionWrap, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}
    >
      <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>{t(strings.topFarmers)}</Text>
      <View style={{ gap: 10 }}>
        {[{ name: 'Ahmad Ali', location: 'Gujranwala', products: 12, rating: 4.9 }, { name: 'Hussain Khan', location: 'Multan', products: 8, rating: 4.7 }].map((f) => (
          <View key={f.name} style={styles.farmerRow}>
            <LinearGradient colors={['#0d5c4b', '#10b981']} style={styles.farmerAvatar}>
              <Text style={{ fontSize: 18 }}>👨‍🌾</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.farmerName}>{f.name}</Text>
              <View style={styles.farmerMetaRow}>
                <Feather name="map-pin" size={12} color="#6b7280" />
                <Text style={styles.farmerMeta}>{f.location}</Text>
                <Text style={styles.ratingDot}>•</Text>
                <Text style={styles.farmerMeta}>{f.products} products</Text>
              </View>
            </View>
            <View style={styles.farmerRatingPill}>
              <Feather name="star" size={12} color="#f59e0b" />
              <Text style={styles.farmerRatingText}>{f.rating}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const HomeTab = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <Header />
      <View style={{ marginTop: -18 }}>
        <Categories />
      </View>
      <ProductGrid />
      <TopFarmers />
    </ScrollView>
  );

  const ProductsTab = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.plainHeader, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}
      >
        <Text style={styles.bigTitle}>{t(strings.allProducts)}</Text>
        <Text style={styles.subTitle}>{textLanguage === 'urdu' ? 'تمام مصنوعات' : 'All products'}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 10 }}>
          {['All', 'Rice', 'Wheat', 'Vegetables', 'Cotton', 'Fruits'].map((f, idx) => (
            <View key={f} style={[styles.chip, idx === 0 ? styles.chipActive : styles.chipMuted]}>
              <Text style={[styles.chipText, idx === 0 ? styles.chipTextActive : styles.chipTextMuted]}>{f}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={{ gap: 12, marginTop: 6 }}>
          {filteredProducts.map((p) => (
            <View key={p.id} style={styles.productRow}>
              <View style={styles.productRowImg}><Text style={{ fontSize: 28 }}>{p.image}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.productRowName}>{p.name}</Text>
                <Text style={styles.productRowSub}>{p.farmer} • {p.location}</Text>
                <View style={styles.ratingRow}>
                  <Feather name="star" size={12} color="#f59e0b" />
                  <Text style={styles.ratingText}>{p.rating}</Text>
                </View>
                <View style={styles.rowBottom}>
                  <Text style={styles.rowPrice}>{p.price}<Text style={styles.unit}>{p.unit}</Text></Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => toggleFavorite(p.id)}
                      style={styles.iconBtn}
                      accessibilityRole="button"
                      accessibilityLabel={favorites.includes(p.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Feather name="heart" size={14} color={favorites.includes(p.id) ? '#ef4444' : '#0d5c4b'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.iconBtn}
                      onPress={() => router.push({ pathname: '/call/[contactId]', params: { contactId: p.farmer } })}
                    >
                      <Feather name="phone" size={14} color="#0d5c4b" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.buyBtnWide}
                      onPress={() => router.push({ pathname: '/product-buy/[productId]', params: { productId: p.id } })}
                    >
                      <Text style={styles.buyBtnText}>{t(strings.buyNow)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const FavoritesTab = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.plainHeader, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}
      >
        <Text style={styles.bigTitle}>{t(strings.favorites)}</Text>
        <Text style={styles.subTitle}>{textLanguage === 'urdu' ? 'پسندیدہ مصنوعات' : 'Your favorite products'}</Text>

        <View style={{ gap: 12, marginTop: 14 }}>
          {favoriteProducts.length === 0 ? (
            <View style={{ paddingVertical: 18 }}>
              <Text style={{ color: '#6b7280', fontWeight: '800' }}>
                {textLanguage === 'urdu' ? 'ابھی کوئی پسندیدہ مصنوعات نہیں۔' : 'No favorite products yet.'}
              </Text>
            </View>
          ) : (
            favoriteProducts.map((p) => (
              <View key={p.id} style={styles.productRow}>
                <View style={styles.productRowImg}><Text style={{ fontSize: 28 }}>{p.image}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productRowName}>{p.name}</Text>
                  <Text style={styles.productRowSub}>{p.farmer} • {p.location}</Text>
                  <View style={styles.ratingRow}>
                    <Feather name="star" size={12} color="#f59e0b" />
                    <Text style={styles.ratingText}>{p.rating}</Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <Text style={styles.rowPrice}>{p.price}<Text style={styles.unit}>{p.unit}</Text></Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => toggleFavorite(p.id)}
                        style={styles.iconBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Remove from favorites"
                      >
                        <Feather name="heart" size={14} color="#ef4444" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.buyBtnWide}
                        onPress={() => router.push({ pathname: '/product-buy/[productId]', params: { productId: p.id } })}
                      >
                        <Text style={styles.buyBtnText}>{t(strings.buyNow)}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );

  const MessagesTab = () => {
    const chats = [
      { id: 'Ahmad Ali', name: 'Ahmad Ali', last: textLanguage === 'urdu' ? 'السلام علیکم، کیا قیمت ہے؟' : 'Assalam o Alaikum, what is the price?', time: '10:12', unread: 2 },
      { id: 'Hussain Khan', name: 'Hussain Khan', last: textLanguage === 'urdu' ? 'جی، دستیاب ہے۔' : 'Yes, it is available.', time: 'Yesterday', unread: 0 },
    ];

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.plainHeader, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}
        >
          <Text style={styles.bigTitle}>{t(strings.messages)}</Text>
          <Text style={styles.subTitle}>{textLanguage === 'urdu' ? 'اپنی گفتگو دیکھیں' : 'Your chats'}</Text>

          <View style={{ gap: 12, marginTop: 14 }}>
            {chats.map((c) => (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.9}
                style={styles.chatRow}
                onPress={() => router.push({ pathname: '/chat/[contactId]', params: { contactId: c.id } })}
                accessibilityRole="button"
                accessibilityLabel={`Open chat with ${c.name}`}
              >
                <LinearGradient colors={['#0d5c4b', '#10b981']} style={styles.chatAvatar}>
                  <Feather name="user" size={18} color="#ffffff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <View style={styles.chatTop}>
                    <Text style={styles.chatName}>{c.name}</Text>
                    <Text style={styles.chatTime}>{c.time}</Text>
                  </View>
                  <Text style={styles.chatMsg} numberOfLines={1}>{c.last}</Text>
                </View>
                {c.unread > 0 ? (
                  <View style={styles.unreadPill}>
                    <Text style={styles.unreadText}>{c.unread}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  const ProfileTab = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.plainHeader, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}
      >
        <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 14 }}>
          {communityAvatarUri ? (
            <View style={styles.profileAvatar}>
              <Image source={{ uri: communityAvatarUri }} style={styles.profileAvatarImg} />
            </View>
          ) : (
            <LinearGradient colors={['#fbbf24', '#f59e0b']} style={styles.profileAvatar}>
              <Feather name="user" size={34} color="#111827" />
            </LinearGradient>
          )}
          <Text style={styles.profileName}>{communityName?.trim() ? communityName : userName}</Text>
          <Text style={styles.profileRole}>{userType === 'businessman' ? 'Businessman' : 'Simple User'}</Text>
        </View>

        {[
          {
            key: 'orders' as const,
            label: t(strings.myOrders),
            icon: 'shopping-bag' as const,
            onPress: () => router.push('/user-orders'),
          },
          {
            key: 'settings' as const,
            label: t(strings.settings),
            icon: 'settings' as const,
            onPress: () => router.push('/community-settings'),
          },
          {
            key: 'notifications' as const,
            label: t(strings.notifications),
            icon: 'bell' as const,
            onPress: () => router.push('/user-notifications'),
          },
          {
            key: 'privacy' as const,
            label: t(strings.privacyPolicy),
            icon: 'shield' as const,
            onPress: () => router.push('/privacy-policy'),
          },
          {
            key: 'help' as const,
            label: t(strings.helpCenter),
            icon: 'help-circle' as const,
            onPress: () => router.push('/help-center'),
          },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.9}
            style={styles.profileRow}
            onPress={item.onPress}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <View style={styles.profileIcon}>
              <Feather name={item.icon} size={18} color="#0d5c4b" />
            </View>
            <Text style={styles.profileRowText}>{item.label}</Text>
            <Feather name="chevron-right" size={18} color="#9ca3af" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity activeOpacity={0.9} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>{t(strings.logout)}</Text>
        </TouchableOpacity>
      </View>
      
    </ScrollView>
  );

  const TabBar = () => (
    <View style={styles.tabBarWrap}>
      <View style={[styles.tabBar, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        {[
          { id: 'home' as const, label: t(strings.home), icon: 'home' as const },
          { id: 'products' as const, label: t(strings.products), icon: 'shopping-bag' as const },
          { id: 'favorites' as const, label: t(strings.favorites), icon: 'heart' as const },
          { id: 'messages' as const, label: t(strings.messages), icon: 'message-circle' as const },
          { id: 'profile' as const, label: t(strings.profile), icon: 'user' as const },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => {
                setActiveTab(tab.id);
              }}
              activeOpacity={0.9}
              style={[styles.tabBtn, isActive ? styles.tabBtnActive : null]}
            >
              <Feather name={tab.icon} size={20} color={isActive ? '#0d5c4b' : '#6b7280'} />
              <Text style={[styles.tabLabel, { color: isActive ? '#0d5c4b' : '#6b7280' }]} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f1e8' }}>
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

const styles = StyleSheet.create({
  header: { paddingTop: 18, paddingBottom: 34, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerInner: { paddingHorizontal: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  welcomeSmall: { color: 'rgba(255,255,255,0.78)', fontSize: 12 },
  welcomeName: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 2 },
  bellBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 10, right: 11, width: 10, height: 10, borderRadius: 5, backgroundColor: '#f59e0b', borderWidth: 2, borderColor: '#0d5c4b' },

  searchWrap: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, height: 48, justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 14 },
  searchInput: { paddingLeft: 42, paddingRight: 52, height: 48, color: '#111827', fontSize: 14 },
  filterBtn: { position: 'absolute', right: 10, width: 32, height: 32, borderRadius: 10, backgroundColor: '#0d5c4b', alignItems: 'center', justifyContent: 'center' },

  sectionWrap: { paddingHorizontal: 16, marginTop: 16 },
  categoriesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  categoryBtn: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8 },
  categoryIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(16,185,129,0.18)', alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { marginTop: 6, fontSize: 11, fontWeight: '700', color: '#111827' },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  viewAll: { color: '#0d5c4b', fontWeight: '800' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  productCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  productTop: { height: 112, backgroundColor: 'rgba(16,185,129,0.18)', alignItems: 'center', justifyContent: 'center' },
  newBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#f59e0b', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  newBadgeText: { fontSize: 10, fontWeight: '900', color: '#111827' },
  favBtn: { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  productName: { fontWeight: '900', color: '#111827', fontSize: 13 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  ratingText: { fontSize: 11, color: '#6b7280', fontWeight: '700' },
  ratingDot: { fontSize: 11, color: '#9ca3af', fontWeight: '900' },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  price: { color: '#0d5c4b', fontWeight: '900' },
  unit: { color: '#6b7280', fontWeight: '700', fontSize: 11 },
  buyBtn: { backgroundColor: '#0d5c4b', borderRadius: 10, height: 32, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  buyBtnWide: { backgroundColor: '#0d5c4b', borderRadius: 10, height: 36, minWidth: 72, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  buyBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },

  farmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  farmerAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  farmerName: { fontWeight: '900', color: '#111827' },
  farmerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  farmerMeta: { fontSize: 11, color: '#6b7280', fontWeight: '700' },
  farmerRatingPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  farmerRatingText: { fontWeight: '900', color: '#b45309', fontSize: 12 },

  plainHeader: { paddingHorizontal: 16, paddingTop: 18 },
  bigTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
  subTitle: { color: '#6b7280', marginTop: 6 },

  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: '#0d5c4b' },
  chipMuted: { backgroundColor: '#e5e7eb' },
  chipText: { fontWeight: '900', fontSize: 12 },
  chipTextActive: { color: '#ffffff' },
  chipTextMuted: { color: '#6b7280' },

  productRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  productRowImg: { width: 72, height: 72, borderRadius: 16, backgroundColor: 'rgba(16,185,129,0.18)', alignItems: 'center', justifyContent: 'center' },
  productRowName: { fontWeight: '900', color: '#111827' },
  productRowSub: { color: '#6b7280', fontWeight: '700', marginTop: 4, fontSize: 12 },
  rowBottom: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowPrice: { color: '#0d5c4b', fontWeight: '900', fontSize: 16 },
  iconBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(16,185,129,0.08)', alignItems: 'center', justifyContent: 'center' },

  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  chatAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  chatTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chatName: { fontWeight: '900', color: '#111827' },
  chatTime: { color: '#9ca3af', fontWeight: '800', fontSize: 11 },
  chatMsg: { color: '#6b7280', fontWeight: '700', marginTop: 4, fontSize: 12 },
  unreadPill: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#111827', fontWeight: '900', fontSize: 12 },

  profileAvatar: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  profileAvatarImg: { width: 92, height: 92, borderRadius: 46 },
  profileName: { marginTop: 12, fontWeight: '900', fontSize: 18, color: '#111827' },
  profileRole: { marginTop: 6, color: '#6b7280', fontWeight: '700' },
  profileRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  profileIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(16,185,129,0.16)', alignItems: 'center', justifyContent: 'center' },
  profileRowText: { flex: 1, fontWeight: '800', color: '#111827' },
  logoutBtn: { marginTop: 18, backgroundColor: '#ef4444', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: '#ffffff', fontWeight: '900' },

  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 18 : 12,
  },
  tabBar: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  tabBtnActive: {},
  tabLabel: { fontSize: 11, fontWeight: '800' },
});
