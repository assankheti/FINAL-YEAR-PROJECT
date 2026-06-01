import * as Speech from 'expo-speech';
import { AccessibilityInfo } from 'react-native';

export type VoiceLanguage = 'english' | 'urdu';

export type SpeakOptions = {
  language: VoiceLanguage;
  rate: number;
  pitch: number;
  onStart?: () => void;
  onDone?: () => void;
  onError?: () => void;
};

const LANGUAGE_MAP: Record<VoiceLanguage, string> = {
  english: 'en-US',
  urdu: 'ur-PK',
};

class VoiceGuidanceService {
  private currentText: string | null = null;
  private pausedText: string | null = null;
  private lastOptions: SpeakOptions | null = null;
  private resolveActive: (() => void) | null = null;
  private speechToken = 0;

  speak(text: string, options: SpeakOptions): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return Promise.resolve();

    this.stop();
    const token = ++this.speechToken;
    this.currentText = trimmed;
    this.pausedText = null;
    this.lastOptions = options;

    return new Promise((resolve) => {
      this.resolveActive = resolve;
      Speech.speak(trimmed, {
        language: LANGUAGE_MAP[options.language],
        rate: options.rate,
        pitch: options.pitch,
        onStart: options.onStart,
        onDone: () => {
          if (token !== this.speechToken) return;
          this.cleanup(true);
          options.onDone?.();
          resolve();
        },
        onStopped: () => {
          if (token !== this.speechToken) return;
          this.cleanup(true);
          options.onDone?.();
          resolve();
        },
        onError: () => {
          if (token !== this.speechToken) return;
          this.cleanup(true);
          options.onError?.();
          resolve();
        },
      });
    });
  }

  announce(text: string, options: SpeakOptions): Promise<void> {
    AccessibilityInfo.announceForAccessibility(text);
    return this.speak(text, options);
  }

  announceScreen(text: string, options: SpeakOptions): Promise<void> {
    return this.announce(text, options);
  }

  stop() {
    this.speechToken += 1;
    Speech.stop();
    this.cleanup();
  }

  pause() {
    if (!this.currentText || !this.lastOptions) return;
    this.pausedText = this.currentText;
    this.stop();
  }

  resume(): Promise<void> {
    if (!this.pausedText || !this.lastOptions) return Promise.resolve();
    const resumeText = this.pausedText;
    this.pausedText = null;
    return this.speak(resumeText, this.lastOptions);
  }

  private cleanup(clearPaused = false) {
    if (this.resolveActive) {
      this.resolveActive();
    }
    this.resolveActive = null;
    this.currentText = null;
    if (clearPaused) {
      this.pausedText = null;
    }
  }
}

export const voiceGuidanceService = new VoiceGuidanceService();
