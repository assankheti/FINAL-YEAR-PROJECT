import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AppLanguage = 'english' | 'urdu';

const STORAGE_TEXT_LANGUAGE = 'assanKheti.textLanguage.v1';
const STORAGE_VOICE_LANGUAGE = 'assanKheti.voiceLanguage.v1';

export function coerceAppLanguage(value: unknown, fallback: AppLanguage = 'english'): AppLanguage {
  if (value === 'english' || value === 'urdu') return value;
  if (value === 'en') return 'english';
  if (value === 'ur') return 'urdu';
  return fallback;
}

type LanguageContextValue = {
  textLanguage: AppLanguage;
  voiceLanguage: AppLanguage;
  setTextLanguage: (lang: AppLanguage) => void;
  setVoiceLanguage: (lang: AppLanguage) => void;
  hydrated: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [textLanguage, setTextLanguageState] = useState<AppLanguage>('english');
  const [voiceLanguage, setVoiceLanguageState] = useState<AppLanguage>('english');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [storedText, storedVoice] = await Promise.all([
          AsyncStorage.getItem(STORAGE_TEXT_LANGUAGE),
          AsyncStorage.getItem(STORAGE_VOICE_LANGUAGE),
        ]);

        if (!mounted) return;
        if (storedText) setTextLanguageState(coerceAppLanguage(storedText));
        if (storedVoice) setVoiceLanguageState(coerceAppLanguage(storedVoice));
      } finally {
        if (mounted) setHydrated(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setTextLanguage = useCallback((lang: AppLanguage) => {
    setTextLanguageState(lang);
    void AsyncStorage.setItem(STORAGE_TEXT_LANGUAGE, lang);
  }, []);

  const setVoiceLanguage = useCallback((lang: AppLanguage) => {
    setVoiceLanguageState(lang);
    void AsyncStorage.setItem(STORAGE_VOICE_LANGUAGE, lang);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ textLanguage, voiceLanguage, setTextLanguage, setVoiceLanguage, hydrated }),
    [textLanguage, voiceLanguage, setTextLanguage, setVoiceLanguage, hydrated]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export function useT() {
  const { textLanguage } = useLanguage();
  return useCallback(
    (obj?: string | { english?: string; urdu?: string }) => {
      if (!obj) return '';
      if (typeof obj === 'string') return obj;
      // prefer the requested language but fall back gracefully
      if (textLanguage === 'urdu') return obj.urdu ?? obj.english ?? '';
      return obj.english ?? obj.urdu ?? '';
    },
    [textLanguage]
  );
}
