import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';

type VoiceText = {
  english: string;
  urdu: string;
};

function joinVoiceText(title: VoiceText, summary?: VoiceText) {
  if (summary) {
    return {
      english: `${title.english}. ${summary.english}`,
      urdu: `${title.urdu}۔ ${summary.urdu}`,
    };
  }

  return title;
}

export function usePageVoiceGuidance(title: VoiceText, summary?: VoiceText, enabled = true) {
  const { textLanguage } = useLanguage();
  const { enabled: voiceEnabled, announceScreen, stop } = useVoiceGuidance();

  const message = useMemo(() => {
    const value = joinVoiceText(title, summary);
    return textLanguage === 'urdu' ? value.urdu : value.english;
  }, [summary, textLanguage, title]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !voiceEnabled || !message.trim()) return undefined;
      void announceScreen(message);
      return () => {
        stop();
      };
    }, [announceScreen, enabled, message, stop, voiceEnabled])
  );
}
