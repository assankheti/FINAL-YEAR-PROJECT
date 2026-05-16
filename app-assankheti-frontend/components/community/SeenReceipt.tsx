import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

type Props = {
  /** When false the component renders nothing. */
  visible: boolean;
  style?: ViewStyle;
};

/**
 * A small "Seen ✓✓" row rendered below the last outbound message bubble to
 * confirm the remote participant has read it.
 *
 * Matches the color palette and font weight used in MessageBubble.
 */
export default function SeenReceipt({ visible, style }: Props) {
  if (!visible) return null;

  return (
    <View style={[styles.container, style]} accessibilityLabel="Message seen">
      <Feather name="check-circle" size={11} color="#0d5c4b" style={styles.icon} />
      <Text style={styles.label}>Seen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 4,
    marginTop: 2,
    marginBottom: 4,
    gap: 3,
  },
  icon: {
    opacity: 0.8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d5c4b',
    opacity: 0.8,
  },
});
