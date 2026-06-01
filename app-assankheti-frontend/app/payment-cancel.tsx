import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default function PaymentCancelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = firstParam(params.order_id);
  const sessionId = firstParam(params.session_id);
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(18, Math.round(width * 0.06));

  useEffect(() => {
    console.log('[payment-cancel] incoming params =', {
      order_id: orderId,
      session_id: sessionId,
    });
  }, [orderId, sessionId]);

  return (
    <SafeAreaView style={styles.screen}>
      <LinearGradient colors={['#7f1d1d', '#dc2626']} style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <Text style={styles.headerTitle}>Payment Cancelled</Text>
        <Text style={styles.headerSub}>No payment was completed.</Text>
      </LinearGradient>

      <View style={[styles.body, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name="x-circle" size={30} color="#dc2626" />
          </View>
          <Text style={styles.title}>Checkout was cancelled</Text>
          <Text style={styles.copy}>
            Your payment was not completed. You can return to your orders or go back and try checkout again.
          </Text>
          {orderId ? <Text style={styles.orderId}>Order #{orderId}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.9} onPress={() => router.back()}>
              <Feather name="arrow-left" size={16} color="#0d5c4b" />
              <Text style={styles.secondaryText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.9} onPress={() => router.replace('/user-orders')}>
              <Feather name="package" size={16} color="#ffffff" />
              <Text style={styles.primaryText}>My Orders</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f1e8' },
  header: {
    paddingTop: 18,
    paddingBottom: 30,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '700', marginTop: 4 },
  body: { flex: 1, justifyContent: 'center' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f3d4d4',
    alignItems: 'center',
  },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { color: '#111827', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  copy: { color: '#6b7280', fontSize: 13, fontWeight: '600', lineHeight: 20, textAlign: 'center', marginTop: 8 },
  orderId: { color: '#991b1b', fontSize: 12, fontWeight: '900', marginTop: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  primaryBtn: {
    backgroundColor: '#0d5c4b',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
  secondaryBtn: {
    backgroundColor: '#ecfdf5',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryText: { color: '#0d5c4b', fontWeight: '900', fontSize: 13 },
});
