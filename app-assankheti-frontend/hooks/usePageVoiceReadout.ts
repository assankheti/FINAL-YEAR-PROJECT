import { useEffect, useRef } from 'react';

import type { VoiceGuidanceStep } from '@/contexts/VoiceGuidanceContext';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';

/**
 * Reads a page aloud (and exposes the highlight id) when voice guidance is on.
 *
 * The start is deferred so it runs AFTER the VoiceGuidanceProvider's
 * route-change effect, which stops speech and resets the sequence counter on
 * navigation. Without this delay the parent effect cancels the sequence right
 * after a page starts it, and nothing is spoken/highlighted.
 *
 * Pass a memoized `steps` array (e.g. via useMemo keyed on the voice language)
 * so the readout doesn't restart on every render.
 */
export function usePageVoiceReadout(steps: VoiceGuidanceStep[]) {
  const { enabled, activeHighlightId, startGuidedSequence, cancelGuidedSequence } =
    useVoiceGuidance();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    const timer = setTimeout(() => startGuidedSequence(steps), 350);
    return () => {
      clearTimeout(timer);
      cancelGuidedSequence();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, steps]);

  return { activeHighlightId };
}
