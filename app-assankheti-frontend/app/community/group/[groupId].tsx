import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
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
import { API_BASE } from '@/config/env';
import { useT } from '@/contexts/LanguageContext';
import { useGroupMessages } from '@/hooks/useGroupMessages';
import { getOrCreateMobileId } from '@/lib/deviceId';

type GroupDetail = {
  group_id: string;
  name_en?: string;
  name_ur?: string;
  crop?: string;
  member_count?: number;
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('auth.access_token');
  const out: Record<string, string> = {};
  if (token) out.Authorization = `Bearer ${token}`;
  return out;
}

export default function CommunityGroupScreen() {
  const router = useRouter();
  const t = useT();
  const params = useLocalSearchParams<{ groupId?: string }>();
  const groupId = (params?.groupId as string) || '';

  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const [myMobileId, setMyMobileId] = useState<string>('');
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [draft, setDraft] = useState('');
  const [muted, setMuted] = useState(false);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<ScrollView>(null);

  const { messages, isLoading, error, sendMessage, markRead } = useGroupMessages(groupId);

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

  // Pull the caller's block list once so we can hide blocked senders'
  // messages on the client. The backend still delivers them.
  const loadBlocks = useCallback(async () => {
    try {
      const id = await getOrCreateMobileId();
      const headers = await authHeaders();
      const res = await fetch(
        API_BASE + `/api/v1/community/dm/blocks/${encodeURIComponent(id)}`,
        { headers }
      );
      if (!res.ok) return;
      const json = await res.json();
      const ids = (json?.blocks ?? []).map((b: any) => b.blocked_id);
      setBlockedIds(new Set(ids));
    } catch {
      /* soft fail — empty set just means no filtering */
    }
  }, []);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  // Group detail fetch
  const loadGroup = useCallback(async () => {
    if (!groupId) return;
    try {
      const headers = await authHeaders();
      const res = await fetch(
        API_BASE + `/api/v1/community/groups/${encodeURIComponent(groupId)}`,
        { headers }
      );
      if (!res.ok) return;
      const json = await res.json();
      setGroup(json);
    } catch (e) {
      console.warn('[GroupScreen] loadGroup failed', e);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      loadGroup();
    }, [loadGroup])
  );

  // Mark read on every new message arrival + on mount
  useEffect(() => {
    if (groupId) markRead();
  }, [groupId, markRead, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    try {
      await sendMessage({ body: text });
    } catch (e: any) {
      Alert.alert(
        t({ english: 'Send failed', urdu: 'پیغام نہیں بھیجا گیا' }),
        e?.message ?? ''
      );
    }
  };

  const handleImageUploaded = async (url: string) => {
    try {
      await sendMessage({ imageUrl: url });
    } catch (e: any) {
      Alert.alert(t({ english: 'Send failed', urdu: 'پیغام نہیں بھیجا گیا' }), e?.message ?? '');
    }
  };

  const callGroupAction = useCallback(
    async (path: 'leave' | 'mute', successText: { english: string; urdu: string }) => {
      try {
        const headers = await authHeaders();
        const res = await fetch(
          API_BASE + `/api/v1/community/groups/${encodeURIComponent(groupId)}/${path}`,
          { method: 'POST', headers }
        );
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status} ${text}`);
        }
        const json = await res.json().catch(() => ({}));
        if (path === 'mute' && typeof json?.muted === 'boolean') setMuted(json.muted);
        Alert.alert(t(successText));
        if (path === 'leave') router.back();
      } catch (e: any) {
        Alert.alert(t({ english: 'Failed', urdu: 'ناکام' }), e?.message ?? '');
      }
    },
    [groupId, router, t]
  );

  const showMenu = () => {
    const labels = [
      t({ english: 'View members', urdu: 'ممبران دیکھیں' }),
      muted
        ? t({ english: 'Unmute notifications', urdu: 'اطلاعات آن کریں' })
        : t({ english: 'Mute notifications', urdu: 'اطلاعات بند کریں' }),
      t({ english: 'Leave group', urdu: 'گروپ چھوڑیں' }),
      t({ english: 'Cancel', urdu: 'منسوخ' }),
    ];
    const handleIndex = (i: number) => {
      if (i === 0) {
        router.push({
          pathname: '/community/group/[groupId]/members',
          params: { groupId },
        } as any);
      } else if (i === 1) {
        callGroupAction('mute', { english: 'Notification setting updated', urdu: 'اطلاعات کی ترتیب اپ ڈیٹ ہو گئی' });
      } else if (i === 2) {
        Alert.alert(
          t({ english: 'Leave group?', urdu: 'گروپ چھوڑنا ہے؟' }),
          t({ english: 'You will stop receiving messages.', urdu: 'آپ کو پیغامات نہیں ملیں گے۔' }),
          [
            { text: t({ english: 'Cancel', urdu: 'منسوخ' }), style: 'cancel' },
            {
              text: t({ english: 'Leave', urdu: 'چھوڑیں' }),
              style: 'destructive',
              onPress: () => callGroupAction('leave', { english: 'You left the group', urdu: 'آپ نے گروپ چھوڑ دیا' }),
            },
          ]
        );
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: labels,
          destructiveButtonIndex: 2,
          cancelButtonIndex: 3,
        },
        handleIndex
      );
    } else {
      // Android/Web — emulate via Alert with three buttons (no cancel button on layout)
      Alert.alert(
        group ? t({ english: group.name_en ?? 'Group', urdu: group.name_ur ?? 'گروپ' }) : '',
        '',
        [
          { text: labels[0], onPress: () => handleIndex(0) },
          { text: labels[1], onPress: () => handleIndex(1) },
          { text: labels[2], style: 'destructive', onPress: () => handleIndex(2) },
          { text: labels[3], style: 'cancel' },
        ]
      );
    }
  };

  const headerTitle = group
    ? t({ english: group.name_en ?? '', urdu: group.name_ur ?? group.name_en ?? '' })
    : t({ english: 'Group', urdu: 'گروپ' });

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
              { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
            ]}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Feather name="chevron-left" size={20} color="#ffffff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {headerTitle}
              </Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {group?.member_count != null
                  ? `${group.member_count} ${t({ english: 'members', urdu: 'ممبران' })}`
                  : t({ english: 'Group chat', urdu: 'گروپ چیٹ' })}
              </Text>
            </View>
            <TouchableOpacity onPress={showMenu} style={styles.iconBtn}>
              <Feather name="more-vertical" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.messagesWrap,
            { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
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
          {messages
            .filter((m) => !m.sender_id || !blockedIds.has(m.sender_id))
            .map((m) => (
              <MessageBubble
                key={m.message_id}
                message={m}
                myMobileId={myMobileId}
                onBlockUser={async (blockedId) => {
                  try {
                    const headers = await authHeaders();
                    const res = await fetch(API_BASE + '/api/v1/community/dm/block', {
                      method: 'POST',
                      headers: { ...headers, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ blocked_id: blockedId }),
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    setBlockedIds((prev) => {
                      const next = new Set(prev);
                      next.add(blockedId);
                      return next;
                    });
                    Alert.alert(
                      t({ english: 'User blocked', urdu: 'صارف بلاک ہو گیا' }),
                      t({
                        english: "You won't see this user's messages anymore.",
                        urdu: 'اب آپ کو اس صارف کے پیغامات نظر نہیں آئیں گے۔',
                      })
                    );
                  } catch (e: any) {
                    Alert.alert(
                      t({ english: 'Block failed', urdu: 'بلاک ناکام' }),
                      e?.message ?? ''
                    );
                  }
                }}
              />
            ))}
        </ScrollView>

        <View
          style={[
            styles.composerWrap,
            { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
          ]}
        >
          <ImagePickerButton onUploaded={handleImageUploaded} />
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={t({ english: 'Message group…', urdu: 'گروپ کو پیغام…' })}
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
  headerTitle: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  headerSub: { color: 'rgba(255,255,255,0.78)', fontWeight: '700', marginTop: 2, fontSize: 12 },

  messagesWrap: { paddingTop: 12, paddingBottom: 12 },
  loaderRow: { paddingVertical: 24, alignItems: 'center' },
  error: { color: '#b91c1c', fontWeight: '800', marginBottom: 8 },

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
