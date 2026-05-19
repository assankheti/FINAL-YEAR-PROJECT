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
  markRead: () => Promise<void>;
  refresh: () => Promise<void>;
  applyOfferStatus: (offerId: string, status: 'pending' | 'accepted' | 'rejected' | 'expired') => void;
};

function genTempId() {
  return 'tmp-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
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
      setMessages(list);
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
      setMessages((prev) => [...prev, optimistic]);

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
          const idx = prev.findIndex((x) => x.client_message_id === cmid);
          if (idx === -1) return prev;
          const copy = prev.slice();
          copy[idx] = { ...real, status: 'sent' };
          return copy;
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

  return { messages, isLoading, error, sendMessage, markRead, refresh, applyOfferStatus };
}
