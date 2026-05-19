import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

import { useT } from '@/contexts/LanguageContext';
import { authFetch } from '@/lib/authFetch';

type Props = {
  /** When provided, the dot subscribes to live presence for this user. */
  mobileId?: string;
  /** Static override — if set, ignore the live subscription. */
  online?: boolean;
  /** Side length in pixels. Default 10. */
  size?: number;
  /** Show a "last seen" alert on long-press. Default true when mobileId is set. */
  longPressForLastSeen?: boolean;
};

function formatLastSeen(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const diff = Math.max(0, Date.now() - d.getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

/**
 * Small circular online/offline indicator.
 *
 * Live mode (pass `mobileId`):
 *   - Initial state: HTTP GET /api/v1/community/presence/{mobile_id}
 *   - Subscribes to `presence:update` socket event and updates when the
 *     payload's mobile_id matches.
 * Static mode (pass `online` instead): the dot reflects that prop verbatim.
 */
export default function PresenceDot({
  mobileId,
  online,
  size = 10,
  longPressForLastSeen,
}: Props) {
  const t = useT();
  const liveMode = !!mobileId && online === undefined;
  const [isOnline, setIsOnline] = useState<boolean>(!!online);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  // Initial HTTP fetch
  useEffect(() => {
    if (!liveMode || !mobileId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(
          `/api/v1/community/presence/${encodeURIComponent(mobileId)}`
        );
        if (!res.ok || cancelled) return;
        const json = await res.json();
        setIsOnline(json?.status === 'online');
        setLastSeen(json?.last_active_at ?? null);
      } catch {
        // soft fail — dot stays offline (grey)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [liveMode, mobileId]);


  // In static mode, mirror the prop on every render.
  useEffect(() => {
    if (!liveMode && online !== undefined) setIsOnline(!!online);
  }, [liveMode, online]);

  const showLastSeen = longPressForLastSeen ?? liveMode;

  const handleLongPress = () => {
    if (!showLastSeen) return;
    const ago = formatLastSeen(lastSeen);
    Alert.alert(
      isOnline
        ? t({ english: 'Online', urdu: 'آن لائن' })
        : t({ english: 'Offline', urdu: 'آف لائن' }),
      isOnline
        ? t({ english: 'Active now', urdu: 'ابھی فعال' })
        : ago
        ? `${t({ english: 'Last seen', urdu: 'آخری بار دیکھا گیا' })} ${ago}`
        : t({ english: 'Last seen unknown', urdu: 'آخری بار دیکھنا معلوم نہیں' })
    );
  };

  const dot = (
    <View
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2 },
        isOnline ? styles.online : styles.offline,
      ]}
    />
  );

  if (!showLastSeen) return dot;
  return (
    <TouchableOpacity onLongPress={handleLongPress} delayLongPress={250} hitSlop={8}>
      {dot}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  dot: { borderWidth: 2, borderColor: '#ffffff' },
  online: { backgroundColor: '#22c55e' },
  offline: { backgroundColor: '#9ca3af' },
});
