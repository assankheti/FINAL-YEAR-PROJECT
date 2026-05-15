import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import OfferCard, { OfferStatus } from '@/components/community/OfferCard';
import { API_BASE } from '@/config/env';
import { useT } from '@/contexts/LanguageContext';
import type { ChatMessage } from '@/hooks/useChatMessages';

type Props = {
  message: ChatMessage;
  myMobileId: string;
  /** Custom long-press handler. If omitted and `onBlockUser` is provided, the
   *  default action sheet is "Block <user> / Cancel". */
  onLongPress?: () => void;
  /** Local optimistic update for offer cards (matches useChatMessages.applyOfferStatus). */
  onOfferStatusChange?: (offerId: string, newStatus: OfferStatus) => void;
  /** When provided, long-pressing a message from another user offers a Block action. */
  onBlockUser?: (mobileId: string) => void;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function resolveImageUri(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return API_BASE + url;
}

export default function MessageBubble({
  message,
  myMobileId,
  onLongPress,
  onOfferStatusChange,
  onBlockUser,
}: Props) {
  const t = useT();
  const isMe = message.sender_id === myMobileId || message.sender_id === 'me';
  const time = formatTime(message.created_at);

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress();
      return;
    }
    if (isMe || !onBlockUser || !message.sender_id) return;
    Alert.alert(
      t({ english: `Block this user?`, urdu: 'اس صارف کو بلاک کریں؟' }),
      message.sender_id,
      [
        { text: t({ english: 'Cancel', urdu: 'منسوخ' }), style: 'cancel' },
        {
          text: t({ english: 'Block', urdu: 'بلاک کریں' }),
          style: 'destructive',
          onPress: () => onBlockUser(message.sender_id),
        },
      ]
    );
  };

  if (message.message_type === 'system') {
    return (
      <View style={styles.systemRow}>
        <Text style={styles.systemText}>{message.body || ''}</Text>
      </View>
    );
  }

  if (message.message_type === 'offer') {
    return (
      <View style={[styles.row, isMe ? styles.rowMe : styles.rowThem]}>
        <View style={{ maxWidth: '88%' }}>
          <OfferCard
            offer={message.payload as any}
            myMobileId={myMobileId}
            onLocalStatusChange={onOfferStatusChange}
          />
          <Text style={[styles.timeBelow, isMe ? styles.timeBelowMe : styles.timeBelowThem]}>
            {time}
          </Text>
        </View>
      </View>
    );
  }

  const imgUri = resolveImageUri(message.image_url);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onLongPress={handleLongPress}
      delayLongPress={250}
      style={[styles.row, isMe ? styles.rowMe : styles.rowThem]}
    >
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        {imgUri ? (
          <Image source={{ uri: imgUri }} style={styles.image} resizeMode="cover" />
        ) : null}
        {message.body ? (
          <Text style={[styles.text, isMe ? styles.textMe : styles.textThem]}>
            {message.body}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={[styles.time, isMe ? styles.timeMe : styles.timeThem]}>{time}</Text>
          {isMe ? <StatusIcon status={message.status} /> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function StatusIcon({ status }: { status?: ChatMessage['status'] }) {
  if (!status || status === 'sent') {
    return <Feather name="check" size={12} color="rgba(255,255,255,0.85)" style={{ marginLeft: 4 }} />;
  }
  if (status === 'sending') {
    return <Feather name="clock" size={12} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />;
  }
  return <Feather name="alert-circle" size={12} color="#fca5a5" style={{ marginLeft: 4 }} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 4 },
  rowMe: { justifyContent: 'flex-end' },
  rowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '84%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  bubbleMe: { backgroundColor: '#0d5c4b', borderTopRightRadius: 6 },
  bubbleThem: { backgroundColor: '#ffffff', borderTopLeftRadius: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  text: { fontWeight: '700', fontSize: 14 },
  textMe: { color: '#ffffff' },
  textThem: { color: '#111827' },
  image: { width: 220, height: 220, borderRadius: 10, marginBottom: 6, backgroundColor: '#0001' },
  metaRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4 },
  time: { fontWeight: '700', fontSize: 11 },
  timeMe: { color: 'rgba(255,255,255,0.75)' },
  timeThem: { color: '#9ca3af' },

  systemRow: { alignItems: 'center', marginVertical: 8 },
  systemText: {
    backgroundColor: 'rgba(13,92,75,0.08)',
    color: '#4b5563',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12,
  },

  timeBelow: { fontWeight: '700', fontSize: 11, marginTop: 4 },
  timeBelowMe: { color: '#9ca3af', textAlign: 'right' },
  timeBelowThem: { color: '#9ca3af', textAlign: 'left' },
});
