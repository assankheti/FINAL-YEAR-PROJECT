import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStreamChatConnection } from '@/hooks/useStreamChatConnection';
import { chatClient } from '@/lib/stream';

type ChatChannel = {
  cid: string;
  id?: string;
  data?: Record<string, unknown>;
  state?: {
    messages?: { text?: string; created_at?: string | Date }[];
    unreadCount?: number;
  };
};

export function StreamChatListScreen() {
  const router = useRouter();
  const { userId, isConnected, isConnecting, error, connect } = useStreamChatConnection();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadChannels = useCallback(async () => {
    if (!userId || !isConnected) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const rows = await chatClient.queryChannels(
        { type: 'messaging', members: { $in: [userId] } },
        { last_message_at: -1 },
        { presence: true, state: true, watch: true, limit: 30 }
      );
      setChannels(rows as unknown as ChatChannel[]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load conversations.');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, userId]);

  useFocusEffect(
    useCallback(() => {
      void loadChannels();
    }, [loadChannels])
  );

  if (isConnecting && !isConnected) return <CenteredState title="Connecting chat..." />;

  if ((error || loadError) && !isConnected) {
    return <CenteredState title="Chat is unavailable" subtitle={error || loadError || undefined} actionLabel="Try again" onAction={connect} />;
  }

  if (!userId || !isConnected) {
    return <CenteredState title="Sign in to open chat" actionLabel="Connect" onAction={connect} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.85}>
          <Feather name="arrow-left" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>Buyers, farmers, and community groups</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/stream-chat/community' as any)}
          style={styles.communityBtn}
          activeOpacity={0.85}
        >
          <Feather name="users" size={17} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <CenteredState title="Loading conversations..." />
      ) : channels.length === 0 ? (
        <CenteredState
          title="No conversations yet"
          subtitle="Open a community channel or message a seller to start chatting."
          actionLabel="Community channels"
          onAction={() => router.push('/stream-chat/community' as any)}
        />
      ) : (
        <FlatList
          data={channels}
          keyExtractor={(item) => item.cid}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const lastMessage = item.state?.messages?.[item.state.messages.length - 1];
            return (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: '/stream-chat/channel/[cid]',
                    params: { cid: item.cid },
                  } as any)
                }
              >
                <View style={styles.avatar}>
                  <Feather name={(item.data?.assan_kheti_kind === 'community' ? 'users' : 'message-circle') as any} size={20} color="#0d5c4b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {String(item.data?.name || item.id || item.cid)}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {lastMessage?.text || 'Tap to open conversation'}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#94a3b8" />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function CenteredState({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <SafeAreaView style={styles.centerWrap}>
      <ActivityIndicator size="large" color="#0d5c4b" />
      <Text style={styles.centerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.centerSubtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} style={styles.primaryBtn} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#0d5c4b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 12, fontWeight: '600', marginTop: 2 },
  list: { padding: 14, gap: 10 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcfce7',
  },
  rowTitle: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  rowSub: { color: '#64748b', fontSize: 12, fontWeight: '600', marginTop: 3 },
  centerWrap: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  centerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  centerSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  primaryBtn: { backgroundColor: '#0d5c4b', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 11 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
});
