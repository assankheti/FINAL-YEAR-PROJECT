import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useStreamChatConnection } from '@/hooks/useStreamChatConnection';

export function StreamChatProvider({ children }: { children: React.ReactNode }) {
  const { isConnecting, error, connect } = useStreamChatConnection();

  return (
    <>
      {error ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText} numberOfLines={2}>{error}</Text>
          <TouchableOpacity onPress={connect} style={styles.retryBtn} activeOpacity={0.85}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
  banner: {
    backgroundColor: '#fff7ed',
    borderBottomColor: '#fed7aa',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerText: { flex: 1, color: '#9a3412', fontSize: 12, fontWeight: '700' },
  retryBtn: {
    backgroundColor: '#0d5c4b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryText: { color: '#fff', fontWeight: '800', fontSize: 12 },
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
