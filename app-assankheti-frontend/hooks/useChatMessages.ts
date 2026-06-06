import { useCallback, useEffect, useRef, useState } from 'react';

import { authFetch } from '@/lib/authFetch';

export type MessageStatus = 'sending' | 'sent' | 'failed';

export type ChatMessage = {
  message_id: string;
  conversation_id?: string | null;
  sender_id: string;
  recipient_id?: string | null;
  body?: string | null;
  image_url?: string | null;
  message_type: 'text' | 'image' | 'system' | 'offer';
  payload?: Record<string, any> | null;
  client_message_id?: string | null;
  created_at: string;
  status?: MessageStatus;
};

type SendArgs = {
  recipientId: string;
  body?: string;
  imageUrl?: string;
  contextType?: 'product' | 'group' | 'offer' | 'direct';
  contextRef?: string;
};

type Result = {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (args: SendArgs) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markRead: () => Promise<void>;
  refresh: () => Promise<void>;
  applyOfferStatus: (offerId: string, status: 'pending' | 'accepted' | 'rejected' | 'expired') => void;
};

function genTempId() {
  return 'tmp-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function isTempId(id?: string | null) {
  return !!id && id.startsWith('tmp-');
}

/**
 * Collapse duplicate messages. Two entries are the same logical message if they
 * share a `message_id` OR a `client_message_id`. This prevents a message from
 * appearing more than once when an optimistic copy (temp id) and the server copy
 * (real id, same client_message_id) coexist — e.g. after a "new" conversation is
 * resolved and the history is refetched right after sending.
 */
export function dedupeMessages(list: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of list) {
    const i = out.findIndex(
      (r) =>
        (!!r.message_id && !!m.message_id && r.message_id === m.message_id) ||
        (!!r.client_message_id && !!m.client_message_id && r.client_message_id === m.client_message_id)
    );
    if (i === -1) {
      out.push(m);
      continue;
    }
    // Already present — keep the most "real" version (prefer a server 'sent'
    // copy and a non-temporary message id).
    const preferNew =
      (m.status === 'sent' && out[i].status !== 'sent') ||
      (!isTempId(m.message_id) && isTempId(out[i].message_id));
    out[i] = preferNew ? { ...out[i], ...m } : { ...m, ...out[i] };
  }
  return out;
}

type Options = {
  conversationId?: string;
  otherParticipantId?: string;
  myMobileId?: string;
};

export function useChatMessages(opts: Options | string | undefined): Result {
  const optsObj: Options = typeof opts === 'string' ? { conversationId: opts } : opts ?? {};
  const conversationId = optsObj.conversationId;
  const otherParticipantId = optsObj.otherParticipantId;
  const myMobileId = optsObj.myMobileId ?? '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const tempByCmid = useRef<Map<string, string>>(new Map());

  const refresh = useCallback(async () => {
    if (!conversationId || conversationId === 'new') {
      setMessages([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/v1/community/dm/messages/${encodeURIComponent(conversationId)}`
      );
      if (!res.ok) throw new Error(`fetch failed ${res.status}`);
      const json = await res.json();
      const list: ChatMessage[] = (json?.messages ?? []).map((m: ChatMessage) => ({
        ...m,
        status: 'sent',
      }));
      list.reverse();
      // Keep any locally pending/failed sends that the server hasn't returned
      // yet, then dedupe so a message never shows twice.
      setMessages((prev) => {
        const pending = prev.filter((m) => m.status === 'sending' || m.status === 'failed');
        return dedupeMessages([...list, ...pending]);
      });
    } catch (e: any) {
      console.warn('[useChatMessages] refresh failed', e?.message ?? e);
      setError(e?.message ?? 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendMessage = useCallback(
    async (args: SendArgs) => {
      if (!args.recipientId) throw new Error('recipientId required');
      if (!args.body && !args.imageUrl) throw new Error('body or imageUrl required');

      const cmid = genTempId();
      const optimistic: ChatMessage = {
        message_id: cmid,
        conversation_id: conversationId ?? null,
        sender_id: myMobileId || 'me',
        recipient_id: args.recipientId,
        body: args.body ?? null,
        image_url: args.imageUrl ?? null,
        message_type: args.imageUrl && !args.body ? 'image' : 'text',
        client_message_id: cmid,
        created_at: new Date().toISOString(),
        status: 'sending',
      };
      tempByCmid.current.set(cmid, cmid);
      setMessages((prev) => dedupeMessages([...prev, optimistic]));

      try {
        const res = await authFetch('/api/v1/community/dm/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient_id: args.recipientId,
            body: args.body,
            image_url: args.imageUrl,
            context_type: args.contextType,
            context_ref: args.contextRef,
            client_message_id: cmid,
          }),
        });
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
        console.warn('[useChatMessages] send failed', err);
        setMessages((prev) =>
          prev.map((m) =>
            m.client_message_id === cmid ? { ...m, status: 'failed' } : m
          )
        );
        throw err;
      }
    },
    [conversationId, myMobileId]
  );

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!messageId) return;
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
        `/api/v1/community/dm/messages/${encodeURIComponent(messageId)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP delete failed ${res.status} ${text}`);
      }
    } catch (err) {
      // Restore the message in its original position on failure.
      if (removed) {
        const restored = removed;
        setMessages((prev) =>
          dedupeMessages([...prev, restored]).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        );
      }
      console.warn('[useChatMessages] delete failed', err);
      throw err;
    }
  }, []);

  const applyOfferStatus = useCallback(
    (offerId: string, status: 'pending' | 'accepted' | 'rejected' | 'expired') => {
      if (!offerId) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.message_type !== 'offer') return m;
          const payload = (m.payload || {}) as any;
          if (payload?.offer_id !== offerId) return m;
          return { ...m, payload: { ...payload, status } };
        })
      );
    },
    []
  );

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    try {
      await authFetch('/api/v1/community/dm/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId }),
      });
    } catch (err) {
      console.warn('[useChatMessages] markRead failed', err);
    }
  }, [conversationId]);

  void otherParticipantId; // kept in type for API compatibility

  return { messages, isLoading, error, sendMessage, deleteMessage, markRead, refresh, applyOfferStatus };
}
