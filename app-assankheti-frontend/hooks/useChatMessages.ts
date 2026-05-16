import { useCallback, useEffect, useRef, useState } from 'react';

import { ensureSocket, useSocketEvent } from '@/hooks/useSocket';
import { authFetch } from '@/lib/authFetch';

const ACK_TIMEOUT_MS = 5000;

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
  /**
   * True once the remote participant has seen the last outbound message
   * (server emits `dm:seen` when they call dm:read).
   * Resets to false whenever a new message is sent.
   */
  seenByOther: boolean;
  sendMessage: (args: SendArgs) => Promise<void>;
  markRead: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Optimistically flip an embedded offer card's status without waiting for the
   *  server's broadcast. Caller should still expect an idempotent broadcast to
   *  arrive shortly after. */
  applyOfferStatus: (offerId: string, status: 'pending' | 'accepted' | 'rejected' | 'expired') => void;
};

function genTempId() {
  // RFC4122-ish; collision odds are fine for client-side temp ids
  return 'tmp-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type Options = {
  conversationId?: string;
  /** Other DM participant — used to filter inbound events when we don't yet
   *  have a real conversation_id (e.g. on the Message Seller flow). */
  otherParticipantId?: string;
  /**
   * The caller's own mobile_id.  When provided the hook uses it to determine
   * which `dm:seen` broadcasts are from the *other* participant (i.e. the
   * remote party has seen our messages).  Falls back to comparing sender_id
   * with the literal string `'me'` when omitted.
   */
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
  const [seenByOther, setSeenByOther] = useState<boolean>(false);

  // Track temp ids → real ids so we can dedupe when the same message comes
  // back via dm:received from another device.
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
      // Backend returns desc by created_at; UI wants oldest-first
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

  const matchesThisThread = useCallback(
    (m: ChatMessage): boolean => {
      if (conversationId && m.conversation_id) {
        return m.conversation_id === conversationId;
      }
      if (otherParticipantId) {
        // Pre-conversation flow: accept inbound from the seller we're chatting with,
        // or our own outbound to that seller (sender_id === me, recipient_id === other).
        return (
          m.sender_id === otherParticipantId ||
          m.recipient_id === otherParticipantId
        );
      }
      return false;
    },
    [conversationId, otherParticipantId]
  );

  // Live updates via socket
  useSocketEvent('dm:received', (payload: any) => {
    const m: ChatMessage = payload?.message;
    if (!m) return;
    if (!matchesThisThread(m)) return;
    setMessages((prev) => {
      // Dedupe: if we already have this message_id (e.g. from sender's own
      // dm:sent ack), skip.
      if (prev.some((x) => x.message_id === m.message_id)) return prev;
      // Replace optimistic temp by client_message_id match
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

  useSocketEvent('dm:sent', (payload: any) => {
    const m: ChatMessage = payload?.message;
    if (!m) return;
    if (!matchesThisThread(m)) return;
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
    // A new outbound message resets the seen state.
    setSeenByOther(false);
  });

  // Seen receipt: server emits dm:seen when the recipient calls dm:read.
  // We flip seenByOther to true only when the reader is NOT the current user
  // (i.e. the other participant has now seen our last message).
  useSocketEvent('dm:seen', (payload: any) => {
    if (!payload) return;
    const { conversation_id: cid, reader_id } = payload as {
      conversation_id?: string;
      reader_id?: string;
      seen_at?: string;
    };

    // Filter to this conversation only.
    if (conversationId && cid && cid !== conversationId) return;

    // Ignore if we are the reader (we only care when the *other* person reads).
    if (!reader_id) return;
    const isSelf =
      (myMobileId && reader_id === myMobileId) || reader_id === 'me';
    if (isSelf) return;

    setSeenByOther(true);
  });

  const httpFallbackSend = useCallback(
    async (clientMessageId: string, args: SendArgs) => {
      const res = await authFetch('/api/v1/community/dm/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: args.recipientId,
          body: args.body,
          image_url: args.imageUrl,
          context_type: args.contextType,
          context_ref: args.contextRef,
          client_message_id: clientMessageId,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP send failed ${res.status} ${text}`);
      }
      const json = await res.json();
      const real: ChatMessage = json;
      setMessages((prev) => {
        const idx = prev.findIndex(
          (x) => x.client_message_id === clientMessageId
        );
        if (idx === -1) return prev;
        const copy = prev.slice();
        copy[idx] = { ...real, status: 'sent' };
        return copy;
      });
      // New send always resets seen state.
      setSeenByOther(false);
    },
    []
  );

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
      // Reset seen on new outbound message.
      setSeenByOther(false);

      let ackReceived = false;
      let usedFallback = false;

      try {
        const socket = await ensureSocket();
        const ackPayload = {
          recipient_id: args.recipientId,
          body: args.body,
          image_url: args.imageUrl,
          context_type: args.contextType,
          context_ref: args.contextRef,
          client_message_id: cmid,
        };

        // socket.io-client supports emitWithAck if available; we still race
        // against a manual timeout so a silent server still triggers fallback.
        const ackPromise = new Promise<void>((resolve) => {
          const onSent = (payload: any) => {
            const m: ChatMessage = payload?.message;
            if (!m || m.client_message_id !== cmid) return;
            ackReceived = true;
            socket.off('dm:sent', onSent);
            resolve();
          };
          socket.on('dm:sent', onSent);
          socket.emit('dm:send', ackPayload);
          setTimeout(() => {
            if (!ackReceived) {
              socket.off('dm:sent', onSent);
              resolve();
            }
          }, ACK_TIMEOUT_MS);
        });

        await ackPromise;

        if (!ackReceived) {
          usedFallback = true;
          await httpFallbackSend(cmid, args);
        }
      } catch (err) {
        console.warn('[useChatMessages] socket send failed, trying HTTP', err);
        try {
          usedFallback = true;
          await httpFallbackSend(cmid, args);
        } catch (httpErr) {
          console.warn('[useChatMessages] HTTP send also failed', httpErr);
          setMessages((prev) =>
            prev.map((m) =>
              m.client_message_id === cmid ? { ...m, status: 'failed' } : m
            )
          );
          throw httpErr;
        }
      }

      void usedFallback; // (kept around for future telemetry/retry UI)
    },
    [conversationId, myMobileId, httpFallbackSend]
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

  // Live offer transitions: the server broadcasts offer:status_changed to the
  // counterparty's user room when an offer is accepted/rejected/withdrawn.
  useSocketEvent('offer:status_changed', (payload: any) => {
    const offer = payload?.offer;
    if (!offer?.offer_id || !offer?.status) return;
    applyOfferStatus(offer.offer_id, offer.status);
  });

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    try {
      const socket = await ensureSocket();
      socket.emit('dm:read', { conversation_id: conversationId });
    } catch {
      // socket unavailable; HTTP fallback
      try {
        await authFetch('/api/v1/community/dm/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: conversationId }),
        });
      } catch (err) {
        console.warn('[useChatMessages] markRead failed', err);
      }
    }
  }, [conversationId]);

  return { messages, isLoading, error, seenByOther, sendMessage, markRead, refresh, applyOfferStatus };
}
