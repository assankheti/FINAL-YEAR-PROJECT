import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useT } from '@/contexts/LanguageContext';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';

const RATE_OPTIONS = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2];
const PITCH_OPTIONS = [0.8, 0.9, 1.0, 1.1, 1.2];

function nextValue(options: number[], current: number, delta: 1 | -1) {
  const index = options.findIndex((v) => v === current);
  const safeIndex = index === -1 ? options.indexOf(1.0) : index;
  const nextIndex = Math.min(options.length - 1, Math.max(0, safeIndex + delta));
  return options[nextIndex] ?? current;
}

export default function AccessibilitySettingsPage() {
  const t = useT();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const contentMaxWidth = Math.min(width - 32, 520);

  const voiceGuidance = useVoiceGuidance();

  const labels = useMemo(
    () => ({
      title: t({ english: 'Accessibility', urdu: 'رسائی' }),
      subtitle: t({ english: 'Voice guidance and speech controls', urdu: 'آواز کی رہنمائی اور کنٹرولز' }),
      enable: t({ english: 'Enable Voice Guidance', urdu: 'وائس گائیڈنس فعال کریں' }),
      speed: t({ english: 'Speech Speed', urdu: 'آواز کی رفتار' }),
      pitch: t({ english: 'Speech Pitch', urdu: 'آواز کی پچ' }),
      test: t({ english: 'Test Voice', urdu: 'آواز آزمائیں' }),
      on: t({ english: 'On', urdu: 'آن' }),
      off: t({ english: 'Off', urdu: 'آف' }),
      sample: t({
        english: 'This is a sample voice guidance message.',
        urdu: 'یہ آواز کی رہنمائی کا نمونہ پیغام ہے۔',
      }),
    }),
    [t]
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { maxWidth: contentMaxWidth, alignSelf: 'center' }]}>
          <LinearGradient
            colors={['#e8f5e9', '#f5f1e8', '#fff8e1']}
            style={styles.header}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t({ english: 'Back', urdu: 'واپس' })}
                activeOpacity={0.9}
                onPress={() => {
                  if (router.canGoBack()) router.back();
                  else router.replace('/settings');
                }}
                style={styles.backButton}
              >
                <Feather name="arrow-left" size={18} color="#0d5c4b" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{labels.title}</Text>
                <Text style={styles.subtitle}>{labels.subtitle}</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.rowLeft}>
                <View style={styles.iconBox}>
                  <Feather name="volume-2" size={18} color="#0d5c4b" />
                </View>
                <View>
                  <Text style={styles.label}>{labels.enable}</Text>
                  <Text style={styles.hint}>{voiceGuidance.enabled ? labels.on : labels.off}</Text>
                </View>
              </View>
              <TouchableOpacity
                accessibilityRole="switch"
                accessibilityState={{ checked: voiceGuidance.enabled }}
                onPress={() => voiceGuidance.setEnabled(!voiceGuidance.enabled)}
                style={[styles.toggle, voiceGuidance.enabled ? styles.toggleOn : styles.toggleOff]}
              >
                <View style={[styles.toggleKnob, voiceGuidance.enabled ? styles.toggleKnobOn : null]} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.rowLeft}>
                <View style={styles.iconBox}>
                  <Feather name="fast-forward" size={18} color="#0d5c4b" />
                </View>
                <View>
                  <Text style={styles.label}>{labels.speed}</Text>
                  <Text style={styles.hint}>{voiceGuidance.rate.toFixed(1)}x</Text>
                </View>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Decrease speech speed"
                  onPress={() => voiceGuidance.setRate(nextValue(RATE_OPTIONS, voiceGuidance.rate, -1))}
                  style={styles.stepButton}
                >
                  <Feather name="minus" size={16} color="#0d5c4b" />
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Increase speech speed"
                  onPress={() => voiceGuidance.setRate(nextValue(RATE_OPTIONS, voiceGuidance.rate, 1))}
                  style={styles.stepButton}
                >
                  <Feather name="plus" size={16} color="#0d5c4b" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.rowLeft}>
                <View style={styles.iconBox}>
                  <Feather name="music" size={18} color="#0d5c4b" />
                </View>
                <View>
                  <Text style={styles.label}>{labels.pitch}</Text>
                  <Text style={styles.hint}>{voiceGuidance.pitch.toFixed(1)}x</Text>
                </View>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Decrease speech pitch"
                  onPress={() => voiceGuidance.setPitch(nextValue(PITCH_OPTIONS, voiceGuidance.pitch, -1))}
                  style={styles.stepButton}
                >
                  <Feather name="minus" size={16} color="#0d5c4b" />
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Increase speech pitch"
                  onPress={() => voiceGuidance.setPitch(nextValue(PITCH_OPTIONS, voiceGuidance.pitch, 1))}
                  style={styles.stepButton}
                >
                  <Feather name="plus" size={16} color="#0d5c4b" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => voiceGuidance.preview(labels.sample)}
            style={styles.testButton}
          >
            <Feather name="play" size={18} color="#ffffff" />
            <Text style={styles.testText}>{labels.test}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scroll: {
    paddingBottom: 24,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  header: {
    borderRadius: 18,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0d5c4b',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  hint: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  toggle: {
    width: 54,
    height: 30,
    borderRadius: 20,
    padding: 4,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: '#0d5c4b',
  },
  toggleOff: {
    backgroundColor: '#d1d5db',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  stepper: {
    flexDirection: 'row',
    gap: 8,
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0d5c4b',
    borderRadius: 14,
    paddingVertical: 14,
  },
  testText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
