import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { usePathname } from 'expo-router';

import { useLanguage } from '@/contexts/LanguageContext';
import { voiceGuidanceService, type VoiceLanguage } from '@/lib/voiceGuidance/VoiceGuidanceService';

const STORAGE_KEYS = {
  enabled: 'voiceGuidance.enabled.v1',
  rate: 'voiceGuidance.rate.v1',
  pitch: 'voiceGuidance.pitch.v1',
} as const;

const DEFAULTS = {
  enabled: false,
  rate: 0.9,
  pitch: 1.0,
} as const;

export type VoiceGuidanceStep = {
  id: string;
  text: string;
};

type VoiceGuidanceContextValue = {
  enabled: boolean;
  rate: number;
  pitch: number;
  hydrated: boolean;
  activeHighlightId: string | null;
  setEnabled: (value: boolean) => void;
  setRate: (value: number) => void;
  setPitch: (value: number) => void;
  speak: (text: string, highlightId?: string | null) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => Promise<void>;
  announceScreen: (text: string) => Promise<void>;
  preview: (text: string) => Promise<void>;
  startGuidedSequence: (steps: VoiceGuidanceStep[]) => void;
  cancelGuidedSequence: () => void;
};

const VoiceGuidanceContext = createContext<VoiceGuidanceContextValue | null>(null);

export function VoiceGuidanceProvider({ children }: { children: React.ReactNode }) {
  const { voiceLanguage } = useLanguage();
  const [enabled, setEnabledState] = useState<boolean>(DEFAULTS.enabled);
  const [rate, setRateState] = useState<number>(DEFAULTS.rate);
  const [pitch, setPitchState] = useState<number>(DEFAULTS.pitch);
  const [hydrated, setHydrated] = useState(false);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const pathname = usePathname();
  const sequenceIdRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [storedEnabled, storedRate, storedPitch] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.enabled),
          AsyncStorage.getItem(STORAGE_KEYS.rate),
          AsyncStorage.getItem(STORAGE_KEYS.pitch),
        ]);

        if (!mounted) return;

        if (storedEnabled != null) setEnabledState(storedEnabled === 'true');
        if (storedRate != null) setRateState(Number(storedRate));
        if (storedPitch != null) setPitchState(Number(storedPitch));
      } finally {
        if (mounted) setHydrated(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    voiceGuidanceService.stop();
    setActiveHighlightId(null);
    sequenceIdRef.current += 1;
  }, [pathname]);

  const persistEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    void AsyncStorage.setItem(STORAGE_KEYS.enabled, String(value));
  }, []);

  const setEnabled = useCallback(
    (value: boolean) => {
      persistEnabled(value);
      const message = value ? 'Voice guidance enabled' : 'Voice guidance disabled';
      AccessibilityInfo.announceForAccessibility(message);
      void voiceGuidanceService.speak(message, {
        language: voiceLanguage as VoiceLanguage,
        rate,
        pitch,
      });
    },
    [persistEnabled, pitch, rate, voiceLanguage]
  );

  const setRate = useCallback((value: number) => {
    setRateState(value);
    void AsyncStorage.setItem(STORAGE_KEYS.rate, String(value));
  }, []);

  const setPitch = useCallback((value: number) => {
    setPitchState(value);
    void AsyncStorage.setItem(STORAGE_KEYS.pitch, String(value));
  }, []);

  const speak = useCallback(
    async (text: string, highlightId?: string | null) => {
      if (!enabled) return;
      if (highlightId) setActiveHighlightId(highlightId);
      await voiceGuidanceService.speak(text, {
        language: voiceLanguage as VoiceLanguage,
        rate,
        pitch,
        onDone: () => setActiveHighlightId((current) => (current === highlightId ? null : current)),
        onError: () => setActiveHighlightId((current) => (current === highlightId ? null : current)),
      });
    },
    [enabled, pitch, rate, voiceLanguage]
  );

  const stop = useCallback(() => {
    voiceGuidanceService.stop();
    setActiveHighlightId(null);
  }, []);

  const pause = useCallback(() => {
    voiceGuidanceService.pause();
    setActiveHighlightId(null);
  }, []);

  const resume = useCallback(() => {
    return voiceGuidanceService.resume();
  }, []);

  const announceScreen = useCallback(
    async (text: string) => {
      if (!enabled) return;
      await voiceGuidanceService.announceScreen(text, {
        language: voiceLanguage as VoiceLanguage,
        rate,
        pitch,
      });
    },
    [enabled, pitch, rate, voiceLanguage]
  );

  const preview = useCallback(
    async (text: string) => {
      await voiceGuidanceService.speak(text, {
        language: voiceLanguage as VoiceLanguage,
        rate,
        pitch,
      });
    },
    [pitch, rate, voiceLanguage]
  );

  const cancelGuidedSequence = useCallback(() => {
    sequenceIdRef.current += 1;
    setActiveHighlightId(null);
  }, []);

  const startGuidedSequence = useCallback(
    (steps: VoiceGuidanceStep[]) => {
      if (!enabled || !steps.length) return;
      const sequenceId = ++sequenceIdRef.current;

      (async () => {
        for (const step of steps) {
          if (sequenceId !== sequenceIdRef.current) break;
          setActiveHighlightId(step.id);
          await voiceGuidanceService.speak(step.text, {
            language: voiceLanguage as VoiceLanguage,
            rate,
            pitch,
          });
          if (sequenceId !== sequenceIdRef.current) break;
          setActiveHighlightId(null);
        }
      })();
    },
    [enabled, pitch, rate, voiceLanguage]
  );

  const value = useMemo<VoiceGuidanceContextValue>(
    () => ({
      enabled,
      rate,
      pitch,
      hydrated,
      activeHighlightId,
      setEnabled,
      setRate,
      setPitch,
      speak,
      stop,
      pause,
      resume,
      announceScreen,
      preview,
      startGuidedSequence,
      cancelGuidedSequence,
    }),
    [
      enabled,
      rate,
      pitch,
      hydrated,
      activeHighlightId,
      setEnabled,
      setRate,
      setPitch,
      speak,
      stop,
      pause,
      resume,
      announceScreen,
      preview,
      startGuidedSequence,
      cancelGuidedSequence,
    ]
  );

  return <VoiceGuidanceContext.Provider value={value}>{children}</VoiceGuidanceContext.Provider>;
}

export function useVoiceGuidanceContext() {
  const ctx = useContext(VoiceGuidanceContext);
  if (!ctx) throw new Error('useVoiceGuidance must be used within VoiceGuidanceProvider');
  return ctx;
}
