import { useEffect, useRef } from 'react';

import { connectSocket, getSocket } from '@/lib/socket';

type Handler = (...args: any[]) => void;

/**
 * Subscribe to a Socket.IO event for the lifetime of a component.
 *
 * - Lazily connects the singleton on first mount (token is read from
 *   AsyncStorage inside connectSocket).
 * - Removes the handler on unmount.
 * - The handler ref is updated on every render so callers can capture
 *   fresh state without resubscribing.
 */
export function useSocketEvent(event: string, handler: Handler, enabled = true): void {
  const handlerRef = useRef<Handler>(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const wrapper: Handler = (...args) => handlerRef.current(...args);

    (async () => {
      try {
        const socket = getSocket() ?? (await connectSocket());
        if (cancelled) return;
        socket.on(event, wrapper);
      } catch (err) {
        if (!(err instanceof Error) || !err.message.includes('not authenticated')) {
          console.warn('[useSocketEvent] connect failed', err);
        }
      }
    })();

    return () => {
      cancelled = true;
      const socket = getSocket();
      if (socket) socket.off(event, wrapper);
    };
  }, [enabled, event]);
}

/** Returns the live socket instance, connecting it lazily if needed. */
export async function ensureSocket() {
  return getSocket() ?? (await connectSocket());
}
