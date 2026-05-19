import { useCallback, useEffect, useRef, useState } from 'react';

import type { ChatMessage } from '@/hooks/useChatMessages';
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
  markRead: () => Promise<void>;
  refresh: () => Promise<void>;
};

function genTempId() {
  return 'tmp-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
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
      setMessages(list);
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
      setMessages((prev) => [...prev, optimistic]);

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
          const idx = prev.findIndex((x) => x.client_message_id === cmid);
          if (idx === -1) return prev;
          const copy = prev.slice();
          copy[idx] = { ...real, status: 'sent' };
          return copy;
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

  return { messages, isLoading, error, sendMessage, markRead, refresh };
}
