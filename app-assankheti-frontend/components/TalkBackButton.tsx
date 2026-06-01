import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';

export function TalkBackButton() {
  const insets = useSafeAreaInsets();
  const { enabled, setEnabled } = useVoiceGuidance();

  return (
    <View pointerEvents="box-none" style={[styles.root, { bottom: Math.max(96, insets.bottom + 88) }]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={enabled ? 'Disable voice guidance' : 'Enable voice guidance'}
        accessibilityHint="Toggles offline spoken guidance for this app"
        accessibilityState={{ checked: enabled }}
        activeOpacity={0.8}
        onPress={() => setEnabled(!enabled)}
        style={[styles.button, enabled ? styles.buttonActive : null]}
      >
        <MaterialIcons name="accessibility" size={24} color={enabled ? '#ffffff' : '#0d5c4b'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    zIndex: 999,
  },
  button: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  buttonActive: {
    backgroundColor: '#0d5c4b',
    borderColor: '#0d5c4b',
  },
});
