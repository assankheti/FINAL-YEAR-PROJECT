import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import ImagePickerButton from '@/components/community/ImagePickerButton';
import MessageBubble from '@/components/community/MessageBubble';
import PinnedProductCard from '@/components/community/PinnedProductCard';
import PresenceDot from '@/components/community/PresenceDot';
import SeenReceipt from '@/components/community/SeenReceipt';
import TypingIndicator from '@/components/community/TypingIndicator';
import { useT } from '@/contexts/LanguageContext';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { authFetch } from '@/lib/authFetch';
import { getOrCreateMobileId } from '@/lib/deviceId';

export default function CommunityChatScreen() {
  const router = useRouter();
  const t = useT();
  const params = useLocalSearchParams<{
    conversationId?: string;
    otherId?: string;
    contextType?: string;
    contextRef?: string;
    productName?: string;
    productPrice?: string;
    productUnit?: string;
    productImageUrl?: string;
    productEmoji?: string;
  }>();

  const conversationId = (params?.conversationId as string) || '';
  const recipientId = (params?.otherId as string) || '';
  const contextType = (params?.contextType as string) || undefined;
  const contextRef = (params?.contextRef as string) || undefined;

  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const [myMobileId, setMyMobileId] = useState<string>('');
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // Resolve myMobileId on mount
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

  const { messages, isLoading, error, seenByOther, sendMessage, markRead, applyOfferStatus } =
    useChatMessages({
      conversationId: conversationId && conversationId !== 'new' ? conversationId : undefined,
      otherParticipantId: recipientId || undefined,
      myMobileId: myMobileId || undefined,
    });

  // Typing indicator for the remote participant
  const { isTypingRemote, sendTyping, sendStopTyping } = useTypingIndicator(recipientId);

  // Mark read on mount + whenever new messages arrive
  useEffect(() => {
    if (conversationId) markRead();
  }, [conversationId, markRead, messages.length]);

  // Resolve the real conversation_id on mount when arriving via a deep link
  // with conversationId="new" (e.g. product-buy → "Message Seller"). Without
  // this, the history endpoint returns 404 and the user sees an empty chat
  // even if previous messages with this seller exist. Replacing the URL also
  // makes refresh + back work correctly.
  useEffect(() => {
    if (conversationId !== 'new') return;
    if (!recipientId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/v1/community/dm/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            other_mobile_id: recipientId,
            context_type: contextType ?? 'direct',
            context_ref: contextRef ?? null,
          }),
        });
        if (!res.ok) {
          console.warn('[chat] resolve failed', res.status);
          return;
        }
        const json = await res.json();
        const realId = json?.conversation_id;
        if (!realId || cancelled) return;
        router.replace({
          pathname: '/community/chat/[conversationId]',
          params: { ...params, conversationId: realId },
        });
      } catch (e) {
        console.warn('[chat] resolve error', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, recipientId, contextType, contextRef, params, router]);

  // Auto-scroll to bottom on new messages or typing indicator toggle
  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length, isTypingRemote]);

  const showPinnedProduct = useMemo(
    () => contextType === 'product' && (params?.productName || contextRef),
    [contextType, contextRef, params?.productName]
  );

  // Determine if the very last message is mine (for seen receipt positioning)
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastMessageIsMine =
    lastMessage != null &&
    (lastMessage.sender_id === myMobileId || lastMessage.sender_id === 'me');

  const handleDraftChange = useCallback(
    (text: string) => {
      setDraft(text);
      if (text.length > 0) {
        sendTyping();
      } else {
        sendStopTyping();
      }
    },
    [sendTyping, sendStopTyping]
  );

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    if (!recipientId) {
      Alert.alert(
        t({ english: 'Cannot send', urdu: 'بھیجا نہیں جا سکتا' }),
        t({ english: 'Recipient is missing.', urdu: 'وصول کنندہ غائب ہے۔' })
      );
      return;
    }
    setDraft('');
    sendStopTyping();
    try {
      await sendMessage({
        recipientId,
        body: text,
        contextType: contextType as any,
        contextRef,
      });
    } catch (e: any) {
      Alert.alert(
        t({ english: 'Send failed', urdu: 'پیغام نہیں بھیجا گیا' }),
        e?.message ?? t({ english: 'Please try again.', urdu: 'دوبارہ کوشش کریں۔' })
      );
    }
  };

  const handleBlockUser = useCallback(
    async (blockedId: string) => {
      try {
        const res = await authFetch('/api/v1/community/dm/block', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocked_id: blockedId }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status} ${text}`);
        }
        Alert.alert(
          t({ english: 'User blocked', urdu: 'صارف بلاک ہو گیا' }),
          t({
            english: 'You will no longer receive messages from this user.',
            urdu: 'اب آپ کو اس صارف سے پیغامات نہیں ملیں گے۔',
          })
        );
        if (router.canGoBack()) router.back();
        else router.replace('/community/inbox');
      } catch (e: any) {
        Alert.alert(t({ english: 'Block failed', urdu: 'بلاک ناکام' }), e?.message ?? '');
      }
    },
    [router, t]
  );

  const handleImageUploaded = async (url: string) => {
    if (!recipientId) return;
    sendStopTyping();
    try {
      await sendMessage({
        recipientId,
        imageUrl: url,
        contextType: contextType as any,
        contextRef,
      });
    } catch (e: any) {
      Alert.alert(
        t({ english: 'Send failed', urdu: 'پیغام نہیں بھیجا گیا' }),
        e?.message ?? ''
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f1e8' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}
      >
        <LinearGradient
          colors={['#0d5c4b', '#10b981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View
            style={[
              styles.headerInner,
              {
                paddingHorizontal: horizontalPadding,
                maxWidth: contentMaxWidth,
                alignSelf: 'center',
                width: '100%',
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {recipientId || t({ english: 'Chat', urdu: 'چیٹ' })}
                </Text>
                {recipientId ? <PresenceDot mobileId={recipientId} size={9} /> : null}
              </View>
              <Text style={styles.headerSub} numberOfLines={1}>
                {contextType === 'product'
                  ? t({ english: 'About a product', urdu: 'مصنوع کے بارے میں' })
                  : contextType === 'offer'
                  ? t({ english: 'About an offer', urdu: 'پیشکش کے بارے میں' })
                  : t({ english: 'Direct message', urdu: 'براہ راست پیغام' })}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/community/inbox');
              }}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel={t({ english: 'Back', urdu: 'واپس' })}
            >
              <Feather name="chevron-left" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {showPinnedProduct ? (
          <PinnedProductCard
            productId={contextRef || (params?.productName as string)}
            productName={params?.productName as string}
            productPrice={params?.productPrice ? Number(params.productPrice) : undefined}
            productUnit={params?.productUnit as string}
            productImageUrl={params?.productImageUrl as string}
            productEmoji={params?.productEmoji as string}
          />
        ) : null}

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.messagesWrap,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: 'center',
              width: '100%',
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isLoading && messages.length === 0 ? (
            <View style={styles.loaderRow}>
              <ActivityIndicator color="#0d5c4b" />
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {messages.map((m, idx) => {
            const isLastMessage = idx === messages.length - 1;
            const isMe = m.sender_id === myMobileId || m.sender_id === 'me';
            return (
              <React.Fragment key={m.message_id}>
                <MessageBubble
                  message={m}
                  myMobileId={myMobileId}
                  onOfferStatusChange={applyOfferStatus}
                  onBlockUser={handleBlockUser}
                />
                {/* Show "Seen" below the last outbound message when the other
                    participant has read it. */}
                {isLastMessage && isMe && seenByOther ? (
                  <SeenReceipt visible={true} />
                ) : null}
              </React.Fragment>
            );
          })}

          {/* Remote typing indicator — rendered at the bottom of the message list */}
          {isTypingRemote ? (
            <View style={styles.typingRow}>
              <TypingIndicator visible={true} />
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.composerWrap,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: 'center',
              width: '100%',
            },
          ]}
        >
          <ImagePickerButton onUploaded={handleImageUploaded} disabled={!recipientId} />
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={handleDraftChange}
            placeholder={t({ english: 'Type a message…', urdu: 'پیغام لکھیں…' })}
            placeholderTextColor="#9ca3af"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!draft.trim()}
          >
            <Feather name="send" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  headerSub: { color: 'rgba(255,255,255,0.78)', fontWeight: '700', marginTop: 2, fontSize: 12 },

  messagesWrap: { paddingTop: 12, paddingBottom: 12 },
  loaderRow: { paddingVertical: 24, alignItems: 'center' },
  error: { color: '#b91c1c', fontWeight: '800', marginBottom: 8 },

  typingRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderTopLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 4,
    marginBottom: 4,
  },

  composerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 16 : 12,
    backgroundColor: '#f5f1e8',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#111827',
    fontWeight: '700',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#0d5c4b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
