import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Offline cache for the AI chat conversation.
 *
 * The chatbot reply text comes from an online API, but the voice assistant must
 * still work offline. We persist the most recent conversation per mobile id so
 * that, with no connectivity, the last answers can be shown and read aloud by
 * the on-device TTS engine.
 */
export type CachedChatMessage = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  time: string;
};

const CHAT_CACHE_PREFIX = 'assanKheti.chatCache.v1';
// Bound storage — keep only the tail of the conversation.
const MAX_CACHED_MESSAGES = 50;

function cacheKey(mobileId: string): string {
  return `${CHAT_CACHE_PREFIX}.${mobileId}`;
}

export async function saveCachedChat(
  mobileId: string,
  messages: CachedChatMessage[]
): Promise<void> {
  if (!mobileId) return;
  try {
    const trimmed = messages.slice(-MAX_CACHED_MESSAGES);
    await AsyncStorage.setItem(cacheKey(mobileId), JSON.stringify(trimmed));
  } catch {
    // Best-effort cache; never let a storage error break the chat.
  }
}

export async function loadCachedChat(mobileId: string): Promise<CachedChatMessage[]> {
  if (!mobileId) return [];
  try {
    const raw = await AsyncStorage.getItem(cacheKey(mobileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is CachedChatMessage =>
        !!m &&
        typeof m.id === 'string' &&
        typeof m.text === 'string' &&
        (m.sender === 'user' || m.sender === 'ai')
    );
  } catch {
    return [];
  }
}
