import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useStreamChatConnection } from '@/hooks/useStreamChatConnection';

export function StreamChatProvider({ children }: { children: React.ReactNode }) {
  const { isConnecting } = useStreamChatConnection();

  return (
    <>
      {isConnecting ? (
        <View style={styles.connecting}>
          <ActivityIndicator size="small" color="#0d5c4b" />
        </View>
      ) : null}
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  connecting: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 20,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
});
