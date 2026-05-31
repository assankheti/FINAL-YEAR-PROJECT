import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authFetch, SESSION_EXPIRED_ERROR } from '@/lib/authFetch';

type VerifyState = 'checking' | 'confirmed' | 'pending' | 'error';

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function cleanSessionId(value: string): string {
  if (!value || value.includes('{')) return '';
  return value;
}

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = firstParam(params.order_id);
  const sessionId = cleanSessionId(firstParam(params.session_id));
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(18, Math.round(width * 0.06));

  const [verifyState, setVerifyState] = useState<VerifyState>('checking');
  const [message, setMessage] = useState('Verifying your payment securely...');

  const canViewOrder = Boolean(orderId);
  const statusCopy = useMemo(() => {
    if (verifyState === 'confirmed') {
      return {
        icon: 'check-circle' as const,
        title: 'Payment confirmed',
        color: '#0d5c4b',
      };
    }
    if (verifyState === 'pending') {
      return {
        icon: 'clock' as const,
        title: 'Payment is processing',
        color: '#b45309',
      };
    }
    if (verifyState === 'error') {
      return {
        icon: 'alert-circle' as const,
        title: 'Could not verify payment',
        color: '#dc2626',
      };
    }
    return {
      icon: 'shield' as const,
      title: 'Checking payment',
      color: '#0d5c4b',
    };
  }, [verifyState]);

  const goToOrder = useCallback(() => {
    if (!orderId) {
      router.replace('/user-orders');
      return;
    }
    router.replace({
      pathname: '/order-details/[orderId]',
      params: { orderId },
    });
  }, [orderId, router]);

  const verifyPayment = useCallback(async () => {
    console.log('[payment-success] verify_start order=', orderId, 'session=', sessionId);

    if (!orderId) {
      setVerifyState('error');
      setMessage('The payment return link did not include an order ID.');
      return;
    }

    setVerifyState('checking');
    setMessage('Verifying your payment securely...');

    try {
      if (sessionId) {
        const confirmUrl = `/api/v1/payments/orders/${orderId}/confirm-payment?session_id=${encodeURIComponent(sessionId)}`;
        let res = await authFetch(confirmUrl, { method: 'POST' });
        if (!res.ok) {
          await new Promise<void>((resolve) => setTimeout(resolve, 2500));
          res = await authFetch(confirmUrl, { method: 'POST' });
        }

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          console.log('[payment-success] confirm_failed status=', res.status, 'body=', body);
          setVerifyState('error');
          setMessage('Stripe accepted the redirect, but the app could not verify this order yet. Please check My Orders.');
          return;
        }

        const data = await res.json();
        console.log('[payment-success] confirm_response =', data);
        if (data?.payment_confirmed) {
          setVerifyState('confirmed');
          setMessage('Your order is paid and has been refreshed.');
          setTimeout(goToOrder, 900);
          return;
        }

        setVerifyState('pending');
        setMessage('Stripe has not marked this session as paid yet. If your bank charged you, the webhook will update My Orders shortly.');
        return;
      }

      const orderRes = await authFetch(`/api/v1/payments/orders/${orderId}`);
      if (!orderRes.ok) {
        setVerifyState('error');
        setMessage('The order could not be loaded. Please check My Orders.');
        return;
      }

      const order = await orderRes.json();
      console.log('[payment-success] order_status =', {
        status: order?.status,
        payment_status: order?.payment_status,
      });
      if (['held_in_escrow', 'released'].includes(order?.payment_status) || ['paid', 'processing', 'shipped', 'delivered', 'completed'].includes(order?.status)) {
        setVerifyState('confirmed');
        setMessage('Your order is paid and has been refreshed.');
        setTimeout(goToOrder, 900);
        return;
      }

      setVerifyState('pending');
      setMessage('Payment is still pending. Please check My Orders in a moment.');
    } catch (err) {
      if ((err as Error)?.message === SESSION_EXPIRED_ERROR) return;
      console.log('[payment-success] verify_error =', err);
      setVerifyState('error');
      setMessage('Network error while verifying payment. Please check My Orders.');
    }
  }, [goToOrder, orderId, sessionId]);

  useEffect(() => {
    void verifyPayment();
  }, [verifyPayment]);

  return (
    <SafeAreaView style={styles.screen}>
      <LinearGradient colors={['#0d5c4b', '#10b981']} style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <Text style={styles.headerTitle}>Payment</Text>
        <Text style={styles.headerSub}>Order verification</Text>
      </LinearGradient>

      <View style={[styles.body, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: `${statusCopy.color}18` }]}>
            {verifyState === 'checking' ? (
              <ActivityIndicator color={statusCopy.color} />
            ) : (
              <Feather name={statusCopy.icon} size={28} color={statusCopy.color} />
            )}
          </View>
          <Text style={styles.title}>{statusCopy.title}</Text>
          <Text style={styles.copy}>{message}</Text>

          {orderId ? <Text style={styles.orderId}>Order #{orderId}</Text> : null}

          <View style={styles.actions}>
            {verifyState !== 'confirmed' ? (
              <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.9} onPress={verifyPayment}>
                <Feather name="refresh-cw" size={16} color="#0d5c4b" />
                <Text style={styles.secondaryText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.9} onPress={canViewOrder ? goToOrder : () => router.replace('/user-orders')}>
              <Feather name="package" size={16} color="#ffffff" />
              <Text style={styles.primaryText}>{canViewOrder ? 'View Order' : 'My Orders'}</Text>
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
    borderColor: '#e2eee9',
    alignItems: 'center',
  },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { color: '#111827', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  copy: { color: '#6b7280', fontSize: 13, fontWeight: '600', lineHeight: 20, textAlign: 'center', marginTop: 8 },
  orderId: { color: '#0d5c4b', fontSize: 12, fontWeight: '900', marginTop: 12 },
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
