import { useCallback, useEffect, useRef, useState } from 'react';

import { dedupeMessages, type ChatMessage } from '@/hooks/useChatMessages';
import { authFetch } from '@/lib/authFetch';

type SendArgs = {
  body?: string;
  imageUrl?: string;
};

type Result = {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (args: SendArgs) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markRead: () => Promise<void>;
  refresh: () => Promise<void>;
};

function genTempId() {
  return 'tmp-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function isTempId(id?: string | null) {
  return !!id && id.startsWith('tmp-');
}

export function useGroupMessages(groupId: string | undefined): Result {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const myMobileIdRef = useRef<string>('');

  const refresh = useCallback(async () => {
    if (!groupId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/v1/community/groups/${encodeURIComponent(groupId)}/messages`
      );
      if (!res.ok) throw new Error(`fetch failed ${res.status}`);
      const json = await res.json();
      const list: ChatMessage[] = (json?.messages ?? []).map((m: ChatMessage) => ({
        ...m,
        status: 'sent',
      }));
      list.reverse();
      // Keep locally pending/failed sends not yet returned, then dedupe.
      setMessages((prev) => {
        const pending = prev.filter((m) => m.status === 'sending' || m.status === 'failed');
        return dedupeMessages([...list, ...pending]);
      });
    } catch (e: any) {
      console.warn('[useGroupMessages] refresh failed', e?.message ?? e);
      setError(e?.message ?? 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendMessage = useCallback(
    async (args: SendArgs) => {
      if (!groupId) throw new Error('groupId required');
      if (!args.body && !args.imageUrl) throw new Error('body or imageUrl required');

      if (!myMobileIdRef.current) {
        try {
          const { getOrCreateMobileId } = await import('@/lib/deviceId');
          myMobileIdRef.current = await getOrCreateMobileId();
        } catch {
          myMobileIdRef.current = 'me';
        }
      }

      const cmid = genTempId();
      const optimistic: ChatMessage = {
        message_id: cmid,
        conversation_id: null,
        sender_id: myMobileIdRef.current,
        body: args.body ?? null,
        image_url: args.imageUrl ?? null,
        message_type: args.imageUrl && !args.body ? 'image' : 'text',
        client_message_id: cmid,
        created_at: new Date().toISOString(),
        status: 'sending',
      };
      (optimistic as any).group_id = groupId;
      setMessages((prev) => dedupeMessages([...prev, optimistic]));

      try {
        const res = await authFetch(
          `/api/v1/community/groups/${encodeURIComponent(groupId)}/send`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              body: args.body,
              image_url: args.imageUrl,
              client_message_id: cmid,
            }),
          }
        );
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`HTTP send failed ${res.status} ${text}`);
        }
        const real: ChatMessage = await res.json();
        setMessages((prev) => {
          const sent: ChatMessage = { ...real, client_message_id: real.client_message_id ?? cmid, status: 'sent' };
          const has = prev.some((x) => x.client_message_id === cmid);
          const next = has
            ? prev.map((x) => (x.client_message_id === cmid ? sent : x))
            : [...prev, sent];
          return dedupeMessages(next);
        });
      } catch (err: any) {
        console.warn('[useGroupMessages] send failed', err);
        setMessages((prev) =>
          prev.map((m) =>
            m.client_message_id === cmid ? { ...m, status: 'failed' } : m
          )
        );
        throw err;
      }
    },
    [groupId]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!groupId || !messageId) return;
      // Optimistically remove; remember the entry for rollback on failure.
      let removed: ChatMessage | undefined;
      setMessages((prev) => {
        removed = prev.find((m) => m.message_id === messageId);
        return prev.filter((m) => m.message_id !== messageId);
      });

      // Optimistic-only messages (not yet persisted) need no server call.
      if (isTempId(messageId)) return;

      try {
        const res = await authFetch(
          `/api/v1/community/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}`,
          { method: 'DELETE' }
        );
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`HTTP delete failed ${res.status} ${text}`);
        }
      } catch (err) {
        if (removed) {
          const restored = removed;
          setMessages((prev) =>
            dedupeMessages([...prev, restored]).sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          );
        }
        console.warn('[useGroupMessages] delete failed', err);
        throw err;
      }
    },
    [groupId]
  );

  const markRead = useCallback(async () => {
    if (!groupId) return;
    try {
      await authFetch(
        `/api/v1/community/groups/${encodeURIComponent(groupId)}/read`,
        { method: 'POST' }
      );
    } catch (err) {
      console.warn('[useGroupMessages] markRead failed', err);
    }
  }, [groupId]);

  return { messages, isLoading, error, sendMessage, deleteMessage, markRead, refresh };
}
