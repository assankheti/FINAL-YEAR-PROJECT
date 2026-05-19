import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStreamChatConnection } from '@/hooks/useStreamChatConnection';
import { chatClient, parseStreamCid } from '@/lib/stream';

type StreamMessage = {
  id?: string;
  text?: string;
  created_at?: string | Date;
  user?: { id?: string; name?: string };
};

type LoadedChannel = {
  cid: string;
  data?: Record<string, unknown>;
  state?: { messages?: StreamMessage[] };
  watch: (options?: Record<string, unknown>) => Promise<unknown>;
  sendMessage: (message: { text: string }) => Promise<unknown>;
  on: (event: string, callback: (event: any) => void) => { unsubscribe?: () => void } | (() => void);
};

export function StreamConversationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cid?: string }>();
  const { isConnected, connect, userId } = useStreamChatConnection();
  const [channel, setChannel] = useState<LoadedChannel | null>(null);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<StreamMessage>>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function loadChannel() {
      if (!params.cid || !isConnected) return;
      try {
        setError(null);
        const { type, id } = parseStreamCid(params.cid);
        const nextChannel = chatClient.channel(type, id) as unknown as LoadedChannel;
        await nextChannel.watch({ presence: true });
        if (cancelled) return;

        setChannel(nextChannel);
        setMessages([...(nextChannel.state?.messages ?? [])]);

        const subscription = nextChannel.on('message.new', (event: { message?: StreamMessage }) => {
          if (!event.message) return;
          setMessages((prev) => [...prev, event.message as StreamMessage]);
          requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
        });

        if (typeof subscription === 'function') unsubscribe = subscription;
        else unsubscribe = subscription.unsubscribe;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not open conversation.');
      }
    }

    void loadChannel();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isConnected, params.cid]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!channel || !text || isSending) return;

    setIsSending(true);
    try {
      await channel.sendMessage({ text });
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Message failed to send.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isConnected) {
    return <Centered title="Connecting chat..." actionLabel="Retry" onAction={connect} />;
  }

  if (error && !channel) return <Centered title="Conversation unavailable" subtitle={error} actionLabel="Back" onAction={() => router.back()} />;
  if (!channel) return <Centered title="Opening conversation..." />;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.85}>
            <Feather name="arrow-left" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{String(channel.data?.name || 'Conversation')}</Text>
            <Text style={styles.subtitle}>Messages sync through Stream Chat</Text>
          </View>
        </View>

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item, index) => item.id || `${item.created_at || 'message'}-${index}`}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const mine = item.user?.id === userId;
            return (
              <View style={[styles.messageBubble, mine ? styles.mine : styles.theirs]}>
                {!mine ? <Text style={styles.sender}>{item.user?.name || 'Member'}</Text> : null}
                <Text style={[styles.messageText, mine ? styles.mineText : styles.theirsText]}>{item.text || ''}</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 36 }}>🌾</Text>
              <Text style={styles.emptyText}>No messages yet. Start the conversation.</Text>
            </View>
          }
        />

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            style={styles.input}
            multiline
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={isSending || !draft.trim()}
            style={[styles.sendBtn, (!draft.trim() || isSending) && { opacity: 0.5 }]}
            activeOpacity={0.85}
          >
            {isSending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Centered({
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
  screen: { flex: 1, backgroundColor: '#fff' },
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
  title: { color: '#0f172a', fontSize: 17, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 11, fontWeight: '600', marginTop: 2 },
  inlineError: { color: '#b91c1c', backgroundColor: '#fee2e2', padding: 10, fontSize: 12, fontWeight: '700' },
  messages: { flexGrow: 1, padding: 14, gap: 8 },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  mine: { alignSelf: 'flex-end', backgroundColor: '#0d5c4b', borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#f1f5f9', borderBottomLeftRadius: 4 },
  sender: { color: '#64748b', fontSize: 10, fontWeight: '900', marginBottom: 3 },
  messageText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  mineText: { color: '#fff' },
  theirsText: { color: '#0f172a' },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyText: { color: '#64748b', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 14,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#0d5c4b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#f8fafc' },
  centerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  centerSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  primaryBtn: { backgroundColor: '#0d5c4b', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 11 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
});
