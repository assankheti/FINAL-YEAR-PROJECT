import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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

function getInitials(value?: string | null): string {
  const cleaned = (value ?? '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  if (!cleaned) return 'DM';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export default function CommunityInbox() {
  const router = useRouter();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Fix #10 — standardized breakpoints
  const isVeryNarrow = width < 330;
  const isNarrow = width < 360;
  const isCompact = width < 390;

  const isShort = height < 760;

  const horizontalPadding = isVeryNarrow ? 12 : isNarrow ? 14 : isCompact ? 16 : Math.max(18, Math.round(width * 0.05));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const headerTopPadding = isShort ? 34 : 44;
  // Fix #1 — headerBottomPadding scaled to screen; overlap is derived from this
  const headerBottomPadding = isVeryNarrow ? 60 : isNarrow ? 72 : isCompact ? 80 : 88;
  const headerMinHeight = isVeryNarrow ? 200 : isNarrow ? 216 : 240;
  // Overlap = 25% of bottom padding, keeping proportional across all breakpoints
  const searchCardOverlap = -Math.round(headerBottomPadding / 4);

  // Fix #7 — avatar size scaled per breakpoint
  const avatarSize = isVeryNarrow ? 36 : isNarrow ? 40 : 44;
  const avatarIconSize = isVeryNarrow ? 16 : isNarrow ? 18 : 20;

  // Fix #5 — responsive row horizontal padding
  const rowHPad = isVeryNarrow ? 8 : isNarrow ? 10 : 12;

  // Fix #9 — bottom padding respects gesture bar
  const bodyBottomPadding = Math.max(30, insets.bottom + 16);

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
  const totalUnread =
    dms.reduce((sum, item) => sum + (item.unread_count || 0), 0) +
    groups.reduce((sum, item) => sum + (item.unread_count || 0), 0);

  const formatPreviewText = useCallback(
    (preview?: string | null) => {
      const raw = (preview ?? '').trim();
      if (!raw) {
        return t({ english: 'No messages yet', urdu: 'ابھی کوئی پیغام نہیں' });
      }
      const normalized = raw.toLowerCase();
      if (normalized === '[image]' || normalized === '[photo]') {
        return t({ english: 'Photo attachment', urdu: 'تصویری منسلکہ' });
      }
      if (normalized === '[offer]') {
        return t({ english: 'Offer shared', urdu: 'آفر شیئر کی گئی' });
      }
      return raw;
    },
    [t]
  );

  const formatGroupSubtitle = useCallback(
    (group: GroupItem) => {
      if (group.last_message_preview?.trim()) return formatPreviewText(group.last_message_preview);
      if (typeof group.member_count === 'number' && group.member_count > 0) {
        return `${group.member_count} ${t({ english: 'members', urdu: 'ارکان' })}`;
      }
      return t({ english: 'No messages yet', urdu: 'ابھی کوئی پیغام نہیں' });
    },
    [formatPreviewText, t]
  );

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

  const EmptyStateCard = ({
    icon,
    title,
    subtitle,
  }: {
    icon: React.ComponentProps<typeof Feather>['name'];
    title: string;
    subtitle: string;
  }) => (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <Feather name={icon} size={18} color="#0d5c4b" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{subtitle}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f1e8' }}>
      <LinearGradient
        colors={['#0d5c4b', '#10b981']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          {
            paddingTop: headerTopPadding,
            paddingBottom: headerBottomPadding,
            minHeight: headerMinHeight,
          },
        ]}
      >
        <View style={styles.headerGlowOne} />
        <View style={styles.headerGlowTwo} />
        <View
          style={[
            styles.headerInner,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: 'center',
              width: '100%',
              gap: isNarrow ? 12 : 18,
            },
          ]}
        >
          <View style={styles.headerTopBar}>
            <TouchableOpacity
              onPress={handleBack}
              style={[styles.backBtn, isVeryNarrow ? styles.backBtnCompact : null]}
              accessibilityRole="button"
              accessibilityLabel={t({ english: 'Back', urdu: 'واپس' })}
            >
              <Feather name="arrow-left" size={18} color="#ffffff" />
            </TouchableOpacity>
            <View style={[styles.headerBadge, isVeryNarrow ? styles.headerBadgeCompact : null]}>
              <Feather name="users" size={isVeryNarrow ? 18 : 20} color="#ffffff" />
            </View>
          </View>

          {/* Fix #2 — flex:1 replaces maxWidth constraints so title never clips */}
          <View style={styles.headerTitleBlock}>
            <Text
              style={[
                styles.headerTitle,
                isCompact ? styles.headerTitleCompact : null,
                isVeryNarrow ? styles.headerTitleVeryCompact : null,
              ]}
              numberOfLines={isVeryNarrow ? 2 : 1}
              adjustsFontSizeToFit={isVeryNarrow}
            >
              {t({ english: 'Community Chat', urdu: 'کمیونٹی چیٹ' })}
            </Text>
            <Text
              style={[
                styles.headerSub,
                isNarrow ? styles.headerSubCompact : null,
                isVeryNarrow ? styles.headerSubVeryCompact : null,
              ]}
              numberOfLines={2}
            >
              {isVeryNarrow
                ? t({ english: 'Messages and groups', urdu: 'پیغامات اور گروپس' })
                : t({ english: 'Direct messages and groups', urdu: 'پیغامات اور گروپس' })}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: bodyBottomPadding,
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
          },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Fix #1 — overlap derived from headerBottomPadding, not hardcoded */}
        <View
          style={[
            styles.searchCard,
            {
              marginTop: searchCardOverlap,
              padding: isVeryNarrow ? 10 : 12,
            },
          ]}
        >
          <View style={styles.searchWrap}>
            <Feather name="search" size={17} color="#98a2b3" style={styles.searchIcon} />
            {/* Fix #3 — fontWeight changes based on whether text is typed */}
            <TextInput
              style={[
                styles.searchInput,
                isVeryNarrow ? styles.searchInputCompact : null,
                { fontWeight: searchText ? '600' : '400' },
              ]}
              value={searchText}
              onChangeText={handleSearchChange}
              placeholder={
                isVeryNarrow
                  ? t({ english: 'Search chats…', urdu: 'چیٹس تلاش کریں…' })
                  : t({ english: 'Search messages & groups…', urdu: 'پیغامات اور گروپس تلاش کریں…' })
              }
              placeholderTextColor="#98a2b3"
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searchText ? (
              <TouchableOpacity onPress={() => handleSearchChange('')} style={styles.clearBtn} activeOpacity={0.85}>
                <Feather name="x" size={14} color="#6b7280" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Fix #4 — chips use flex:1 + minWidth:0, no wrapping, text clipped by numberOfLines */}
          <View style={styles.summaryRow}>
            {[
              { icon: 'users' as const, count: groups.length, label: t({ english: 'groups', urdu: 'گروپس' }), muted: false },
              { icon: 'message-square' as const, count: dms.length, label: t({ english: 'messages', urdu: 'پیغامات' }), muted: false },
              { icon: 'bell' as const, count: totalUnread, label: t({ english: 'unread', urdu: 'ان ریڈ' }), muted: true },
            ].map((chip) => (
              <View
                key={chip.label}
                style={[
                  chip.muted ? styles.summaryChipMuted : styles.summaryChip,
                  styles.summaryChipFlex,
                ]}
              >
                <Feather name={chip.icon} size={isVeryNarrow ? 12 : 14} color="#0d5c4b" />
                <Text style={styles.summaryText} numberOfLines={1}>
                  {chip.count} {chip.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator size="small" color="#0d5c4b" />
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Groups section */}
        <View style={[styles.sectionCard, isVeryNarrow ? styles.sectionCardCompact : null]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={[styles.section, isVeryNarrow ? styles.sectionCompact : null]}>
                {t({ english: 'Groups', urdu: 'گروپس' })}
              </Text>
              <Text style={[styles.sectionSub, isVeryNarrow ? styles.sectionSubCompact : null]}>
                {t({ english: 'Farmer communities and topic rooms', urdu: 'کسان کمیونٹیز اور موضوعاتی رومز' })}
              </Text>
            </View>
            <View style={[styles.sectionCountPill, isVeryNarrow ? styles.sectionCountPillCompact : null]}>
              <Text style={styles.sectionCountText}>{filteredGroups.length}</Text>
            </View>
          </View>

          {filteredGroups.length === 0 ? (
            <EmptyStateCard
              icon="users"
              title={
                debouncedSearch
                  ? t({ english: 'No matching groups', urdu: 'کوئی ملتا گروپ نہیں' })
                  : t({ english: 'No groups yet', urdu: 'ابھی کوئی گروپ نہیں' })
              }
              subtitle={
                debouncedSearch
                  ? t({ english: 'Try a different keyword or clear your search.', urdu: 'کوئی اور لفظ آزمائیں یا سرچ صاف کریں۔' })
                  : t({ english: 'Groups you join will appear here for quick access.', urdu: 'جن گروپس میں آپ شامل ہوں گے وہ یہاں نظر آئیں گے۔' })
              }
            />
          ) : null}

          {filteredGroups.map((g) => (
            <TouchableOpacity
              key={g.group_id}
              activeOpacity={0.85}
              style={[styles.row, { paddingHorizontal: rowHPad }]}
              onPress={() =>
                router.push({ pathname: '/community/group/[groupId]', params: { groupId: g.group_id } })
              }
            >
              {/* Fix #7 — avatar size derived from breakpoint */}
              <View
                style={[
                  styles.avatarGroup,
                  {
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: avatarSize * 0.32,
                  },
                ]}
              >
                <Feather name="users" size={avatarIconSize} color="#0d5c4b" />
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  {/* Fix #6 — rowTitle flexShrink:1, time flexShrink:0 */}
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {t({ english: g.name_en ?? '', urdu: g.name_ur ?? g.name_en ?? '' })}
                  </Text>
                  <Text style={styles.time}>{formatRelative(g.last_message_at)}</Text>
                </View>
                <View style={styles.rowBottom}>
                  {/* Fix #8 — rowPreview flexShrink:1 */}
                  <Text style={styles.rowPreview} numberOfLines={1}>
                    {formatGroupSubtitle(g)}
                  </Text>
                  {g.unread_count > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{g.unread_count}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* DMs section */}
        <View style={[styles.sectionCard, isVeryNarrow ? styles.sectionCardCompact : null]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={[styles.section, isVeryNarrow ? styles.sectionCompact : null]}>
                {t({ english: 'Direct Messages', urdu: 'براہ راست پیغامات' })}
              </Text>
              <Text style={[styles.sectionSub, isVeryNarrow ? styles.sectionSubCompact : null]}>
                {t({ english: 'Private conversations with buyers and farmers', urdu: 'خریداروں اور کسانوں کے ساتھ نجی گفتگو' })}
              </Text>
            </View>
            <View style={[styles.sectionCountPill, isVeryNarrow ? styles.sectionCountPillCompact : null]}>
              <Text style={styles.sectionCountText}>{filteredDms.length}</Text>
            </View>
          </View>

          {filteredDms.length === 0 ? (
            <EmptyStateCard
              icon="message-square"
              title={
                debouncedSearch
                  ? t({ english: 'No matching conversations', urdu: 'کوئی ملتی گفتگو نہیں' })
                  : t({ english: 'No conversations yet', urdu: 'ابھی کوئی گفتگو نہیں' })
              }
              subtitle={
                debouncedSearch
                  ? t({ english: 'Try another name or message keyword.', urdu: 'کوئی اور نام یا پیغام والا لفظ آزمائیں۔' })
                  : t({ english: 'Your one-to-one chats will appear here once someone contacts you.', urdu: 'جب کوئی آپ سے رابطہ کرے گا تو آپ کی نجی گفتگو یہاں نظر آئے گی۔' })
              }
            />
          ) : null}

          {filteredDms.map((c) => (
            <TouchableOpacity
              key={c.conversation_id}
              activeOpacity={0.85}
              style={[styles.row, { paddingHorizontal: rowHPad }]}
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
              {/* Fix #7 — avatar size derived from breakpoint */}
              <View style={styles.avatarWrap}>
                <View
                  style={[
                    styles.avatarDM,
                    {
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius: avatarSize / 2,
                    },
                  ]}
                >
                  <Text style={[styles.avatarDMText, isVeryNarrow ? { fontSize: 11 } : null]}>
                    {getInitials(c.other_participant)}
                  </Text>
                </View>
                {c.other_participant ? (
                  <View style={styles.dotPos}>
                    <PresenceDot mobileId={c.other_participant} />
                  </View>
                ) : null}
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  {/* Fix #6 — rowTitle flexShrink:1, time flexShrink:0 */}
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {c.other_participant || t({ english: 'Unknown', urdu: 'نامعلوم' })}
                  </Text>
                  <Text style={styles.time}>{formatRelative(c.last_message_at)}</Text>
                </View>
                <View style={styles.rowBottom}>
                  {/* Fix #8 — rowPreview flexShrink:1 */}
                  <Text style={styles.rowPreview} numberOfLines={1}>
                    {formatPreviewText(c.last_message_preview)}
                  </Text>
                  {c.unread_count > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{c.unread_count}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 46,
    paddingBottom: 44,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerGlowOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
    right: -40,
    top: -20,
  },
  headerGlowTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    left: -30,
    bottom: -20,
  },
  headerInner: { gap: 18, position: 'relative', zIndex: 2 },
  headerTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // Fix #2 — flex:1 + minWidth:0 replaces all maxWidth constraints
  headerTitleBlock: { flex: 1, minWidth: 0, marginTop: 10 },

  headerTitle: { color: '#ffffff', fontWeight: '900', fontSize: 30, lineHeight: 36 },
  headerTitleCompact: { fontSize: 24, lineHeight: 30 },
  headerTitleVeryCompact: { fontSize: 20, lineHeight: 26 },
  headerSub: {
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '700',
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  headerSubCompact: { fontSize: 13, lineHeight: 18 },
  headerSubVeryCompact: { fontSize: 12, lineHeight: 17 },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnCompact: { width: 40, height: 40, borderRadius: 20 },
  headerBadge: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeCompact: { width: 42, height: 42, borderRadius: 15 },

  // Fix #9 — paddingBottom applied dynamically via bodyBottomPadding
  body: { paddingTop: 0, gap: 16 },

  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.08)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  // Fix #3 — base fontWeight set to '400'; typed text overrides to '600' inline
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: '#111827',
  },
  searchInputCompact: { fontSize: 14 },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Fix #4 — row + no wrap; each chip uses summaryChipFlex for equal sizing
  summaryRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 6, marginTop: 12 },
  summaryChipFlex: { flex: 1, minWidth: 0 },
  summaryChip: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: 'rgba(13,92,75,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryChipMuted: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: '#f3f4f6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: { color: '#0d5c4b', fontWeight: '800', fontSize: 11, flexShrink: 1 },

  sectionCard: {
    backgroundColor: '#fffdf8',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.08)',
  },
  sectionCardCompact: { padding: 10 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionHeaderCopy: { flex: 1, minWidth: 0 },
  section: { fontWeight: '900', fontSize: 20, color: '#0d5c4b', lineHeight: 24 },
  sectionCompact: { fontSize: 17, lineHeight: 22 },
  sectionSub: { color: '#6b7280', fontWeight: '700', fontSize: 12, lineHeight: 17, marginTop: 3 },
  sectionSubCompact: { fontSize: 11, lineHeight: 16 },
  sectionCountPill: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCountPillCompact: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 7,
  },
  sectionCountText: { color: '#0d5c4b', fontWeight: '900', fontSize: 12 },

  emptyCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eef2f7',
    alignItems: 'flex-start',
  },
  emptyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { color: '#111827', fontWeight: '900', fontSize: 15 },
  emptySub: { color: '#6b7280', fontWeight: '700', fontSize: 13, lineHeight: 19, marginTop: 6 },
  error: { color: '#b91c1c', fontWeight: '800', marginBottom: 12 },
  loaderRow: { paddingVertical: 10, alignItems: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },

  avatarWrap: { position: 'relative' },
  avatarDM: {
    // width/height/borderRadius applied inline per breakpoint
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDMText: { color: '#0d5c4b', fontWeight: '900', fontSize: 14 },
  dotPos: { position: 'absolute', right: -2, bottom: -2 },
  avatarGroup: {
    // width/height/borderRadius applied inline per breakpoint
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Fix #6 — flexShrink:1 on title, flexShrink:0 on time
  rowTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },
  time: {
    flexShrink: 0,
    fontSize: 11,
    fontWeight: '800',
    color: '#9ca3af',
  },
  // Fix #8 — flexShrink:1 prevents preview + badge overflow
  rowPreview: {
    flex: 1,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    lineHeight: 16,
  },
  badge: {
    flexShrink: 0,
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
