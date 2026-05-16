import { useCallback, useEffect, useRef, useState } from 'react';

import { ensureSocket, useSocketEvent } from '@/hooks/useSocket';

/**
 * Typing indicator hook for DM conversations.
 *
 * Usage:
 *   const { isTypingRemote, sendTyping, sendStopTyping } = useTypingIndicator(recipientId);
 *
 * - `isTypingRemote` is true while the remote participant is typing (auto-
 *   resets after REMOTE_TIMEOUT_MS of no `typing:update` events).
 * - `sendTyping()` emits a `typing` socket event debounced — repeated rapid
 *   calls only fire the socket once per DEBOUNCE_MS, and auto-emit
 *   `stop_typing` after STOP_AFTER_MS of inactivity.
 * - `sendStopTyping()` immediately emits `stop_typing` and cancels any
 *   pending auto-stop timer.
 * - Both emitters are no-ops if the socket is unavailable; errors are swallowed
 *   because typing indicators are best-effort.
 */

const DEBOUNCE_MS = 500;
const STOP_AFTER_MS = 3000;
const REMOTE_TIMEOUT_MS = 5000; // guard: remote side may not send stop_typing

type TypingUpdatePayload = {
  sender_id: string;
  is_typing: boolean;
};

type UseTypingIndicatorResult = {
  /** True while the remote participant is actively typing. */
  isTypingRemote: boolean;
  /**
   * Call this on every keystroke (onChangeText) when text is non-empty.
   * Internally debounced so the socket only receives one event per burst.
   */
  sendTyping: () => void;
  /** Call this immediately when the user clears text or sends a message. */
  sendStopTyping: () => void;
};

export function useTypingIndicator(recipientId: string): UseTypingIndicatorResult {
  const [isTypingRemote, setIsTypingRemote] = useState(false);

  // ----- Remote timeout guard -----
  const remoteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRemoteTimeout = useCallback(() => {
    if (remoteTimeoutRef.current !== null) {
      clearTimeout(remoteTimeoutRef.current);
      remoteTimeoutRef.current = null;
    }
  }, []);

  const resetRemoteTimeout = useCallback(() => {
    clearRemoteTimeout();
    remoteTimeoutRef.current = setTimeout(() => {
      setIsTypingRemote(false);
    }, REMOTE_TIMEOUT_MS);
  }, [clearRemoteTimeout]);

  // Subscribe to typing:update from the remote participant
  useSocketEvent('typing:update', (payload: TypingUpdatePayload) => {
    if (!payload || payload.sender_id !== recipientId) return;
    if (payload.is_typing) {
      setIsTypingRemote(true);
      resetRemoteTimeout();
    } else {
      clearRemoteTimeout();
      setIsTypingRemote(false);
    }
  });

  // Clean up remote timeout on unmount
  useEffect(() => {
    return () => {
      clearRemoteTimeout();
    };
  }, [clearRemoteTimeout]);

  // ----- Local (outbound) typing state -----
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingLocalRef = useRef(false);

  const clearLocalTimers = useCallback(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (autoStopRef.current !== null) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }, []);

  const emitTyping = useCallback(async (isTyping: boolean) => {
    if (!recipientId) return;
    try {
      const socket = await ensureSocket();
      const event = isTyping ? 'typing' : 'stop_typing';
      socket.emit(event, { recipient_id: recipientId, is_typing: isTyping });
    } catch {
      // Typing events are best-effort; swallow errors silently.
    }
  }, [recipientId]);

  const sendTyping = useCallback(() => {
    if (!recipientId) return;

    // Clear existing auto-stop; a new one will be set below.
    if (autoStopRef.current !== null) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }

    // Debounce: only emit once per DEBOUNCE_MS burst.
    if (debounceRef.current === null && !isTypingLocalRef.current) {
      isTypingLocalRef.current = true;
      void emitTyping(true);
    } else if (debounceRef.current !== null) {
      // Already have a debounce scheduled — reset it.
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // Schedule debounce reset so the next burst emits again.
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
    }, DEBOUNCE_MS);

    // Auto-stop after STOP_AFTER_MS of no new sendTyping calls.
    autoStopRef.current = setTimeout(() => {
      if (isTypingLocalRef.current) {
        isTypingLocalRef.current = false;
        void emitTyping(false);
      }
      autoStopRef.current = null;
    }, STOP_AFTER_MS);
  }, [recipientId, emitTyping]);

  const sendStopTyping = useCallback(() => {
    if (!recipientId) return;
    clearLocalTimers();
    if (isTypingLocalRef.current) {
      isTypingLocalRef.current = false;
      void emitTyping(false);
    }
  }, [recipientId, clearLocalTimers, emitTyping]);

  // Clean up all outbound timers on unmount and emit stop if mid-typing.
  useEffect(() => {
    return () => {
      clearLocalTimers();
      if (isTypingLocalRef.current) {
        isTypingLocalRef.current = false;
        // Fire-and-forget; we're unmounting so we can't await.
        void emitTyping(false);
      }
    };
  }, [clearLocalTimers, emitTyping]);

  return { isTypingRemote, sendTyping, sendStopTyping };
}
