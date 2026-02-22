import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '@/contexts/LanguageContext';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OrdersList from '@/components/OrdersList';

type ToggleKey = 'voiceAssistant' | 'darkMode' | 'push' | 'weather' | 'price';
type ActionKey = 'profile' | 'language';
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

type SettingsItem =
  | { kind: 'action'; icon: FeatherIconName; label: string; labelUrdu: string; action: ActionKey }
  | { kind: 'value'; icon: FeatherIconName; label: string; labelUrdu: string; value: string }
  | { kind: 'toggle'; icon: FeatherIconName; label: string; labelUrdu: string; toggleKey: ToggleKey };

const STORAGE_KEYS: Record<ToggleKey, string> = {
  voiceAssistant: 'settings.voiceAssistant',
  darkMode: 'settings.darkMode',
  push: 'settings.pushNotifications',
  weather: 'settings.weatherAlerts',
  price: 'settings.priceUpdates',
};

function TogglePill({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onToggle}
      style={[styles.togglePill, value ? styles.togglePillOn : styles.togglePillOff]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <View style={[styles.toggleKnob, value ? styles.toggleKnobOn : null]} />
    </TouchableOpacity>
  );
}

export default function FarmerSettingsPage() {
  const router = useRouter();
  const t = useT();
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    voiceAssistant: true,
    darkMode: false,
    push: true,
    weather: true,
    price: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const entries = await Promise.all(
          (Object.keys(STORAGE_KEYS) as ToggleKey[]).map(async (k) => {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS[k]);
            if (raw == null) return [k, undefined] as const;
            return [k, raw === 'true'] as const;
          })
        );

        if (cancelled) return;

        setToggles((prev) => {
          const next = { ...prev };
          for (const [k, v] of entries) {
            if (typeof v === 'boolean') next[k] = v;
          }
          return next;
        });
      } catch {
        // Ignore read errors; keep defaults.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setToggle = useCallback((key: ToggleKey) => {
    setToggles((prev) => {
      const nextVal = !prev[key];
      const next = { ...prev, [key]: nextVal };
      AsyncStorage.setItem(STORAGE_KEYS[key], String(nextVal)).catch(() => undefined);
      return next;
    });
  }, []);

  const settingsSections = useMemo(
    () => [
      {
        title: 'Account',
        titleUrdu: 'اکاؤنٹ',
        items: [
          { kind: 'action', icon: 'user', label: 'Edit Profile', labelUrdu: 'پروفائل میں ترمیم', action: 'profile' },
          { kind: 'value', icon: 'phone', label: 'Phone Number', labelUrdu: 'فون نمبر', value: '+92 300 1234567' },
        ] satisfies SettingsItem[],
      },
      {
        title: 'Preferences',
        titleUrdu: 'ترجیحات',
        items: [
          { kind: 'action', icon: 'globe', label: 'Language', labelUrdu: 'زبان', action: 'language' },
          { kind: 'toggle', icon: 'moon', label: 'Dark Mode', labelUrdu: 'ڈارک موڈ', toggleKey: 'darkMode' },
        ] satisfies SettingsItem[],
      },
      {
        title: 'Notifications',
        titleUrdu: 'اطلاعات',
        items: [
          { kind: 'toggle', icon: 'bell', label: 'Push Notifications', labelUrdu: 'پش نوٹیفکیشن', toggleKey: 'push' },
        ] satisfies SettingsItem[],
      },
    ],
    []
  );

  const onBack = () => {
    router.replace({ pathname: '/farmer-dashboard', params: { tab: 'profile' } });
  };

  const onAction = (action: ActionKey) => {
    if (action === 'language') {
      router.push('/language-selection');
      return;
    }

    if (action === 'profile') {
      router.push('/farmer-profile-edit');
      return;
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
          <View style={[styles.headerRow, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', justifyContent: 'space-between' }]}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.headerTitle}>{t({ english: 'Settings', urdu: 'ترتیبات' })}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onBack}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel={t({ english: 'Back', urdu: 'واپس' })}
            >
              <Feather name="arrow-left" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: horizontalPadding }} showsVerticalScrollIndicator={false}>
          {/* Profile Card */}
          <View style={{ marginTop: -18 }}>
            <View style={[styles.profileCard, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}> 
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ position: 'relative' }}>
                  <LinearGradient colors={['#0d5c4b', '#10b981']} style={styles.profileAvatar}>
                    <Feather name="user" size={28} color="#ffffff" />
                  </LinearGradient>
                  <TouchableOpacity activeOpacity={0.9} style={styles.cameraBtn} accessibilityRole="button">
                    <Feather name="camera" size={14} color="#0d5c4b" />
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 , padding: 30 }}>
                  <Text style={styles.profileName}>{t({ english: 'User Profile', urdu: 'کسان پروفائل' })}</Text>
                </View>
              </View>
            </View>

            {/* Recent Orders (preview) */}
            <View style={{ marginTop: 14 }}>
              <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
                <Text style={styles.sectionTitle}>{t({ english: 'Recent Orders', urdu: 'حالیہ آرڈرز' })}</Text>
                <OrdersList
                  orders={[
                    { id: 'ORD001', productName: 'Fresh Basmati Rice', quantity: '50 kg', price: '₨9,000', counterparty: 'Ali Traders', status: 'delivered' as const, date: 'Dec 28, 2024', image: '🌾' },
                    { id: 'ORD002', productName: 'Premium Rice', quantity: '100 kg', price: '₨18,000', counterparty: 'Karachi Foods', status: 'shipped' as const, date: 'Dec 29, 2024', image: '🌾' },
                  ]}
                  onView={(id) => router.push({ pathname: '/order-details/[orderId]', params: { orderId: id } })}
                />
              </View>
            </View>
          </View>

          {/* Settings Sections */}
          <View style={{ marginTop: 18 }}>
            <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
              {settingsSections.map((section) => (
                <View key={section.title} style={{ marginBottom: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Text style={styles.sectionTitle}>{t({ english: section.title, urdu: section.titleUrdu })}</Text>
                  </View>

                  <View style={styles.sectionCard}>
                    {section.items.map((item, idx) => {
                      const borderBottom = idx !== section.items.length - 1;
                      return (
                        <TouchableOpacity
                          key={`${section.title}:${item.label}`}
                          activeOpacity={0.9}
                          style={[styles.row, borderBottom ? styles.rowBorder : null]}
                          onPress={() => {
                            if (item.kind === 'toggle') setToggle(item.toggleKey);
                            if (item.kind === 'action') onAction(item.action);
                          }}
                        >
                          <View style={styles.rowIconBox}>
                            <Feather name={item.icon as any} size={18} color="#0d5c4b" />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.rowLabel}>{t({ english: item.label, urdu: item.labelUrdu })}</Text>
                          </View>

                          {item.kind === 'value' ? <Text style={styles.rowValue}>{item.value}</Text> : null}

                          {item.kind === 'toggle' ? (
                            <TogglePill value={toggles[item.toggleKey]} onToggle={() => setToggle(item.toggleKey)} />
                          ) : null}

                          {item.kind === 'action' ? <Feather name="chevron-right" size={18} color="#9ca3af" /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
            <TouchableOpacity activeOpacity={0.9} style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutText}>{t({ english: 'Logout', urdu: 'لاگ آؤٹ' })}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function logout() {
  // Implement logout logic here
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 18,
    paddingBottom: 42,
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

  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  cameraBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.12)',
  },
  profileName: { fontWeight: '900', color: '#111827' },
  profileMeta: { color: '#6b7280', marginTop: 3, fontSize: 12 },

  sectionTitle: { fontWeight: '900', color: '#111827' },
  sectionTitleUrdu: { color: '#6b7280', fontSize: 12 },

  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  rowIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(13,92,75,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontWeight: '800', color: '#111827' },
  rowLabelUrdu: { color: '#6b7280', marginTop: 2, fontSize: 11 },
  rowValue: { color: '#6b7280', fontSize: 13, marginLeft: 6 },

  togglePill: {
    width: 48,
    height: 28,
    borderRadius: 999,
    padding: 3,
    justifyContent: 'center',
  },
  togglePillOn: { backgroundColor: '#0d5c4b' },
  togglePillOff: { backgroundColor: '#e5e7eb' },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  toggleKnobOn: { alignSelf: 'flex-end' },
  logoutBtn: { marginTop: 8, backgroundColor: '#ef4444', borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: '#ffffff', fontWeight: '900' },
  logoutTextUrdu: { marginTop: 2, color: 'rgba(255,255,255,0.9)', fontWeight: '900' },
});
