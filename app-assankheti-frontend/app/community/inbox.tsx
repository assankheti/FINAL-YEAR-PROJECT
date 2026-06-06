import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ConfirmDialog from '@/components/ConfirmDialog';
import { SpeechHighlight } from '@/components/SpeechHighlight';
import PresenceDot from '@/components/community/PresenceDot';
import { useLanguage, useT } from '@/contexts/LanguageContext';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';
import { authFetch } from '@/lib/authFetch';
import { getOrCreateMobileId } from '@/lib/deviceId';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  primary: '#0d5c4b',
  primaryMid: '#0a7c63',
  primaryLight: '#10b981',
  bg: '#f0f7f4',
  card: '#ffffff',
  text: '#111827',
  sub: '#6b7280',
  muted: '#9ca3af',
  border: '#e5e7eb',
  unread: '#ef4444',
  skeletonBase: '#e5e7eb',
} as const;

const ROLE_KEY = 'assanKheti.role.v1';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConvItem = {
  id: string;
  type: 'dm' | 'group';
  name: string;
  preview: string;
  lastActiveAt: string | null;
  unreadCount: number;
  otherParticipant: string | null;
  contextType?: string | null;
  contextRef?: string | null;
  memberCount?: number;
};

type TabFilter = 'all' | 'dms' | 'groups';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLabel(id: string | null | undefined): string {
  if (!id) return 'Farmer';
  const clean = id.replace(/^device:/, '');
  const digits = clean.replace(/[^a-fA-F0-9]/g, '');
  if (digits.length >= 4) return `Farmer ···${digits.slice(-4).toUpperCase()}`;
  return 'Farmer';
}

function getInitials(name: string): string {
  const clean = (name ?? '').replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

const CROP_EMOJI: Record<string, string> = {
  wheat: '🌾', rice: '🍚', vegetables: '🥬', veggies: '🥬',
  fruits: '🍎', cotton: '🌿', sugarcane: '🎋', corn: '🌽',
  buyers: '🛒', general: '💬',
};

function groupEmoji(name: string): string {
  const lower = (name ?? '').toLowerCase();
  for (const [key, emoji] of Object.entries(CROP_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return '👥';
}

function formatTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatPreview(preview: string | null | undefined): string {
  const raw = (preview ?? '').trim();
  if (!raw) return 'No messages yet';
  if (raw === '[image]' || raw === '[photo]') return '📷 Photo';
  if (raw === '[offer]') return '💰 Offer shared';
  return raw;
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 850, useNativeDriver: true }),
      ])
    ).start();
    return () => shimmer.stopAnimation();
  }, [shimmer]);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });

  return (
    <View style={S.skeletonCard}>
      <Animated.View style={[S.skeletonAvatar, { opacity }]} />
      <View style={{ flex: 1, gap: 10 }}>
        <Animated.View style={[S.skeletonLine, { width: '45%', opacity }]} />
        <Animated.View style={[S.skeletonLine, { width: '75%', height: 12, opacity }]} />
      </View>
      <Animated.View style={[S.skeletonTime, { opacity }]} />
    </View>
  );
}

// ─── Conversation card ────────────────────────────────────────────────────────

function ConvCard({
  item,
  onPress,
  onDelete,
}: {
  item: ConvItem;
  onPress: () => void;
  onDelete?: () => void;
}) {
  const isDM = item.type === 'dm';
  const hasUnread = item.unreadCount > 0;
  const displayName = isDM ? formatLabel(item.name) : item.name;
  const initials = isDM ? getInitials(displayName) : groupEmoji(item.name);

  return (
    <TouchableOpacity
      activeOpacity={0.72}
      onPress={onPress}
      onLongPress={onDelete}
      delayLongPress={300}
      style={[S.card, hasUnread && S.cardUnread]}
      accessibilityRole="button"
    >
      {/* Avatar */}
      <View style={S.avatarWrap}>
        <View style={[S.avatar, isDM ? S.avatarDM : S.avatarGroup]}>
          <Text style={isDM ? S.avatarInitials : S.avatarEmoji}>{initials}</Text>
        </View>
        {isDM && item.otherParticipant ? (
          <View style={S.presencePos}>
            <PresenceDot mobileId={item.otherParticipant} size={10} />
          </View>
        ) : (
          <View style={S.groupTypeBadge}>
            <Feather name="users" size={7} color="#fff" />
          </View>
        )}
      </View>

      {/* Text body */}
      <View style={S.cardBody}>
        <View style={S.cardTopRow}>
          <Text style={[S.cardName, hasUnread && S.cardNameUnread]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[S.cardTime, hasUnread && S.cardTimeUnread]}>
            {formatTime(item.lastActiveAt)}
          </Text>
        </View>
        <View style={S.cardBottomRow}>
          <Text style={[S.cardPreview, hasUnread && S.cardPreviewUnread]} numberOfLines={1}>
            {formatPreview(item.preview)}
          </Text>
          {hasUnread ? (
            <View style={S.unreadBadge}>
              <Text style={S.unreadText}>
                {item.unreadCount > 99 ? '99+' : String(item.unreadCount)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {onDelete ? (
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={S.deleteBtn}
          accessibilityRole="button"
        >
          <Feather name="trash-2" size={18} color="#9ca3af" />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CommunityInbox() {
  const router = useRouter();
  const t = useT();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<ConvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const load = useCallback(async () => {
    setError(null);
    try {
      const mobileId = await getOrCreateMobileId();
      const [dmRes, grpRes] = await Promise.all([
        authFetch(`/api/v1/community/dm/inbox/${encodeURIComponent(mobileId)}`),
        authFetch(`/api/v1/community/groups/list/${encodeURIComponent(mobileId)}`),
      ]);

      const dmData = dmRes.ok ? await dmRes.json() : { conversations: [] };
      const grpData = grpRes.ok ? await grpRes.json() : { groups: [] };

      const rawDmItems: ConvItem[] = (dmData.conversations ?? []).map((c: any) => ({
        id: c.conversation_id,
        type: 'dm' as const,
        name: c.other_participant ?? 'Unknown',
        preview: c.last_message_preview ?? '',
        lastActiveAt: c.last_message_at ?? null,
        unreadCount: c.unread_count ?? 0,
        otherParticipant: c.other_participant ?? null,
        contextType: c.context_type ?? null,
        contextRef: c.context_ref ?? null,
      }));

      // Collapse duplicate DM threads with the same person (e.g. created once as
      // `device:<id>` and once as `<id>`), preferring the one that actually has
      // messages / the most recent activity.
      const normId = (id: string | null) => (id ?? '').replace(/^device:/, '');
      const dmByPartner = new Map<string, ConvItem>();
      for (const it of rawDmItems) {
        const key = normId(it.otherParticipant);
        const prev = dmByPartner.get(key);
        if (!prev) {
          dmByPartner.set(key, it);
          continue;
        }
        const prevTime = prev.lastActiveAt ? new Date(prev.lastActiveAt).getTime() : -1;
        const curTime = it.lastActiveAt ? new Date(it.lastActiveAt).getTime() : -1;
        const better = curTime > prevTime ? it : prev;
        // Keep the combined unread count so nothing is silently dropped.
        better.unreadCount = (prev.unreadCount ?? 0) + (it.unreadCount ?? 0);
        dmByPartner.set(key, better);
      }
      const dmItems: ConvItem[] = [...dmByPartner.values()];

      const grpItems: ConvItem[] = (grpData.groups ?? []).map((g: any) => ({
        id: g.group_id,
        type: 'group' as const,
        name: g.name_en ?? g.name_ur ?? 'Group',
        preview: g.last_message_preview ?? '',
        lastActiveAt: g.last_message_at ?? null,
        unreadCount: g.unread_count ?? 0,
        otherParticipant: null,
        memberCount: g.member_count,
      }));

      // Merge, sort by latest activity first
      const merged = [...dmItems, ...grpItems].sort((a, b) => {
        if (!a.lastActiveAt && !b.lastActiveAt) return 0;
        if (!a.lastActiveAt) return 1;
        if (!b.lastActiveAt) return -1;
        return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
      });
      setItems(merged);
    } catch {
      setError(t({ english: 'Failed to load messages. Pull down to retry.', urdu: 'پیغامات لوڈ نہیں ہوئے۔ نیچے کھینچیں۔' }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

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

  const handleBack = useCallback(async () => {
    if (router.canGoBack()) { router.back(); return; }
    try {
      const role = await AsyncStorage.getItem(ROLE_KEY);
      router.replace(role === 'farmer' ? '/farmer/community' : '/community-dashboard');
    } catch {
      router.replace('/community-dashboard');
    }
  }, [router]);

  const [pendingDelete, setPendingDelete] = useState<ConvItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const requestDelete = useCallback((item: ConvItem) => {
    // Only direct conversations are deletable here (groups use "leave").
    if (item.type !== 'dm') return;
    setPendingDelete(item);
  }, []);

  const confirmDelete = useCallback(async () => {
    const item = pendingDelete;
    if (!item) return;
    setDeleting(true);
    // Optimistically remove from the list.
    setItems((prev) => prev.filter((x) => !(x.type === item.type && x.id === item.id)));
    try {
      const res = await authFetch(
        `/api/v1/community/dm/conversations/${encodeURIComponent(item.id)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // Restore on failure.
      load();
      Alert.alert(
        t({ english: 'Delete failed', urdu: 'حذف ناکام' }),
        t({ english: 'Please try again.', urdu: 'دوبارہ کوشش کریں۔' })
      );
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }, [pendingDelete, load, t]);

  const navigateTo = useCallback((item: ConvItem) => {
    if (item.type === 'dm') {
      router.push({
        pathname: '/community/chat/[conversationId]',
        params: {
          conversationId: item.id,
          otherId: item.otherParticipant ?? '',
          contextType: item.contextType ?? '',
          contextRef: item.contextRef ?? '',
        },
      });
    } else {
      router.push({
        pathname: '/community/group/[groupId]',
        params: { groupId: item.id },
      });
    }
  }, [router]);

  // Filter by tab + search
  const filtered = items
    .filter(i => {
      if (activeTab === 'dms') return i.type === 'dm';
      if (activeTab === 'groups') return i.type === 'group';
      return true;
    })
    .filter(i => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        formatLabel(i.name).toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        formatPreview(i.preview).toLowerCase().includes(q)
      );
    });

  // ── Voice guidance: read each conversation aloud and highlight its card. ──
  const { voiceLanguage } = useLanguage();
  const {
    enabled: voiceEnabled,
    activeHighlightId,
    startGuidedSequence,
    cancelGuidedSequence,
  } = useVoiceGuidance();
  const vv = useCallback(
    (english: string, urdu: string) => (voiceLanguage === 'urdu' ? urdu : english),
    [voiceLanguage]
  );
  const convStepId = (item: ConvItem) => `inbox.conv.${item.type}.${item.id}`;

  const startedRef = useRef(false);
  useEffect(() => {
    if (!voiceEnabled || loading || startedRef.current) return;
    startedRef.current = true;
    const steps = [
      { id: 'inbox.header', text: vv('Messages. Chat with farmers.', 'پیغامات۔ کسانوں سے گفتگو۔') },
      { id: 'inbox.search', text: vv('Search bar. Type to find a conversation.', 'سرچ بار۔ گفتگو تلاش کرنے کے لیے لکھیں۔') },
      ...filtered.map((item) => {
        const name = item.type === 'dm' ? vv('a farmer', 'ایک کسان') : item.name;
        const preview = formatPreview(item.preview);
        return {
          id: convStepId(item),
          text: vv(`Chat with ${name}. Last message: ${preview}.`, `${name} کے ساتھ گفتگو۔ آخری پیغام: ${preview}۔`),
        };
      }),
    ];
    const timer = setTimeout(() => startGuidedSequence(steps), 350);
    return () => {
      clearTimeout(timer);
      cancelGuidedSequence();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceEnabled, loading]);

  const totalUnread = items.reduce((s, i) => s + i.unreadCount, 0);
  const dmCount = items.filter(i => i.type === 'dm').length;
  const grpCount = items.filter(i => i.type === 'group').length;

  const TABS: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: t({ english: 'All', urdu: 'سب' }), count: items.length },
    { key: 'dms', label: t({ english: 'Direct', urdu: 'براہ راست' }), count: dmCount },
    { key: 'groups', label: t({ english: 'Groups', urdu: 'گروپس' }), count: grpCount },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.primary }}>
      {/* Extends gradient behind the status bar */}
      <View style={{ height: insets.top, backgroundColor: C.primary }} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={[C.primary, C.primaryMid]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={S.header}
      >
        {/* Decorative glow circles */}
        <View style={S.glowA} />
        <View style={S.glowB} />

        {/* Title row */}
        <View style={S.headerRow}>
          <TouchableOpacity
            onPress={handleBack}
            style={S.backBtn}
            accessibilityRole="button"
            accessibilityLabel={t({ english: 'Back', urdu: 'واپس' })}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={S.headerTitle}>{t({ english: 'Messages', urdu: 'پیغامات' })}</Text>
            <Text style={S.headerSub}>{t({ english: 'Chat with Farmers', urdu: 'کسانوں سے گفتگو' })}</Text>
          </View>

          {totalUnread > 0 ? (
            <View style={S.totalBadge}>
              <Text style={S.totalBadgeText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
            </View>
          ) : null}
        </View>

        {/* Search bar */}
        <SpeechHighlight active={activeHighlightId === 'inbox.search'}>
        <View style={S.searchRow}>
          <Feather name="search" size={16} color={C.muted} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t({ english: 'Search conversations…', urdu: 'گفتگو تلاش کریں…' })}
            placeholderTextColor={C.muted}
            style={S.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x-circle" size={16} color={C.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
        </SpeechHighlight>
      </LinearGradient>

      {/* ── Tab filter ─────────────────────────────────────────────────────── */}
      <View style={S.tabsBar}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[S.tabPill, active && S.tabPillActive]}
              activeOpacity={0.8}
            >
              <Text style={[S.tabPillText, active && S.tabPillTextActive]}>
                {tab.label}
                {tab.count > 0 ? `  ${tab.count}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List ───────────────────────────────────────────────────────────── */}
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {loading && !refreshing ? (
          <View style={{ paddingTop: 16, paddingHorizontal: 16, gap: 8 }}>
            {[1, 2, 3, 4, 5, 6].map(k => <SkeletonCard key={k} />)}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={i => `${i.type}-${i.id}`}
            renderItem={({ item }) => (
              <SpeechHighlight active={activeHighlightId === convStepId(item)}>
                <ConvCard
                  item={item}
                  onPress={() => navigateTo(item)}
                  onDelete={item.type === 'dm' ? () => requestDelete(item) : undefined}
                />
              </SpeechHighlight>
            )}
            contentContainerStyle={S.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={C.primary}
                colors={[C.primary]}
              />
            }
            ListHeaderComponent={
              error ? (
                <View style={S.errorRow}>
                  <Feather name="alert-circle" size={14} color="#b91c1c" />
                  <Text style={S.errorText}>{error}</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={S.emptyWrap}>
                <LinearGradient
                  colors={['#ecfdf5', '#d1fae5']}
                  style={S.emptyIconBox}
                >
                  <Feather name="message-circle" size={40} color={C.primary} />
                </LinearGradient>
                <Text style={S.emptyTitle}>
                  {search.trim()
                    ? t({ english: 'No results', urdu: 'کوئی نتیجہ نہیں' })
                    : t({ english: 'No conversations yet', urdu: 'ابھی کوئی گفتگو نہیں' })}
                </Text>
                <Text style={S.emptySub}>
                  {search.trim()
                    ? t({ english: 'Try a different keyword.', urdu: 'کوئی اور لفظ آزمائیں۔' })
                    : t({ english: 'Browse products and tap "Message Farmer" to start a conversation.', urdu: 'مصنوعات دیکھیں اور "کسان کو پیغام" دبائیں۔' })}
                </Text>
                {!search.trim() ? (
                  <TouchableOpacity
                    style={S.emptyBtn}
                    onPress={() => router.replace('/community-dashboard')}
                    activeOpacity={0.85}
                  >
                    <Feather name="shopping-bag" size={15} color="#fff" />
                    <Text style={S.emptyBtnText}>
                      {t({ english: 'Browse Products', urdu: 'مصنوعات دیکھیں' })}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            }
            ItemSeparatorComponent={() => <View style={S.separator} />}
          />
        )}
      </View>

      {/* Bottom safe area */}
      <View style={{ height: insets.bottom, backgroundColor: C.bg }} />

      <ConfirmDialog
        visible={!!pendingDelete}
        title={t({ english: 'Delete conversation?', urdu: 'گفتگو حذف کریں؟' })}
        message={t({
          english: 'This conversation will be removed from your list.',
          urdu: 'یہ گفتگو آپ کی فہرست سے ہٹا دی جائے گی۔',
        })}
        confirmLabel={t({ english: 'Delete', urdu: 'حذف کریں' })}
        cancelLabel={t({ english: 'Cancel', urdu: 'منسوخ' })}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // Header
  header: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  glowA: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
    right: -50,
    top: -60,
  },
  glowB: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)',
    left: -30,
    bottom: -40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 26,
    lineHeight: 30,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '700',
    fontSize: 13,
    marginTop: 2,
  },
  totalBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  totalBadgeText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 0,
  },

  // Tabs
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  tabPillActive: {
    backgroundColor: '#0d5c4b',
  },
  tabPillText: {
    fontWeight: '800',
    fontSize: 12,
    color: '#6b7280',
  },
  tabPillTextActive: {
    color: '#fff',
  },

  // List
  listContent: {
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 28,
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 78,
  },

  // Conversation card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    marginBottom: 2,
  },
  cardUnread: {
    backgroundColor: '#fafffe',
    shadowOpacity: 0.07,
    elevation: 2,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },

  // Avatar
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDM: {
    backgroundColor: '#d1fae5',
  },
  avatarGroup: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
  },
  avatarInitials: {
    color: '#065f46',
    fontWeight: '900',
    fontSize: 16,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  presencePos: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 1,
  },
  groupTypeBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0d5c4b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  // Card body
  cardBody: { flex: 1, minWidth: 0 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  cardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  cardNameUnread: {
    fontWeight: '900',
    color: '#111827',
  },
  cardTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    flexShrink: 0,
  },
  cardTimeUnread: {
    color: '#0d5c4b',
    fontWeight: '800',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardPreview: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
  cardPreviewUnread: {
    color: '#4b5563',
    fontWeight: '700',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0d5c4b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    flexShrink: 0,
  },
  unreadText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 11,
  },

  // Skeleton
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 8,
  },
  skeletonAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e5e7eb',
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#e5e7eb',
  },
  skeletonTime: {
    width: 32,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
    alignSelf: 'flex-start',
    marginTop: 4,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconBox: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0d5c4b',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
});
