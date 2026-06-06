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
  // Cache of installed voice-language prefixes (e.g. 'en', 'ur'), resolved once.
  private availableLangsPromise: Promise<Set<string>> | null = null;

  /**
   * Returns the set of base language codes the device's offline TTS engine can
   * actually speak (e.g. {'en', 'ur'}). Resolved once and cached. Offline TTS
   * only works for languages whose voice data is installed on the device.
   */
  private getAvailableLanguagePrefixes(): Promise<Set<string>> {
    if (!this.availableLangsPromise) {
      this.availableLangsPromise = (async () => {
        try {
          const voices = await Speech.getAvailableVoicesAsync();
          const set = new Set<string>();
          for (const v of voices) {
            const lang = (v.language || '').toLowerCase();
            if (lang) set.add(lang.split(/[-_]/)[0]);
          }
          return set;
        } catch {
          return new Set<string>();
        }
      })();
    }
    return this.availableLangsPromise;
  }

  /**
   * Picks a BCP-47 tag the device can actually speak. If the requested language
   * (e.g. Urdu `ur-PK`) has no installed voice, falls back to English so the
   * voice assistant never silently produces nothing while offline.
   */
  private async resolveLanguageTag(language: VoiceLanguage): Promise<string> {
    const requested = LANGUAGE_MAP[language];
    const available = await this.getAvailableLanguagePrefixes();
    // Couldn't enumerate voices — trust the requested tag rather than guess.
    if (available.size === 0) return requested;
    const prefix = requested.split('-')[0].toLowerCase();
    if (available.has(prefix)) return requested;
    if (available.has('en')) return LANGUAGE_MAP.english;
    return requested;
  }

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
      void this.resolveLanguageTag(options.language).then((language) => {
        // A newer speak()/stop() superseded us while resolving the voice.
        if (token !== this.speechToken) {
          resolve();
          return;
        }
        Speech.speak(trimmed, {
          language,
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
