import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createCommunityStreamChannel } from '@/lib/streamApi';

const COMMUNITY_CHANNELS = [
  { id: 'rice', name: 'Rice Farmers', crop: 'rice', icon: 'rice' },
  { id: 'wheat', name: 'Wheat Growers', crop: 'wheat', icon: 'barley' },
  { id: 'vegetables', name: 'Vegetable Market', crop: 'vegetables', icon: 'leaf' },
  { id: 'buyers', name: 'Buyer Network', crop: 'market', icon: 'storefront-outline' },
] as const;

export default function StreamCommunityChannelsScreen() {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openChannel = async (item: (typeof COMMUNITY_CHANNELS)[number]) => {
    setPendingId(item.id);
    setError(null);
    try {
      const channel = await createCommunityStreamChannel({
        channelId: item.id,
        name: item.name,
        crop: item.crop,
      });
      router.push({ pathname: '/stream-chat/channel/[cid]', params: { cid: channel.cid } } as any);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open community channel.');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.85}>
          <Feather name="arrow-left" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Community Channels</Text>
          <Text style={styles.subtitle}>Join crop and market group conversations</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {COMMUNITY_CHANNELS.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => openChannel(item)}
            style={styles.channelCard}
            activeOpacity={0.88}
            disabled={Boolean(pendingId)}
          >
            <View style={styles.channelIcon}>
              <MaterialCommunityIcons name={item.icon as any} size={24} color="#0d5c4b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.channelName}>{item.name}</Text>
              <Text style={styles.channelMeta}>Messaging, typing, read receipts, and media</Text>
            </View>
            {pendingId === item.id ? (
              <ActivityIndicator size="small" color="#0d5c4b" />
            ) : (
              <Feather name="chevron-right" size={20} color="#64748b" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 12, fontWeight: '600', marginTop: 2 },
  content: { padding: 16, gap: 12 },
  errorText: {
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    fontWeight: '700',
  },
  channelCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
  },
  channelIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelName: { color: '#0f172a', fontWeight: '900', fontSize: 15 },
  channelMeta: { color: '#64748b', fontWeight: '600', fontSize: 12, marginTop: 3 },
});
