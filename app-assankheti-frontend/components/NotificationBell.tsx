import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useT, useLanguage } from '@/contexts/LanguageContext';
import { useSocketEvent } from '@/hooks/useSocket';
import { authFetch } from '@/lib/authFetch';
import { getOrCreateMobileId } from '@/lib/deviceId';
import { APP_FLOW_KEYS } from '@/lib/appFlow';

type Notification = {
  notification_id: string;
  recipient_id: string;
  type: 'dm' | 'offer_received' | 'offer_accepted' | 'offer_rejected' | 'group_added' | string;
  title_en: string;
  title_ur: string;
  body_en: string;
  body_ur: string;
  read: boolean;
  data?: Record<string, any> | null;
  created_at?: string;
};

const POLL_MS = 30_000;
const PAGE_LIMIT = 50;

function formatRelative(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Math.max(0, Date.now() - d.getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days}d`;
}

type Props = {
  /** When true, the bell is rendered in white/translucent style for header use. */
  onHeader?: boolean;
};

export default function NotificationBell({ onHeader = true }: Props) {
  const router = useRouter();
  const t = useT();
  const { textLanguage } = useLanguage();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const mobileIdRef = useRef<string>('');
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(APP_FLOW_KEYS.accessToken)
      .then((token) => {
        if (!cancelled) setIsAuthenticated(Boolean(token));
      })
      .catch(() => {
        if (!cancelled) setIsAuthenticated(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchOnce = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem(APP_FLOW_KEYS.accessToken);
      if (!token) {
        setItems([]);
        setUnread(0);
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(true);
      if (!mobileIdRef.current) {
        mobileIdRef.current = await getOrCreateMobileId();
      }
      const res = await authFetch(
        `/api/v1/community/notifications/${encodeURIComponent(mobileIdRef.current)}?limit=${PAGE_LIMIT}`
      );
      if (!res.ok) {
        if (res.status === 403) return; // 401 handled inside authFetch
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const list: Notification[] = json?.notifications ?? [];
      setItems(list);
      setUnread(typeof json?.unread_count === 'number' ? json.unread_count : list.filter((n) => !n.read).length);
    } catch (e: any) {
      console.warn('[NotificationBell] fetch failed', e?.message ?? e);
    }
  }, []);

  // Initial fetch + 30s polling fallback
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchOnce();
    pollTimer.current = setInterval(fetchOnce, POLL_MS);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [fetchOnce, isAuthenticated]);

  // Live updates from the server
  useSocketEvent('notification:new', (payload: any) => {
    const n: Notification | undefined = payload?.notification;
    if (!n?.notification_id) return;
    setItems((prev) => {
      if (prev.some((x) => x.notification_id === n.notification_id)) return prev;
      return [n, ...prev].slice(0, PAGE_LIMIT);
    });
    if (!n.read) setUnread((u) => u + 1);
  }, isAuthenticated);

  const markRead = useCallback(
    async (ids?: string[]) => {
      try {
        if (!isAuthenticated) return;
        const body = ids?.length ? { notification_ids: ids } : { all: true };
        const res = await authFetch('/api/v1/community/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // Optimistic local update
        if (ids?.length) {
          setItems((prev) =>
            prev.map((n) => (ids.includes(n.notification_id) ? { ...n, read: true } : n))
          );
          setUnread((u) => Math.max(0, u - ids.length));
        } else {
          setItems((prev) => prev.map((n) => ({ ...n, read: true })));
          setUnread(0);
        }
      } catch (e: any) {
        console.warn('[NotificationBell] markRead failed', e?.message ?? e);
      }
    },
    [isAuthenticated]
  );

  const handleOpen = () => {
    setOpen(true);
    if (!isAuthenticated) return;
    setLoading(true);
    fetchOnce().finally(() => setLoading(false));
  };

  const handleTapItem = (n: Notification) => {
    if (!n.read) markRead([n.notification_id]);
    setOpen(false);

    const data = n.data || {};
    if (n.type === 'dm' && data.conversation_id) {
      router.push({
        pathname: '/community/chat/[conversationId]',
        params: {
          conversationId: String(data.conversation_id),
          otherId: String(data.sender_id ?? ''),
          contextType: 'direct',
        },
      });
    } else if (
      (n.type === 'offer_received' || n.type === 'offer_accepted' || n.type === 'offer_rejected') &&
      data.conversation_id
    ) {
      router.push({
        pathname: '/community/chat/[conversationId]',
        params: {
          conversationId: String(data.conversation_id),
          contextType: 'offer',
          contextRef: String(data.offer_id ?? ''),
        },
      });
    } else if (n.type === 'group_added' && data.group_id) {
      router.push({
        pathname: '/community/group/[groupId]',
        params: { groupId: String(data.group_id) },
      });
    } else {
      // Fallback: open the inbox
      router.push('/community/inbox');
    }
  };

  const titleFor = (n: Notification) => (textLanguage === 'urdu' ? n.title_ur : n.title_en) || n.title_en;
  const bodyFor = (n: Notification) => (textLanguage === 'urdu' ? n.body_ur : n.body_en) || n.body_en;

  const bellTint = onHeader ? '#ffffff' : '#0d5c4b';
  const bellBg = onHeader ? 'rgba(255,255,255,0.18)' : '#ecfdf5';

  return (
    <>
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.85}
        style={[styles.btn, { backgroundColor: bellBg }]}
        accessibilityRole="button"
        accessibilityLabel={t({ english: 'Notifications', urdu: 'اطلاعات' })}
      >
        <Feather name="bell" size={20} color={bellTint} />
        {unread > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 99 ? '99+' : String(unread)}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => null}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {t({ english: 'Notifications', urdu: 'اطلاعات' })}
              </Text>
              <TouchableOpacity onPress={() => markRead()} disabled={unread === 0}>
                <Text style={[styles.markAll, unread === 0 && { opacity: 0.4 }]}>
                  {t({ english: 'Mark all read', urdu: 'سب پڑھ لیا' })}
                </Text>
              </TouchableOpacity>
            </View>

            {loading && items.length === 0 ? (
              <View style={styles.loaderRow}>
                <ActivityIndicator color="#0d5c4b" />
              </View>
            ) : items.length === 0 ? (
              <Text style={styles.empty}>
                {t({ english: 'No notifications yet', urdu: 'ابھی کوئی اطلاع نہیں' })}
              </Text>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(n) => n.notification_id}
                contentContainerStyle={{ paddingBottom: 12 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.row, !item.read && styles.rowUnread]}
                    onPress={() => handleTapItem(item)}
                  >
                    <View style={styles.dotCol}>
                      <View style={[styles.unreadDot, item.read && styles.unreadDotRead]} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.title} numberOfLines={1}>
                        {titleFor(item)}
                      </Text>
                      <Text style={styles.body} numberOfLines={2}>
                        {bodyFor(item)}
                      </Text>
                    </View>
                    <Text style={styles.time}>{formatRelative(item.created_at)}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: { color: '#ffffff', fontWeight: '900', fontSize: 10 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sheetTitle: { fontWeight: '900', fontSize: 18, color: '#0d5c4b' },
  markAll: { fontWeight: '900', color: '#0d5c4b' },

  loaderRow: { paddingVertical: 28, alignItems: 'center' },
  empty: { color: '#6b7280', fontWeight: '700', textAlign: 'center', paddingVertical: 28 },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  rowUnread: { backgroundColor: '#ecfdf5' },
  dotCol: { paddingTop: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  unreadDotRead: { backgroundColor: 'transparent' },
  title: { fontWeight: '900', fontSize: 14, color: '#111827' },
  body: { fontWeight: '700', fontSize: 12, color: '#6b7280', marginTop: 2 },
  time: { fontWeight: '800', fontSize: 11, color: '#9ca3af', marginLeft: 6 },
});
