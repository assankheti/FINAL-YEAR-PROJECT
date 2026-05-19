import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ImagePickerButton from '@/components/community/ImagePickerButton';
import MessageBubble from '@/components/community/MessageBubble';
import PinnedProductCard from '@/components/community/PinnedProductCard';
import PresenceDot from '@/components/community/PresenceDot';
import { useT } from '@/contexts/LanguageContext';
import { useChatMessages } from '@/hooks/useChatMessages';
import { authFetch } from '@/lib/authFetch';
import { getOrCreateMobileId } from '@/lib/deviceId';

function formatFarmerLabel(id?: string): string {
  if (!id) return 'Farmer';
  const clean = id.replace(/^device:/, '');
  const hex = clean.replace(/[^a-fA-F0-9]/g, '');
  if (hex.length >= 4) return `Farmer ···${hex.slice(-4).toUpperCase()}`;
  return 'Farmer';
}

function getInitials(value?: string) {
  const cleaned = (value ?? '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  if (!cleaned) return 'FM';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

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

  const { width, height } = useWindowDimensions();
  const isNarrow = width < 360;
  const isVeryNarrow = width < 340;
  const isShort = height < 760;
  const horizontalPadding = isVeryNarrow ? 14 : isNarrow ? 16 : Math.max(18, Math.round(width * 0.055));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);
  const headerTopPadding = isShort ? 28 : 36;
  const headerBottomPadding = isVeryNarrow ? 18 : 22;

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

  const { messages, isLoading, error, sendMessage, markRead, applyOfferStatus } =
    useChatMessages({
      conversationId: conversationId && conversationId !== 'new' ? conversationId : undefined,
      otherParticipantId: recipientId || undefined,
      myMobileId: myMobileId || undefined,
    });

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
  }, [messages.length]);

  const showPinnedProduct = useMemo(
    () => contextType === 'product' && (params?.productName || contextRef),
    [contextType, contextRef, params?.productName]
  );
  const chatTitle = recipientId ? formatFarmerLabel(recipientId) : t({ english: 'Community Chat', urdu: 'کمیونٹی چیٹ' });
  const chatSubline = useMemo(() => {
    if (contextType === 'product') {
      return t({ english: 'Discussing a product listing', urdu: 'مصنوع کی فہرست پر گفتگو' });
    }
    if (contextType === 'offer') {
      return t({ english: 'Conversation about an offer', urdu: 'پیشکش کے بارے میں گفتگو' });
    }
    return t({ english: 'Private chat with a community member', urdu: 'کمیونٹی ممبر کے ساتھ نجی گفتگو' });
  }, [contextType, t]);
  const canSend = !!draft.trim() && !!recipientId;

  const handleDraftChange = useCallback((text: string) => {
    setDraft(text);
  }, []);

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
    const previousDraft = text;
    setDraft('');
    try {
      await sendMessage({
        recipientId,
        body: text,
        contextType: contextType as any,
        contextRef,
      });
    } catch (e: any) {
      setDraft(previousDraft);
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

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/community/inbox');
  }, [router]);

  const handleHeaderActions = useCallback(() => {
    if (!recipientId) return;
    Alert.alert(chatTitle, chatSubline, [
      { text: t({ english: 'Cancel', urdu: 'منسوخ' }), style: 'cancel' },
      {
        text: t({ english: 'Block user', urdu: 'صارف کو بلاک کریں' }),
        style: 'destructive',
        onPress: () => handleBlockUser(recipientId),
      },
    ]);
  }, [chatSubline, chatTitle, handleBlockUser, recipientId, t]);

  const handleImageUploaded = async (url: string) => {
    if (!recipientId) {
      Alert.alert(
        t({ english: 'Cannot send image', urdu: 'تصویر نہیں بھیجی جا سکتی' }),
        t({ english: 'Recipient is missing.', urdu: 'وصول کنندہ غائب ہے۔' })
      );
      return;
    }
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
          style={[
            styles.header,
            {
              paddingTop: headerTopPadding,
              paddingBottom: headerBottomPadding,
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
              },
            ]}
          >
            <View style={styles.headerControls}>
              <TouchableOpacity
                onPress={handleBack}
                style={styles.glassBtn}
                accessibilityRole="button"
                accessibilityLabel={t({ english: 'Back', urdu: 'واپس' })}
              >
                <Feather name="chevron-left" size={20} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleHeaderActions}
                style={styles.glassBtn}
                accessibilityRole="button"
                accessibilityLabel={t({ english: 'Chat options', urdu: 'چیٹ کے اختیارات' })}
                disabled={!recipientId}
              >
                <Feather name="more-horizontal" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.headerProfileRow}>
              <View style={styles.avatarWrap}>
                <View style={[styles.headerAvatar, isVeryNarrow ? styles.headerAvatarCompact : null]}>
                  <Text style={styles.headerAvatarText}>{getInitials(chatTitle)}</Text>
                </View>
                {recipientId ? (
                  <View style={styles.headerPresence}>
                    <PresenceDot mobileId={recipientId} size={isVeryNarrow ? 9 : 10} />
                  </View>
                ) : null}
              </View>
              <View style={styles.headerCopy}>
                <Text style={[styles.headerTitle, isNarrow ? styles.headerTitleCompact : null]} numberOfLines={1}>
                  {chatTitle}
                </Text>
                <Text style={[styles.headerSub, isNarrow ? styles.headerSubCompact : null]} numberOfLines={2}>
                  {chatSubline}
                </Text>
              </View>
            </View>
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

          {messages.map((m) => (
            <MessageBubble
              key={m.message_id}
              message={m}
              myMobileId={myMobileId}
              onOfferStatusChange={applyOfferStatus}
              onBlockUser={handleBlockUser}
            />
          ))}

        </ScrollView>

        <View
          style={[
            styles.composerArea,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: 'center',
              width: '100%',
            },
          ]}
        >
          {!recipientId ? (
            <Text style={styles.composerHint}>
              {t({ english: 'Recipient unavailable. Return and start the chat again.', urdu: 'وصول کنندہ دستیاب نہیں۔ واپس جائیں اور چیٹ دوبارہ شروع کریں۔' })}
            </Text>
          ) : null}
          <View style={styles.composerWrap}>
          <ImagePickerButton onUploaded={handleImageUploaded} disabled={!recipientId} />
            <View style={styles.inputShell}>
              <TextInput
                style={[styles.input, isVeryNarrow ? styles.inputCompact : null]}
                value={draft}
                onChangeText={handleDraftChange}
                placeholder={t({ english: 'Type a message…', urdu: 'پیغام لکھیں…' })}
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="center"
                maxLength={500}
              />
            </View>
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel={t({ english: 'Send message', urdu: 'پیغام بھیجیں' })}
          >
            <Feather name="send" size={18} color="#ffffff" />
          </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 36,
    paddingBottom: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
  },
  headerGlowOne: {
    position: 'absolute',
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: 'rgba(255,255,255,0.08)',
    right: -46,
    top: -26,
  },
  headerGlowTwo: {
    position: 'absolute',
    width: 122,
    height: 122,
    borderRadius: 61,
    backgroundColor: 'rgba(255,255,255,0.06)',
    left: -24,
    bottom: -18,
  },
  headerInner: {
    gap: 18,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glassBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: { position: 'relative' },
  headerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarCompact: {
    width: 46,
    height: 46,
    borderRadius: 16,
  },
  headerAvatarText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  headerPresence: { position: 'absolute', right: -3, bottom: -3 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { color: '#ffffff', fontWeight: '900', fontSize: 24, lineHeight: 28 },
  headerTitleCompact: { fontSize: 21, lineHeight: 25 },
  headerSub: { color: 'rgba(255,255,255,0.82)', fontWeight: '700', marginTop: 4, fontSize: 13, lineHeight: 18 },
  headerSubCompact: { fontSize: 12, lineHeight: 17 },

  messagesWrap: { paddingTop: 16, paddingBottom: 18, gap: 2 },
  loaderRow: { paddingVertical: 24, alignItems: 'center' },
  error: { color: '#b91c1c', fontWeight: '800', marginBottom: 8 },

  composerArea: {
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 16 : 12,
    backgroundColor: '#f5f1e8',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  composerHint: {
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  composerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 22,
    backgroundColor: '#fffdf8',
    borderWidth: 1,
    borderColor: '#e6ece9',
  },
  inputShell: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 112,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#111827',
    fontWeight: '600',
    fontSize: 15,
  },
  inputCompact: {
    fontSize: 14,
    paddingHorizontal: 12,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#0d5c4b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
