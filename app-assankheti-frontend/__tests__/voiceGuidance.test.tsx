import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Speech from 'expo-speech';
import React from 'react';
import { AccessibilityInfo, Text, TouchableOpacity, View } from 'react-native';

import { SpeechHighlight } from '@/components/SpeechHighlight';
import { TalkBackButton } from '@/components/TalkBackButton';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { VoiceGuidanceProvider } from '@/contexts/VoiceGuidanceContext';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';
import { voiceGuidanceService } from '@/lib/voiceGuidance/VoiceGuidanceService';

function lastSpeakCall() {
  const calls = (Speech.speak as jest.Mock).mock.calls;
  return calls[calls.length - 1];
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <VoiceGuidanceProvider>{children}</VoiceGuidanceProvider>
    </LanguageProvider>
  );
}

function VoiceHarness() {
  const voice = useVoiceGuidance();

  return (
    <View>
      <Text testID="enabled">{voice.enabled ? 'on' : 'off'}</Text>
      <Text testID="rate">{voice.rate}</Text>
      <Text testID="pitch">{voice.pitch}</Text>
      <Text testID="active">{voice.activeHighlightId ?? 'none'}</Text>
      <TouchableOpacity testID="enable" onPress={() => voice.setEnabled(true)} />
      <TouchableOpacity testID="disable" onPress={() => voice.setEnabled(false)} />
      <TouchableOpacity testID="speak" onPress={() => voice.speak('Hello', 'step-1')} />
      <TouchableOpacity testID="speakNoHighlight" onPress={() => voice.speak('No highlight')} />
      <TouchableOpacity testID="rateUp" onPress={() => voice.setRate(1.1)} />
      <TouchableOpacity testID="pitchUp" onPress={() => voice.setPitch(1.1)} />
      <TouchableOpacity testID="preview" onPress={() => voice.preview('Preview voice')} />
      <TouchableOpacity testID="announce" onPress={() => voice.announceScreen('Dashboard ready')} />
      <TouchableOpacity testID="pause" onPress={() => voice.pause()} />
      <TouchableOpacity testID="resume" onPress={() => voice.resume()} />
      <TouchableOpacity testID="stop" onPress={() => voice.stop()} />
      <TouchableOpacity
        testID="guided"
        onPress={() =>
          voice.startGuidedSequence([
            { id: 'weather', text: 'Weather' },
            { id: 'prices', text: 'Prices' },
          ])
        }
      />
      <TouchableOpacity testID="guidedEmpty" onPress={() => voice.startGuidedSequence([])} />
      <TouchableOpacity testID="cancel" onPress={() => voice.cancelGuidedSequence()} />
    </View>
  );
}

describe('VoiceGuidanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('speaks with English and Urdu language codes', async () => {
    const english = voiceGuidanceService.speak('Hello', {
      language: 'english',
      rate: 1,
      pitch: 1,
    });
    expect(lastSpeakCall()[0]).toBe('Hello');
    expect(lastSpeakCall()[1].language).toBe('en-US');
    act(() => {
      lastSpeakCall()[1].onDone();
    });
    await english;

    const urdu = voiceGuidanceService.speak('خوش آمدید', {
      language: 'urdu',
      rate: 0.9,
      pitch: 1.1,
    });
    expect(lastSpeakCall()[1].language).toBe('ur-PK');
    act(() => {
      lastSpeakCall()[1].onDone();
    });
    await urdu;
  });

  it('skips empty speech and announces through accessibility', async () => {
    await voiceGuidanceService.speak('   ', {
      language: 'english',
      rate: 1,
      pitch: 1,
    });
    expect(Speech.speak).not.toHaveBeenCalled();

    const promise = voiceGuidanceService.announce('Important update', {
      language: 'english',
      rate: 1,
      pitch: 1,
    });
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Important update');
    act(() => {
      lastSpeakCall()[1].onDone();
    });
    await promise;
  });

  it('handles pause, resume, stop, stopped, and error callbacks', async () => {
    const speaking = voiceGuidanceService.speak('Pause me', {
      language: 'english',
      rate: 1,
      pitch: 1,
      onError: jest.fn(),
    });

    voiceGuidanceService.pause();
    expect(Speech.stop).toHaveBeenCalled();

    const resumed = voiceGuidanceService.resume();
    act(() => {
      lastSpeakCall()[1].onStopped();
    });
    await Promise.all([speaking, resumed]);

    const errored = voiceGuidanceService.speak('Error path', {
      language: 'english',
      rate: 1,
      pitch: 1,
      onError: jest.fn(),
    });
    act(() => {
      lastSpeakCall()[1].onError();
    });
    await errored;

    voiceGuidanceService.stop();
    expect(Speech.stop).toHaveBeenCalled();
  });

  it('ignores stale callbacks after a newer speech starts', async () => {
    const first = voiceGuidanceService.speak('First message', {
      language: 'english',
      rate: 1,
      pitch: 1,
    });
    const firstCallbacks = lastSpeakCall()[1];

    const second = voiceGuidanceService.speak('Second message', {
      language: 'english',
      rate: 1,
      pitch: 1,
    });
    const secondCallbacks = lastSpeakCall()[1];

    firstCallbacks.onDone();
    firstCallbacks.onStopped();
    firstCallbacks.onError();
    secondCallbacks.onDone();

    await Promise.all([first, second]);
  });

  it('ignores resume when idle', async () => {
    await voiceGuidanceService.resume();
    expect(Speech.speak).not.toHaveBeenCalled();
  });
});

describe('VoiceGuidanceProvider and TalkBackButton', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('loads and persists settings', async () => {
    await AsyncStorage.setItem('voiceGuidance.enabled.v1', 'true');
    await AsyncStorage.setItem('voiceGuidance.rate.v1', '1.1');
    await AsyncStorage.setItem('voiceGuidance.pitch.v1', '1.2');

    const screen = render(
      <Providers>
        <VoiceHarness />
      </Providers>
    );

    await waitFor(() => {
      expect(screen.getByTestId('enabled').props.children).toBe('on');
      expect(screen.getByTestId('rate').props.children).toBe(1.1);
      expect(screen.getByTestId('pitch').props.children).toBe(1.2);
    });
  });

  it('toggles voice guidance from the floating button', async () => {
    const screen = render(
      <Providers>
        <TalkBackButton />
      </Providers>
    );

    fireEvent.press(screen.getByLabelText('Enable voice guidance'));

    await waitFor(() => {
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Voice guidance enabled');
      expect(Speech.speak).toHaveBeenCalled();
    });
  });

  it('speaks, highlights, announces, previews, and clears highlight', async () => {
    const screen = render(
      <Providers>
        <VoiceHarness />
      </Providers>
    );

    fireEvent.press(screen.getByTestId('enable'));
    fireEvent.press(screen.getByTestId('speak'));

    await waitFor(() => {
      expect(screen.getByTestId('active').props.children).toBe('step-1');
    });

    act(() => {
      lastSpeakCall()[1].onDone();
    });
    await waitFor(() => {
      expect(screen.getByTestId('active').props.children).toBe('none');
    });

    fireEvent.press(screen.getByTestId('announce'));
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Dashboard ready');
    act(() => {
      lastSpeakCall()[1].onDone();
    });

    fireEvent.press(screen.getByTestId('preview'));
    expect(lastSpeakCall()[0]).toBe('Preview voice');
    act(() => {
      lastSpeakCall()[1].onDone();
    });
  });

  it('supports speech without a highlighted component and handles provider errors', async () => {
    const screen = render(
      <Providers>
        <VoiceHarness />
      </Providers>
    );

    fireEvent.press(screen.getByTestId('enable'));
    fireEvent.press(screen.getByTestId('speakNoHighlight'));

    await waitFor(() => {
      expect(screen.getByTestId('active').props.children).toBe('none');
      expect(lastSpeakCall()[0]).toBe('No highlight');
    });

    act(() => {
      lastSpeakCall()[1].onError();
    });
  });

  it('updates rate and pitch, pauses, resumes, and stops', async () => {
    const screen = render(
      <Providers>
        <VoiceHarness />
      </Providers>
    );

    fireEvent.press(screen.getByTestId('rateUp'));
    fireEvent.press(screen.getByTestId('pitchUp'));
    fireEvent.press(screen.getByTestId('enable'));

    await waitFor(() => {
      expect(screen.getByTestId('rate').props.children).toBe(1.1);
      expect(screen.getByTestId('pitch').props.children).toBe(1.1);
    });

    fireEvent.press(screen.getByTestId('speak'));
    fireEvent.press(screen.getByTestId('pause'));
    fireEvent.press(screen.getByTestId('resume'));
    fireEvent.press(screen.getByTestId('stop'));

    expect(Speech.stop).toHaveBeenCalled();
  });

  it('runs and cancels guided sequences', async () => {
    const screen = render(
      <Providers>
        <VoiceHarness />
      </Providers>
    );

    fireEvent.press(screen.getByTestId('guidedEmpty'));
    expect(Speech.speak).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('guided'));
    expect(Speech.speak).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('enable'));
    fireEvent.press(screen.getByTestId('guided'));

    await waitFor(() => {
      expect(screen.getByTestId('active').props.children).toBe('weather');
    });

    act(() => {
      lastSpeakCall()[1].onDone();
    });

    await waitFor(() => {
      expect(screen.getByTestId('active').props.children).toBe('prices');
    });

    fireEvent.press(screen.getByTestId('cancel'));
    await waitFor(() => {
      expect(screen.getByTestId('active').props.children).toBe('none');
    });
  });

  it('does not speak app content while disabled', async () => {
    const screen = render(
      <Providers>
        <VoiceHarness />
      </Providers>
    );

    fireEvent.press(screen.getByTestId('speak'));
    fireEvent.press(screen.getByTestId('announce'));

    await waitFor(() => {
      expect(Speech.speak).not.toHaveBeenCalled();
    });
  });

  it('announces disabled state', async () => {
    const screen = render(
      <Providers>
        <VoiceHarness />
      </Providers>
    );

    fireEvent.press(screen.getByTestId('disable'));
    await waitFor(() => {
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Voice guidance disabled');
    });
  });
});

describe('SpeechHighlight', () => {
  it('renders children in both states', () => {
    const screen = render(
      <SpeechHighlight active={false}>
        <Text>Weather Card</Text>
      </SpeechHighlight>
    );

    expect(screen.getByText('Weather Card')).toBeTruthy();

    screen.rerender(
      <SpeechHighlight active>
        <Text>Weather Card</Text>
      </SpeechHighlight>
    );

    expect(screen.getByText('Weather Card')).toBeTruthy();
  });
});

describe('useVoiceGuidance', () => {
  it('requires VoiceGuidanceProvider', () => {
    function BadHarness() {
      useVoiceGuidance();
      return null;
    }

    expect(() => render(<BadHarness />)).toThrow('useVoiceGuidance must be used within VoiceGuidanceProvider');
  });
});
