import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { API_BASE } from '@/config/env';
import { useT } from '@/contexts/LanguageContext';
import { getOrCreateMobileId } from '@/lib/deviceId';

type Block = {
  blocker_id: string;
  blocked_id: string;
  created_at?: string;
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('auth.access_token');
  const out: Record<string, string> = {};
  if (token) out.Authorization = `Bearer ${token}`;
  return out;
}

export default function BlockedUsersScreen() {
  const router = useRouter();
  const t = useT();
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const mobileId = await getOrCreateMobileId();
      const headers = await authHeaders();
      const res = await fetch(
        API_BASE + `/api/v1/community/dm/blocks/${encodeURIComponent(mobileId)}`,
        { headers }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setBlocks(json?.blocks ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load blocks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const unblock = async (blockedId: string) => {
    if (busyId) return;
    setBusyId(blockedId);
    try {
      const headers = await authHeaders();
      const res = await fetch(API_BASE + '/api/v1/community/dm/unblock', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_id: blockedId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setBlocks((prev) => prev.filter((b) => b.blocked_id !== blockedId));
    } catch (e: any) {
      Alert.alert(
        t({ english: 'Unblock failed', urdu: 'ان بلاک ناکام' }),
        e?.message ?? ''
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f1e8' }}>
      <LinearGradient
        colors={['#0d5c4b', '#10b981']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View
          style={[
            styles.headerInner,
            { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="chevron-left" size={20} color="#ffffff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {t({ english: 'Blocked users', urdu: 'بلاک شدہ صارفین' })}
            </Text>
            <Text style={styles.headerSub}>
              {blocks.length} {t({ english: 'blocked', urdu: 'بلاک' })}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator color="#0d5c4b" />
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && blocks.length === 0 ? (
          <Text style={styles.empty}>
            {t({ english: 'No blocked users', urdu: 'کوئی بلاک شدہ صارف نہیں' })}
          </Text>
        ) : null}

        {blocks.map((b) => (
          <View key={b.blocked_id} style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{b.blocked_id.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>
                {b.blocked_id}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => unblock(b.blocked_id)}
              style={[styles.unblockBtn, busyId === b.blocked_id && { opacity: 0.6 }]}
              disabled={busyId === b.blocked_id}
            >
              {busyId === b.blocked_id ? (
                <ActivityIndicator color="#0d5c4b" />
              ) : (
                <Text style={styles.unblockText}>
                  {t({ english: 'Unblock', urdu: 'ان بلاک' })}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 50, paddingBottom: 16, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#ffffff', fontWeight: '900', fontSize: 18 },
  headerSub: { color: 'rgba(255,255,255,0.78)', fontWeight: '700', marginTop: 2, fontSize: 12 },

  body: { paddingTop: 16, paddingBottom: 24 },
  loaderRow: { paddingVertical: 24, alignItems: 'center' },
  error: { color: '#b91c1c', fontWeight: '800', marginBottom: 12 },
  empty: { color: '#6b7280', fontWeight: '700', textAlign: 'center', paddingVertical: 24 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  avatarText: { color: '#991b1b', fontWeight: '900', fontSize: 13 },
  name: { fontWeight: '900', fontSize: 14, color: '#111827' },
  unblockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  unblockText: { color: '#0d5c4b', fontWeight: '900', fontSize: 13 },
});
