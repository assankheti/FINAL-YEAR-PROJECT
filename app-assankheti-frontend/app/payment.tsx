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

export default function PaymentReturnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const status = firstParam(params.status);
  const orderId = firstParam(params.order_id);
  const sessionId = firstParam(params.session_id);
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(18, Math.round(width * 0.06));

  useEffect(() => {
    console.log('[payment-return] incoming params =', {
      status,
      order_id: orderId,
      session_id: sessionId,
    });

    if (status === 'cancel') {
      router.replace({
        pathname: '/payment-cancel',
        params: { status, order_id: orderId, session_id: sessionId },
      });
      return;
    }

    if (status === 'success' || status === 'return' || orderId || sessionId) {
      router.replace({
        pathname: '/payment-success',
        params: {
          status: status || 'success',
          order_id: orderId,
          session_id: sessionId,
        },
      });
    }
  }, [orderId, router, sessionId, status]);

  return (
    <SafeAreaView style={styles.screen}>
      <LinearGradient colors={['#0d5c4b', '#10b981']} style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <Text style={styles.headerTitle}>Payment Return</Text>
        <Text style={styles.headerSub}>Assan Kheti payment link is active.</Text>
      </LinearGradient>

      <View style={[styles.body, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name="link" size={26} color="#0d5c4b" />
          </View>
          <Text style={styles.title}>Waiting for payment details</Text>
          <Text style={styles.copy}>
            This route is ready for Stripe redirects. Start checkout from an order to verify a payment automatically.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.9} onPress={() => router.replace('/user-orders')}>
            <Feather name="package" size={16} color="#ffffff" />
            <Text style={styles.primaryText}>My Orders</Text>
          </TouchableOpacity>
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
    borderColor: '#e2eee9',
    alignItems: 'center',
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { color: '#111827', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  copy: { color: '#6b7280', fontSize: 13, fontWeight: '600', lineHeight: 20, textAlign: 'center', marginTop: 8 },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: '#0d5c4b',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
});
