import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { coerceAppLanguage, useLanguage, useT } from '@/contexts/LanguageContext';
import { API_BASE } from '@/config/env';
import { getOrCreateMobileId } from '@/lib/deviceId';

type SettingsVariant = 'farmer' | 'community';
type ToggleKey = 'voiceAssistant' | 'darkMode' | 'push' | 'weather' | 'price';
type ActionKey = 'profile' | 'language' | 'help' | 'privacy' | 'orders';
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

type SettingsItem =
  | {
      kind: 'action';
      icon: FeatherIconName;
      label: string;
      labelUrdu: string;
      description: string;
      descriptionUrdu: string;
      action: ActionKey;
    }
  | {
      kind: 'value';
      icon: FeatherIconName;
      label: string;
      labelUrdu: string;
      description: string;
      descriptionUrdu: string;
      value: string;
    }
  | {
      kind: 'toggle';
      icon: FeatherIconName;
      label: string;
      labelUrdu: string;
      description: string;
      descriptionUrdu: string;
      toggleKey: ToggleKey;
    };

type SettingsSection = {
  title: string;
  titleUrdu: string;
  icon: FeatherIconName;
  items: SettingsItem[];
};

type FarmerProfile = {
  name: string;
  phone: string;
  location: string;
  farmSize: string;
  crop: string;
  imageUri: string | null;
};

const STORAGE_KEYS: Record<ToggleKey, string> = {
  voiceAssistant: 'settings.voiceAssistant',
  darkMode: 'settings.darkMode',
  push: 'settings.pushNotifications',
  weather: 'settings.weatherAlerts',
  price: 'settings.priceUpdates',
};

const API_TOGGLE_KEYS: Record<ToggleKey, string> = {
  voiceAssistant: 'voice_assistant',
  darkMode: 'dark_mode',
  push: 'push_notifications',
  weather: 'weather_alerts',
  price: 'price_updates',
};

type SavedUserSettings = Partial<Record<(typeof API_TOGGLE_KEYS)[ToggleKey], boolean>> & {
  language?: 'en' | 'ur' | 'english' | 'urdu';
  voice?: 'en' | 'ur' | 'english' | 'urdu';
  selected_crops?: string[];
};

const FARMER_PROFILE_STORAGE_KEY = 'farmer.profile';

const DEFAULT_FARMER_PROFILE: FarmerProfile = {
  name: '',
  phone: '',
  location: 'Punjab',
  farmSize: '',
  crop: '',
  imageUri: null,
};

function readSavedToggle(settings: SavedUserSettings, key: ToggleKey): boolean | undefined {
  const value = settings[API_TOGGLE_KEYS[key] as keyof SavedUserSettings];
  return typeof value === 'boolean' ? value : undefined;
}

function TogglePill({
  value,
  compact,
}: {
  value: boolean;
  compact: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.togglePill,
        compact ? styles.togglePillCompact : null,
        value ? styles.togglePillOn : styles.togglePillOff,
      ]}
    >
      <View style={[styles.toggleKnob, compact ? styles.toggleKnobCompact : null, value ? styles.toggleKnobOn : null]} />
    </View>
  );
}

export default function SettingsScreen({ variant }: { variant: SettingsVariant }) {
  const router = useRouter();
  const t = useT();
  const { textLanguage, voiceLanguage, setTextLanguage, setVoiceLanguage } = useLanguage();
  const { width } = useWindowDimensions();
  const isTiny = width < 350;
  const isCompact = width < 380;
  const horizontalPadding = Math.max(18, Math.min(28, Math.round(width * 0.06)));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 540);
  const isFarmer = variant === 'farmer';

  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    voiceAssistant: true,
    darkMode: false,
    push: true,
    weather: true,
    price: true,
  });
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfile>(DEFAULT_FARMER_PROFILE);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const entries = await Promise.all(
          (Object.keys(STORAGE_KEYS) as ToggleKey[]).map(async (key) => {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS[key]);
            if (raw == null) return [key, undefined] as const;
            return [key, raw === 'true'] as const;
          })
        );

        if (cancelled) return;

        setToggles((prev) => {
          const next = { ...prev };
          for (const [key, value] of entries) {
            if (typeof value === 'boolean') next[key] = value;
          }
          return next;
        });
      } catch {
        // Keep defaults if local storage is unavailable.
      }

      try {
        const mobileId = await getOrCreateMobileId();
        const res = await fetch(`${API_BASE}/api/v1/user/devicesetting/${mobileId}`);
        if (!res.ok) return;

        const saved = (await res.json()) as SavedUserSettings;
        if (cancelled) return;

        if (saved.language) {
          setTextLanguage(coerceAppLanguage(saved.language, textLanguage));
        }
        if (saved.voice) {
          setVoiceLanguage(coerceAppLanguage(saved.voice, voiceLanguage));
        }
        if (Array.isArray(saved.selected_crops) && saved.selected_crops[0]) {
          setFarmerProfile((prev) => ({
            ...prev,
            crop: prev.crop.trim() ? prev.crop : String(saved.selected_crops?.[0] ?? ''),
          }));
        }

        const entriesToPersist: [string, string][] = [];
        setToggles((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(STORAGE_KEYS) as ToggleKey[]) {
            const value = readSavedToggle(saved, key);
            if (typeof value === 'boolean') {
              next[key] = value;
              entriesToPersist.push([STORAGE_KEYS[key], String(value)]);
            }
          }
          return next;
        });

        if (entriesToPersist.length) {
          AsyncStorage.multiSet(entriesToPersist).catch(() => undefined);
        }
      } catch (err) {
        console.error('Failed to load saved user settings:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setTextLanguage, setVoiceLanguage, textLanguage, voiceLanguage]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        try {
          const [[, rawProfile], [, authPhone]] = await AsyncStorage.multiGet([
            FARMER_PROFILE_STORAGE_KEY,
            'auth.phone_number',
          ]);

          if (cancelled) return;

          let parsedProfile: Partial<FarmerProfile> = {};
          if (rawProfile) {
            try {
              parsedProfile = JSON.parse(rawProfile) as Partial<FarmerProfile>;
            } catch {
              parsedProfile = {};
            }
          }

          setFarmerProfile((prev) => ({
            ...DEFAULT_FARMER_PROFILE,
            ...prev,
            ...parsedProfile,
            phone: parsedProfile.phone || authPhone || prev.phone,
          }));
        } catch (err) {
          console.error('Failed to load farmer profile for settings:', err);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  const syncToggleToDatabase = useCallback(async (key: ToggleKey, value: boolean) => {
    try {
      const mobileId = await getOrCreateMobileId();
      const res = await fetch(`${API_BASE}/api/v1/user/devicesetting/${mobileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [API_TOGGLE_KEYS[key]]: value }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Failed with status ${res.status}`);
      }
    } catch (err) {
      console.error('Failed to save user setting:', err);
    }
  }, []);

  const setToggle = useCallback((key: ToggleKey) => {
    setToggles((prev) => {
      const nextValue = !prev[key];
      const next = { ...prev, [key]: nextValue };
      AsyncStorage.setItem(STORAGE_KEYS[key], String(nextValue)).catch(() => undefined);
      syncToggleToDatabase(key, nextValue);
      return next;
    });
  }, [syncToggleToDatabase]);

  const farmerName = farmerProfile.name.trim();
  const farmerPhone = farmerProfile.phone.trim() || '+92 300 1234567';
  const farmerLocation = farmerProfile.location.trim() || 'Punjab';
  const farmerCrop = farmerProfile.crop.trim() || 'Rice';

  const settingsSections = useMemo<SettingsSection[]>(
    () =>
      isFarmer
        ? [
            {
              title: 'Account',
              titleUrdu: 'اکاؤنٹ',
              icon: 'user',
              items: [
                {
                  kind: 'action',
                  icon: 'edit-3',
                  label: 'Edit Profile',
                  labelUrdu: 'پروفائل میں ترمیم',
                  description: 'Update name, crop, farm size and photo',
                  descriptionUrdu: 'نام، فصل، زمین اور تصویر تبدیل کریں',
                  action: 'profile',
                },
                {
                  kind: 'value',
                  icon: 'phone',
                  label: 'Phone Number',
                  labelUrdu: 'فون نمبر',
                  description: 'Used for OTP and account recovery',
                  descriptionUrdu: 'OTP اور اکاؤنٹ ریکوری کے لیے',
                  value: farmerPhone,
                },
                {
                  kind: 'value',
                  icon: 'map-pin',
                  label: 'Farm Location',
                  labelUrdu: 'فارم کا مقام',
                  description: 'Improves weather and crop guidance',
                  descriptionUrdu: 'موسم اور فصل کی رہنمائی بہتر بناتا ہے',
                  value: farmerLocation,
                },
              ],
            },
            {
              title: 'Preferences',
              titleUrdu: 'ترجیحات',
              icon: 'sliders',
              items: [
                {
                  kind: 'action',
                  icon: 'globe',
                  label: 'Language',
                  labelUrdu: 'زبان',
                  description: 'Change app text and voice language',
                  descriptionUrdu: 'ایپ کی زبان اور آواز تبدیل کریں',
                  action: 'language',
                },
                {
                  kind: 'toggle',
                  icon: 'volume-2',
                  label: 'Voice Assistant',
                  labelUrdu: 'وائس اسسٹنٹ',
                  description: 'Hear important guidance aloud',
                  descriptionUrdu: 'اہم رہنمائی آواز میں سنیں',
                  toggleKey: 'voiceAssistant',
                },
                {
                  kind: 'toggle',
                  icon: 'moon',
                  label: 'Dark Mode',
                  labelUrdu: 'ڈارک موڈ',
                  description: 'Use a darker interface at night',
                  descriptionUrdu: 'رات کے لیے گہرا انٹرفیس',
                  toggleKey: 'darkMode',
                },
              ],
            },
            {
              title: 'Alerts',
              titleUrdu: 'الرٹس',
              icon: 'bell',
              items: [
                {
                  kind: 'toggle',
                  icon: 'bell',
                  label: 'Push Notifications',
                  labelUrdu: 'پش نوٹیفکیشن',
                  description: 'Receive important app updates',
                  descriptionUrdu: 'اہم ایپ اپڈیٹس حاصل کریں',
                  toggleKey: 'push',
                },
                {
                  kind: 'toggle',
                  icon: 'cloud-rain',
                  label: 'Weather Alerts',
                  labelUrdu: 'موسم کے الرٹس',
                  description: 'Rain, heat and irrigation reminders',
                  descriptionUrdu: 'بارش، گرمی اور آبپاشی یاددہانی',
                  toggleKey: 'weather',
                },
                {
                  kind: 'toggle',
                  icon: 'trending-up',
                  label: 'Price Updates',
                  labelUrdu: 'قیمت کی اپڈیٹس',
                  description: 'Market movement and selling signals',
                  descriptionUrdu: 'مارکیٹ اور فروخت کے اشارے',
                  toggleKey: 'price',
                },
              ],
            },
            {
              title: 'Support',
              titleUrdu: 'مدد',
              icon: 'help-circle',
              items: [
                {
                  kind: 'action',
                  icon: 'help-circle',
                  label: 'Help Center',
                  labelUrdu: 'مدد کا مرکز',
                  description: 'FAQs and troubleshooting',
                  descriptionUrdu: 'عام سوالات اور حل',
                  action: 'help',
                },
                {
                  kind: 'action',
                  icon: 'shield',
                  label: 'Privacy Policy',
                  labelUrdu: 'رازداری کی پالیسی',
                  description: 'How your data is handled',
                  descriptionUrdu: 'آپ کے ڈیٹا کا استعمال',
                  action: 'privacy',
                },
              ],
            },
          ]
        : [
            {
              title: 'Account',
              titleUrdu: 'اکاؤنٹ',
              icon: 'user',
              items: [
                {
                  kind: 'value',
                  icon: 'phone',
                  label: 'Phone Number',
                  labelUrdu: 'فون نمبر',
                  description: 'Used for OTP and account recovery',
                  descriptionUrdu: 'OTP اور اکاؤنٹ ریکوری کے لیے',
                  value: farmerPhone,
                },
                {
                  kind: 'value',
                  icon: 'briefcase',
                  label: 'Account Type',
                  labelUrdu: 'اکاؤنٹ کی قسم',
                  description: 'Marketplace buyer profile',
                  descriptionUrdu: 'مارکیٹ پلیس خریدار پروفائل',
                  value: 'Community',
                },
              ],
            },
            {
              title: 'Preferences',
              titleUrdu: 'ترجیحات',
              icon: 'sliders',
              items: [
                {
                  kind: 'action',
                  icon: 'globe',
                  label: 'Language',
                  labelUrdu: 'زبان',
                  description: 'Change app text and voice language',
                  descriptionUrdu: 'ایپ کی زبان اور آواز تبدیل کریں',
                  action: 'language',
                },
                {
                  kind: 'toggle',
                  icon: 'moon',
                  label: 'Dark Mode',
                  labelUrdu: 'ڈارک موڈ',
                  description: 'Use a darker interface at night',
                  descriptionUrdu: 'رات کے لیے گہرا انٹرفیس',
                  toggleKey: 'darkMode',
                },
              ],
            },
            {
              title: 'Notifications',
              titleUrdu: 'اطلاعات',
              icon: 'bell',
              items: [
                {
                  kind: 'toggle',
                  icon: 'bell',
                  label: 'Push Notifications',
                  labelUrdu: 'پش نوٹیفکیشن',
                  description: 'Orders, chat and marketplace updates',
                  descriptionUrdu: 'آرڈرز، چیٹ اور مارکیٹ اپڈیٹس',
                  toggleKey: 'push',
                },
              ],
            },
            {
              title: 'Support',
              titleUrdu: 'مدد',
              icon: 'help-circle',
              items: [
                {
                  kind: 'action',
                  icon: 'shopping-bag',
                  label: 'My Orders',
                  labelUrdu: 'میرے آرڈرز',
                  description: 'Track purchases and order history',
                  descriptionUrdu: 'خریداری اور آرڈر ہسٹری دیکھیں',
                  action: 'orders',
                },
                {
                  kind: 'action',
                  icon: 'help-circle',
                  label: 'Help Center',
                  labelUrdu: 'مدد کا مرکز',
                  description: 'FAQs and troubleshooting',
                  descriptionUrdu: 'عام سوالات اور حل',
                  action: 'help',
                },
                {
                  kind: 'action',
                  icon: 'shield',
                  label: 'Privacy Policy',
                  labelUrdu: 'رازداری کی پالیسی',
                  description: 'How your data is handled',
                  descriptionUrdu: 'آپ کے ڈیٹا کا استعمال',
                  action: 'privacy',
                },
              ],
            },
          ],
    [farmerLocation, farmerPhone, isFarmer]
  );

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(
      isFarmer
        ? { pathname: '/farmer-dashboard', params: { tab: 'profile', textLanguage, voiceLanguage } }
        : { pathname: '/community-dashboard', params: { textLanguage, voiceLanguage } }
    );
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

    if (action === 'orders') {
      router.push('/user-orders');
      return;
    }

    if (action === 'help') {
      router.push('/help-center');
      return;
    }

    if (action === 'privacy') {
      router.push('/privacy-policy');
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([
      'auth.access_token',
      'auth.token_type',
      'auth.user_id',
      'auth.phone_number',
      'auth.otp_method_id',
    ]);
    router.replace({ pathname: '/user-type-selection', params: { textLanguage, voiceLanguage } });
  };

  const title = t({ english: 'Settings', urdu: 'ترتیبات' });
  const subtitle = t({
    english: isFarmer ? 'Manage your farm account and alerts' : 'Manage your marketplace account',
    urdu: isFarmer ? 'اپنا کسان اکاؤنٹ اور الرٹس سنبھالیں' : 'اپنا مارکیٹ پلیس اکاؤنٹ سنبھالیں',
  });
  const defaultProfileTitle = t({
    english: isFarmer ? 'Farmer Profile' : 'Community Profile',
    urdu: isFarmer ? 'کسان پروفائل' : 'کمیونٹی پروفائل',
  });
  const profileTitle = isFarmer && farmerName ? farmerName : defaultProfileTitle;
  const profileMeta = t({
    english: isFarmer ? `${farmerCrop} Farmer • ${farmerLocation}` : 'Marketplace Member',
    urdu: isFarmer ? `${farmerCrop} کسان • ${farmerLocation}` : 'مارکیٹ پلیس ممبر',
  });
  const textLanguageLabel = textLanguage === 'urdu' ? 'Urdu' : 'English';
  const voiceLanguageLabel = voiceLanguage === 'urdu' ? 'Urdu' : 'English';

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
              activeOpacity={0.9}
              onPress={goBack}
              style={[styles.backBtn, isTiny ? styles.backBtnTiny : null]}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t({ english: 'Back', urdu: 'واپس' })}
            >
              <Feather name="arrow-left" size={isTiny ? 18 : 19} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.headerCopy}>
              <Text style={[styles.headerTitle, isCompact ? styles.headerTitleCompact : null]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.headerSub} numberOfLines={2}>
                {subtitle}
              </Text>
            </View>

            <View style={[styles.headerIcon, isTiny ? styles.headerIconTiny : null]}>
              <Feather name="settings" size={isTiny ? 18 : 20} color="#ffffff" />
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isTiny ? styles.scrollContentTiny : null,
            { paddingHorizontal: horizontalPadding, paddingBottom: 28 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contentWrap, { maxWidth: contentMaxWidth }]}>
            <View style={[styles.profileCard, isTiny ? styles.profileCardTiny : null]}>
              <View style={styles.profileTopRow}>
                {isFarmer && farmerProfile.imageUri ? (
                  <Image
                    source={{ uri: farmerProfile.imageUri }}
                    style={[styles.profileAvatar, styles.profileAvatarImage, isTiny ? styles.profileAvatarTiny : null]}
                  />
                ) : (
                  <LinearGradient colors={['#0d5c4b', '#10b981']} style={[styles.profileAvatar, isTiny ? styles.profileAvatarTiny : null]}>
                    <Feather name={isFarmer ? 'user' : 'shopping-bag'} size={isTiny ? 22 : 26} color="#ffffff" />
                  </LinearGradient>
                )}

                <View style={styles.profileCopy}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {profileTitle}
                  </Text>
                  <Text style={styles.profileMeta} numberOfLines={2}>
                    {profileMeta}
                  </Text>
                </View>

                {isFarmer ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.editBtn, isTiny ? styles.editBtnTiny : null]}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    onPress={() => onAction('profile')}
                    accessibilityRole="button"
                    accessibilityLabel={t({ english: 'Edit profile', urdu: 'پروفائل میں ترمیم' })}
                  >
                    <Feather name="edit-3" size={16} color="#0d5c4b" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.profileChips}>
                <View style={styles.profileChip}>
                  <Feather name={isFarmer ? 'map-pin' : 'shopping-bag'} size={13} color="#0d5c4b" />
                  <Text style={styles.profileChipText} numberOfLines={1}>
                    {isFarmer ? farmerLocation : 'Community'}
                  </Text>
                </View>
                <View style={styles.profileChip}>
                  <Feather name="shield" size={13} color="#0d5c4b" />
                  <Text style={styles.profileChipText} numberOfLines={1}>
                    {t({ english: 'Protected', urdu: 'محفوظ' })}
                  </Text>
                </View>
                <View style={styles.profileChip}>
                  <Feather name="type" size={13} color="#0d5c4b" />
                  <Text style={styles.profileChipText} numberOfLines={1}>
                    {textLanguageLabel}
                  </Text>
                </View>
                <View style={styles.profileChip}>
                  <Feather name="volume-2" size={13} color="#0d5c4b" />
                  <Text style={styles.profileChipText} numberOfLines={1}>
                    {voiceLanguageLabel}
                  </Text>
                </View>
              </View>
            </View>

            {settingsSections.map((section) => (
              <View key={section.title} style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Feather name={section.icon} size={15} color="#0d5c4b" />
                  </View>
                  <Text style={styles.sectionTitle} numberOfLines={1}>
                    {t({ english: section.title, urdu: section.titleUrdu })}
                  </Text>
                </View>

                <View style={styles.sectionCard}>
                  {section.items.map((item, index) => {
                    const isLast = index === section.items.length - 1;
                    const label = t({ english: item.label, urdu: item.labelUrdu });
                    const description = t({ english: item.description, urdu: item.descriptionUrdu });

                    return (
                      <TouchableOpacity
                        key={`${section.title}:${item.label}`}
                        activeOpacity={item.kind === 'value' ? 1 : 0.9}
                        style={[styles.row, isTiny ? styles.rowTiny : null, isLast ? null : styles.rowBorder]}
                        onPress={() => {
                          if (item.kind === 'toggle') setToggle(item.toggleKey);
                          if (item.kind === 'action') onAction(item.action);
                        }}
                        accessibilityRole={item.kind === 'toggle' ? 'switch' : 'button'}
                        accessibilityState={item.kind === 'toggle' ? { checked: toggles[item.toggleKey] } : undefined}
                      >
                        <View style={[styles.rowIconBox, isTiny ? styles.rowIconBoxTiny : null]}>
                          <Feather name={item.icon} size={isTiny ? 16 : 18} color="#0d5c4b" />
                        </View>

                        <View style={styles.rowCopy}>
                          <Text style={[styles.rowLabel, isTiny ? styles.rowLabelTiny : null]} numberOfLines={1}>
                            {label}
                          </Text>
                          <Text style={[styles.rowDescription, isTiny ? styles.rowDescriptionTiny : null]} numberOfLines={isTiny ? 1 : 2}>
                            {description}
                          </Text>
                        </View>

                        {item.kind === 'value' ? (
                          <Text style={[styles.rowValue, isTiny ? styles.rowValueTiny : null]} numberOfLines={isTiny ? 1 : 2}>
                            {item.value}
                          </Text>
                        ) : null}

                        {item.kind === 'toggle' ? (
                          <TogglePill
                            compact={isTiny}
                            value={toggles[item.toggleKey]}
                          />
                        ) : null}

                        {item.kind === 'action' ? <Feather name="chevron-right" size={18} color="#98a2b3" /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <TouchableOpacity activeOpacity={0.9} style={[styles.logoutBtn, isTiny ? styles.logoutBtnTiny : null]} onPress={logout}>
              <Feather name="log-out" size={18} color="#b42318" />
              <View style={styles.logoutCopy}>
                <Text style={styles.logoutText} numberOfLines={1}>
                  {t({ english: 'Logout', urdu: 'لاگ آؤٹ' })}
                </Text>
                <Text style={styles.logoutSub} numberOfLines={1}>
                  {t({ english: 'Sign out from this device', urdu: 'اس ڈیوائس سے سائن آؤٹ کریں' })}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0d5c4b' },
  screen: { flex: 1, backgroundColor: '#f7faf6' },
  header: {
    paddingTop: 18,
    paddingBottom: 42,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTiny: { paddingTop: 14, paddingBottom: 36 },
  headerRow: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRowTiny: { gap: 9 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnTiny: { width: 38, height: 38, borderRadius: 19 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { color: '#ffffff', fontSize: 24, lineHeight: 30, fontWeight: '900' },
  headerTitleCompact: { fontSize: 22 },
  headerSub: { color: 'rgba(255,255,255,0.82)', marginTop: 3, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconTiny: { width: 38, height: 38, borderRadius: 14 },
  scrollContent: { marginTop: -24 },
  scrollContentTiny: { marginTop: -20 },
  contentWrap: { width: '100%', alignSelf: 'center' },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.08)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  profileCardTiny: { borderRadius: 18, padding: 14 },
  profileTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileAvatar: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  profileAvatarImage: { backgroundColor: '#e5f4ef' },
  profileAvatarTiny: { width: 50, height: 50, borderRadius: 17 },
  profileCopy: { flex: 1, minWidth: 0 },
  profileName: { color: '#111827', fontSize: 17, fontWeight: '900' },
  profileMeta: { color: '#667085', marginTop: 4, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(13,92,75,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnTiny: { width: 34, height: 34, borderRadius: 17 },
  profileChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  profileChip: {
    minHeight: 30,
    borderRadius: 15,
    backgroundColor: '#ecfdf3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  profileChipText: { color: '#0d5c4b', fontSize: 12, fontWeight: '900' },
  sectionBlock: { marginTop: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(13,92,75,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { color: '#111827', fontSize: 15, fontWeight: '900' },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.06)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  rowTiny: { gap: 9, paddingVertical: 12, paddingHorizontal: 11 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#eef2f0' },
  rowIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(13,92,75,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconBoxTiny: { width: 36, height: 36, borderRadius: 12 },
  rowCopy: { flex: 1, minWidth: 0 },
  rowLabel: { color: '#111827', fontSize: 14, fontWeight: '900' },
  rowLabelTiny: { fontSize: 13 },
  rowDescription: { color: '#667085', marginTop: 3, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  rowDescriptionTiny: { fontSize: 11, lineHeight: 15 },
  rowValue: { maxWidth: '36%', color: '#475467', fontSize: 12, lineHeight: 16, fontWeight: '800', textAlign: 'right' },
  rowValueTiny: { maxWidth: '32%', fontSize: 11, lineHeight: 15 },
  togglePill: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  togglePillCompact: { width: 44, height: 28, borderRadius: 14, padding: 3 },
  togglePillOn: { backgroundColor: '#0d5c4b' },
  togglePillOff: { backgroundColor: '#e5e7eb' },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  toggleKnobCompact: { width: 22, height: 22, borderRadius: 11 },
  toggleKnobOn: { alignSelf: 'flex-end' },
  logoutBtn: {
    marginTop: 20,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: '#fff1f1',
    borderWidth: 1,
    borderColor: '#fecaca',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  logoutBtnTiny: { minHeight: 54, borderRadius: 16, paddingHorizontal: 14 },
  logoutCopy: { flex: 1, minWidth: 0 },
  logoutText: { color: '#b42318', fontWeight: '900', fontSize: 14 },
  logoutSub: { color: '#b42318', opacity: 0.72, marginTop: 2, fontSize: 12, fontWeight: '700' },
});
