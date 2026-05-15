import { useCallback, useEffect, useRef, useState } from 'react';

import { ensureSocket, useSocketEvent } from '@/hooks/useSocket';
import type { ChatMessage } from '@/hooks/useChatMessages';
import { authFetch } from '@/lib/authFetch';

const ACK_TIMEOUT_MS = 5000;

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
      list.reverse(); // backend sends desc; UI wants oldest-first
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

  // Live updates from peers in the group
  useSocketEvent('group:received', (payload: any) => {
    const m: ChatMessage = payload?.message;
    if (!m || !groupId) return;
    if ((m as any).group_id !== groupId) return;
    setMessages((prev) => {
      if (prev.some((x) => x.message_id === m.message_id)) return prev;
      if (m.client_message_id) {
        const idx = prev.findIndex(
          (x) => x.client_message_id === m.client_message_id && x.status !== 'sent'
        );
        if (idx >= 0) {
          const copy = prev.slice();
          copy[idx] = { ...m, status: 'sent' };
          return copy;
        }
      }
      return [...prev, { ...m, status: 'sent' }];
    });
  });

  // Sender's own ack — the gateway emits dm:sent on the sender's socket for
  // group sends too (Piece 4 design note). Keep the swap path here.
  useSocketEvent('dm:sent', (payload: any) => {
    const m: ChatMessage = payload?.message;
    if (!m || !groupId) return;
    if ((m as any).group_id !== groupId) return;
    setMessages((prev) => {
      const idx = prev.findIndex(
        (x) => x.client_message_id && x.client_message_id === m.client_message_id
      );
      if (idx === -1) {
        if (prev.some((x) => x.message_id === m.message_id)) return prev;
        return [...prev, { ...m, status: 'sent' }];
      }
      const copy = prev.slice();
      copy[idx] = { ...m, status: 'sent' };
      return copy;
    });
  });

  const httpFallbackSend = useCallback(
    async (clientMessageId: string, args: SendArgs) => {
      if (!groupId) throw new Error('no groupId');
      const res = await authFetch(
        `/api/v1/community/groups/${encodeURIComponent(groupId)}/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: args.body,
            image_url: args.imageUrl,
            client_message_id: clientMessageId,
          }),
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP send failed ${res.status} ${text}`);
      }
      const real: ChatMessage = await res.json();
      setMessages((prev) => {
        const idx = prev.findIndex((x) => x.client_message_id === clientMessageId);
        if (idx === -1) return prev;
        const copy = prev.slice();
        copy[idx] = { ...real, status: 'sent' };
        return copy;
      });
    },
    [groupId]
  );

  const sendMessage = useCallback(
    async (args: SendArgs) => {
      if (!groupId) throw new Error('groupId required');
      if (!args.body && !args.imageUrl) throw new Error('body or imageUrl required');

      // Resolve my mobile_id once for the optimistic sender field. Cheap to
      // call; deviceId.ts handles caching.
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

      let ackReceived = false;

      try {
        const socket = await ensureSocket();
        const ackPromise = new Promise<void>((resolve) => {
          const onSent = (payload: any) => {
            const m: ChatMessage = payload?.message;
            if (!m || m.client_message_id !== cmid) return;
            ackReceived = true;
            socket.off('dm:sent', onSent);
            resolve();
          };
          socket.on('dm:sent', onSent);
          socket.emit('group:send', {
            group_id: groupId,
            body: args.body,
            image_url: args.imageUrl,
            client_message_id: cmid,
          });
          setTimeout(() => {
            if (!ackReceived) {
              socket.off('dm:sent', onSent);
              resolve();
            }
          }, ACK_TIMEOUT_MS);
        });
        await ackPromise;

        if (!ackReceived) {
          await httpFallbackSend(cmid, args);
        }
      } catch (err) {
        console.warn('[useGroupMessages] socket send failed, trying HTTP', err);
        try {
          await httpFallbackSend(cmid, args);
        } catch (httpErr) {
          console.warn('[useGroupMessages] HTTP send also failed', httpErr);
          setMessages((prev) =>
            prev.map((m) =>
              m.client_message_id === cmid ? { ...m, status: 'failed' } : m
            )
          );
          throw httpErr;
        }
      }
    },
    [groupId, httpFallbackSend]
  );

  const markRead = useCallback(async () => {
    if (!groupId) return;
    try {
      const socket = await ensureSocket();
      socket.emit('group:read', { group_id: groupId });
    } catch {
      try {
        await authFetch(
          `/api/v1/community/groups/${encodeURIComponent(groupId)}/read`,
          { method: 'POST' }
        );
      } catch (err) {
        console.warn('[useGroupMessages] markRead failed', err);
      }
    }
  }, [groupId]);

  return { messages, isLoading, error, sendMessage, markRead, refresh };
}
