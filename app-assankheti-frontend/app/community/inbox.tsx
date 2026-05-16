import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import PresenceDot from '@/components/community/PresenceDot';
import { useT } from '@/contexts/LanguageContext';
import { authFetch } from '@/lib/authFetch';
import { getOrCreateMobileId } from '@/lib/deviceId';

const ROLE_KEY = 'assanKheti.role.v1';
const SEARCH_DEBOUNCE_MS = 300;

type DMItem = {
  conversation_id: string;
  other_participant: string | null;
  context_type?: string | null;
  context_ref?: string | null;
  last_message_preview?: string | null;
  last_message_at?: string | null;
  unread_count: number;
};

type GroupItem = {
  group_id: string;
  name_en?: string;
  name_ur?: string;
  crop?: string;
  member_count?: number;
  last_message_preview?: string | null;
  last_message_at?: string | null;
  unread_count: number;
};

async function fetchJson(path: string) {
  const res = await authFetch(path);
  if (!res.ok) throw new Error(`fetch ${path} failed ${res.status}`);
  return res.json();
}

function formatRelative(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function dmMatchesQuery(item: DMItem, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    (item.other_participant ?? '').toLowerCase().includes(lower) ||
    (item.last_message_preview ?? '').toLowerCase().includes(lower)
  );
}

function groupMatchesQuery(item: GroupItem, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    (item.name_en ?? '').toLowerCase().includes(lower) ||
    (item.name_ur ?? '').toLowerCase().includes(lower) ||
    (item.last_message_preview ?? '').toLowerCase().includes(lower)
  );
}

export default function CommunityInbox() {
  const router = useRouter();
  const t = useT();
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const [dms, setDms] = useState<DMItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(text.trim());
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const filteredDms = dms.filter((d) => dmMatchesQuery(d, debouncedSearch));
  const filteredGroups = groups.filter((g) => groupMatchesQuery(g, debouncedSearch));

  const load = useCallback(async () => {
    setError(null);
    try {
      const mobileId = await getOrCreateMobileId();
      const [dmRes, grpRes] = await Promise.all([
        fetchJson(`/api/v1/community/dm/inbox/${encodeURIComponent(mobileId)}`),
        fetchJson(`/api/v1/community/groups/list/${encodeURIComponent(mobileId)}`),
      ]);
      setDms(dmRes?.conversations ?? []);
      setGroups(grpRes?.groups ?? []);
    } catch (e: any) {
      console.warn('[CommunityInbox] load failed', e?.message ?? e);
      setError(e?.message ?? 'Failed to load inbox');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  /**
   * Back button handler with role-aware fallback.
   * Reads the stored role from AsyncStorage so we navigate to the right
   * dashboard if there is no screen in the back stack.
   */
  const handleBack = useCallback(async () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    try {
      const role = await AsyncStorage.getItem(ROLE_KEY);
      if (role === 'farmer') {
        router.replace('/farmer/community');
      } else {
        router.replace('/community-dashboard');
      }
    } catch {
      // AsyncStorage read failed; fall back to community-dashboard.
      router.replace('/community-dashboard');
    }
  }, [router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f1e8' }}>
      <LinearGradient
        colors={['#0d5c4b', '#10b981']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View
          style={[
            styles.headerInner,
            { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t({ english: 'Community', urdu: 'کمیونٹی' })}</Text>
            <Text style={styles.headerSub}>
              {t({ english: 'Direct messages and groups', urdu: 'پیغامات اور گروپس' })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel={t({ english: 'Back', urdu: 'واپس' })}
          >
            <Feather name="arrow-left" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search bar */}
        <View style={styles.searchWrap}>
          <Feather name="search" size={16} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={handleSearchChange}
            placeholder={t({ english: 'Search messages & groups…', urdu: 'پیغامات اور گروپس تلاش کریں…' })}
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        {loading && !refreshing ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator size="small" color="#0d5c4b" />
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Groups */}
        <Text style={styles.section}>{t({ english: 'Groups', urdu: 'گروپس' })}</Text>
        {filteredGroups.length === 0 ? (
          <Text style={styles.empty}>
            {debouncedSearch
              ? t({ english: 'No matching groups', urdu: 'کوئی ملتا گروپ نہیں' })
              : t({ english: 'No groups yet', urdu: 'ابھی کوئی گروپ نہیں' })}
          </Text>
        ) : null}
        {filteredGroups.map((g) => (
          <TouchableOpacity
            key={g.group_id}
            activeOpacity={0.85}
            style={styles.row}
            onPress={() =>
              router.push({ pathname: '/community/group/[groupId]', params: { groupId: g.group_id } })
            }
          >
            <View style={styles.avatarGroup}>
              <Feather name="users" size={20} color="#0d5c4b" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {t({ english: g.name_en ?? '', urdu: g.name_ur ?? g.name_en ?? '' })}
              </Text>
              <Text style={styles.rowPreview} numberOfLines={1}>
                {g.last_message_preview || t({ english: 'No messages yet', urdu: 'ابھی کوئی پیغام نہیں' })}
              </Text>
            </View>
            <View style={styles.rightCol}>
              <Text style={styles.time}>{formatRelative(g.last_message_at)}</Text>
              {g.unread_count > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{g.unread_count}</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}

        {/* DMs */}
        <Text style={[styles.section, { marginTop: 18 }]}>
          {t({ english: 'Direct Messages', urdu: 'براہ راست پیغامات' })}
        </Text>
        {filteredDms.length === 0 ? (
          <Text style={styles.empty}>
            {debouncedSearch
              ? t({ english: 'No matching conversations', urdu: 'کوئی ملتی گفتگو نہیں' })
              : t({ english: 'No conversations yet', urdu: 'ابھی کوئی گفتگو نہیں' })}
          </Text>
        ) : null}
        {filteredDms.map((c) => (
          <TouchableOpacity
            key={c.conversation_id}
            activeOpacity={0.85}
            style={styles.row}
            onPress={() =>
              router.push({
                pathname: '/community/chat/[conversationId]',
                params: {
                  conversationId: c.conversation_id,
                  otherId: c.other_participant ?? '',
                  contextType: c.context_type ?? '',
                  contextRef: c.context_ref ?? '',
                },
              })
            }
          >
            <View style={styles.avatarWrap}>
              <View style={styles.avatarDM}>
                <Text style={styles.avatarDMText}>
                  {(c.other_participant ?? '?').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              {c.other_participant ? (
                <View style={styles.dotPos}>
                  <PresenceDot mobileId={c.other_participant} />
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {c.other_participant || t({ english: 'Unknown', urdu: 'نامعلوم' })}
              </Text>
              <Text style={styles.rowPreview} numberOfLines={1}>
                {c.last_message_preview || t({ english: 'No messages yet', urdu: 'ابھی کوئی پیغام نہیں' })}
              </Text>
            </View>
            <View style={styles.rightCol}>
              <Text style={styles.time}>{formatRelative(c.last_message_at)}</Text>
              {c.unread_count > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{c.unread_count}</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 50, paddingBottom: 16, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#ffffff', fontWeight: '900', fontSize: 18 },
  headerSub: { color: 'rgba(255,255,255,0.78)', fontWeight: '700', marginTop: 2, fontSize: 12 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    marginBottom: 14,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  body: { paddingTop: 16, paddingBottom: 24 },
  section: { fontWeight: '900', fontSize: 14, color: '#0d5c4b', marginBottom: 8 },
  empty: { color: '#6b7280', fontWeight: '700', fontSize: 13, marginBottom: 8 },
  error: { color: '#b91c1c', fontWeight: '800', marginBottom: 12 },
  loaderRow: { paddingVertical: 12, alignItems: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  avatarWrap: { position: 'relative' },
  avatarDM: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDMText: { color: '#0d5c4b', fontWeight: '900', fontSize: 13 },
  dotPos: { position: 'absolute', right: -2, bottom: -2 },
  avatarGroup: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '900', color: '#111827' },
  rowPreview: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginTop: 2 },
  rightCol: { alignItems: 'flex-end', gap: 4, minWidth: 56 },
  time: { fontSize: 11, fontWeight: '800', color: '#9ca3af' },
  badge: {
    minWidth: 22,
    paddingHorizontal: 6,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0d5c4b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#ffffff', fontWeight: '900', fontSize: 11 },
});
