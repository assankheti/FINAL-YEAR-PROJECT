import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useT } from '@/contexts/LanguageContext';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import MessageComposer from '@/components/MessageComposer';

type ChatMessage = {
  id: string;
  from: 'me' | 'them';
  text: string;
  at: string;
};

export default function ChatScreen() {
  const router = useRouter();
  const t = useT();
  const params = useLocalSearchParams<{ contactId?: string }>();
  const rawContactId = params?.contactId;
  const contactId = typeof rawContactId === 'string' && rawContactId.trim().length > 0 ? rawContactId : t({ english: 'Chat', urdu: 'چیٹ' });

  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: 'm1', from: 'them', text: t({ english: 'Assalam o Alaikum!', urdu: 'السلام علیکم!' }), at: '10:10' },
    { id: 'm2', from: 'me', text: t({ english: 'Wa Alaikum Assalam. I want to buy.', urdu: 'وعلیکم السلام۔ میں خریدنا چاہتا ہوں۔' }), at: '10:11' },
  ]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;

    const now = new Date();
    const at = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setMessages((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, from: 'me', text, at },
    ]);
    setDraft('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f1e8' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}
      >
        <LinearGradient
          colors={["#0d5c4b", "#10b981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={[styles.headerInner, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
            <View style={{ width: 0 }} />

            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{contactId}</Text>
              <Text style={styles.headerSub} numberOfLines={1}>{t({ english: 'Chat', urdu: 'چیٹ' })}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.backBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t({ english: 'Back', urdu: 'واپس' })}
            >
              <Feather name="chevron-left" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={[styles.messagesWrap, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m) => {
            const isMe = m.from === 'me';
            return (
              <View key={m.id} style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>{m.text}</Text>
                  <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>{m.at}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: horizontalPadding }}>
          <MessageComposer draft={draft} onChangeDraft={setDraft} onSend={send} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 50, paddingBottom: 16, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: 20, justifyContent: 'space-between' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#ffffff', fontWeight: '900', fontSize: 16, flexShrink: 1 },
  headerSub: { color: 'rgba(255,255,255,0.78)', fontWeight: '700', marginTop: 2, fontSize: 12 },

  messagesWrap: { paddingTop: 14, paddingBottom: 10, gap: 10 },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '84%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  bubbleMe: { backgroundColor: '#0d5c4b', borderTopRightRadius: 6 },
  bubbleThem: { backgroundColor: '#ffffff', borderTopLeftRadius: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  bubbleText: { fontWeight: '800', fontSize: 13 },
  bubbleTextMe: { color: '#ffffff' },
  bubbleTextThem: { color: '#111827' },
  bubbleTime: { marginTop: 6, fontWeight: '800', fontSize: 11 },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.75)' },
  bubbleTimeThem: { color: '#9ca3af' },

  inputBar: {
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f5f1e8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    color: '#111827',
    fontWeight: '800',
  },
  sendBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#0d5c4b', alignItems: 'center', justifyContent: 'center' },
});
