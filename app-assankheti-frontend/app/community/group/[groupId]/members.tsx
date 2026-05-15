import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import PresenceDot from '@/components/community/PresenceDot';
import { useT } from '@/contexts/LanguageContext';
import { authFetch } from '@/lib/authFetch';
import { getOrCreateMobileId } from '@/lib/deviceId';

const PAGE_SIZE = 50;

type Member = {
  group_id: string;
  mobile_id: string;
  joined_at?: string;
  last_read_at?: string | null;
  muted?: boolean;
};

function initialsOf(mobileId: string): string {
  // mobile_id is a UUID, so "initials" are just the first two hex chars.
  return (mobileId || '?').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
}

export default function GroupMembersScreen() {
  const router = useRouter();
  const t = useT();
  const params = useLocalSearchParams<{ groupId?: string }>();
  const groupId = (params?.groupId as string) || '';

  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const [members, setMembers] = useState<Member[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myMobileId, setMyMobileId] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const id = await getOrCreateMobileId();
      if (mounted) setMyMobileId(id);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const load = useCallback(
    async (reset = false) => {
      if (!groupId) return;
      try {
        const nextSkip = reset ? 0 : skip;
        const res = await authFetch(
          `/api/v1/community/groups/${encodeURIComponent(groupId)}/members?limit=${PAGE_SIZE}&skip=${nextSkip}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const incoming: Member[] = json?.members ?? [];
        setMembers((prev) => (reset ? incoming : [...prev, ...incoming]));
        setSkip(nextSkip + incoming.length);
        setHasMore(incoming.length === PAGE_SIZE);
      } catch (e: any) {
        console.warn('[GroupMembers] load failed', e?.message ?? e);
        setError(e?.message ?? 'Failed to load members');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [groupId, skip]
  );

  useEffect(() => {
    setLoading(true);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const onRefresh = () => {
    setRefreshing(true);
    setError(null);
    load(true);
  };

  const onMemberPress = (member: Member) => {
    if (member.mobile_id === myMobileId) return;
    router.push({
      pathname: '/community/chat/[conversationId]',
      params: {
        conversationId: 'new',
        otherId: member.mobile_id,
        contextType: 'group',
        contextRef: groupId,
      },
    });
  };

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
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/community/inbox');
            }}
            style={styles.iconBtn}
          >
            <Feather name="chevron-left" size={20} color="#ffffff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t({ english: 'Members', urdu: 'ممبران' })}</Text>
            <Text style={styles.headerSub}>
              {members.length} {t({ english: 'people', urdu: 'لوگ' })}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onMomentumScrollEnd={({ nativeEvent }) => {
          // Lazy "load more" when nearing the bottom.
          if (loading || refreshing || !hasMore) return;
          const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
          const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
          if (distanceFromBottom < 200) load(false);
        }}
        scrollEventThrottle={32}
      >
        {loading && !refreshing ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator color="#0d5c4b" />
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && members.length === 0 ? (
          <Text style={styles.empty}>{t({ english: 'No members yet', urdu: 'ابھی کوئی ممبر نہیں' })}</Text>
        ) : null}

        {members.map((m) => {
          const isMe = m.mobile_id === myMobileId;
          return (
            <TouchableOpacity
              key={m.mobile_id}
              activeOpacity={0.85}
              style={styles.row}
              onPress={() => onMemberPress(m)}
              disabled={isMe}
            >
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initialsOf(m.mobile_id)}</Text>
                </View>
                <View style={styles.dotPos}>
                  <PresenceDot mobileId={m.mobile_id} />
                </View>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {m.mobile_id}
                  {isMe ? ` ${t({ english: '(you)', urdu: '(آپ)' })}` : ''}
                </Text>
                {m.muted ? (
                  <Text style={styles.muted}>{t({ english: 'Muted', urdu: 'خاموش' })}</Text>
                ) : null}
              </View>
              {!isMe ? <Feather name="message-circle" size={18} color="#0d5c4b" /> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 50, paddingBottom: 16, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#ffffff', fontWeight: '900', fontSize: 18 },
  headerSub: { color: 'rgba(255,255,255,0.78)', fontWeight: '700', marginTop: 2, fontSize: 12 },

  body: { paddingTop: 16, paddingBottom: 24 },
  loaderRow: { paddingVertical: 24, alignItems: 'center' },
  error: { color: '#b91c1c', fontWeight: '800', marginBottom: 12 },
  empty: { color: '#6b7280', fontWeight: '700', textAlign: 'center', paddingVertical: 16 },

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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  avatarText: { color: '#0d5c4b', fontWeight: '900', fontSize: 13 },
  dotPos: { position: 'absolute', right: -2, bottom: -2 },

  name: { fontWeight: '900', fontSize: 14, color: '#111827' },
  muted: { fontWeight: '700', fontSize: 12, color: '#9ca3af', marginTop: 2 },
});
