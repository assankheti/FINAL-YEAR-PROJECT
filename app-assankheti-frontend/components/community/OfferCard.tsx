import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { API_BASE } from '@/config/env';
import { useT } from '@/contexts/LanguageContext';

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export type OfferPayload = {
  offer_id?: string;
  product_id?: string;
  buyer_id?: string;
  seller_id?: string;
  price?: number;
  quantity?: number;
  unit?: string;
  message?: string | null;
  status?: OfferStatus;
};

type Props = {
  offer: OfferPayload | null | undefined;
  myMobileId: string;
  /** Optional optimistic update — caller can refetch instead. */
  onLocalStatusChange?: (offerId: string, newStatus: OfferStatus) => void;
};

function formatPKR(n?: number): string {
  if (typeof n !== 'number' || !isFinite(n)) return '';
  return 'Rs ' + Math.round(n).toLocaleString('en-PK');
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('auth.access_token');
  const out: Record<string, string> = {};
  if (token) out.Authorization = `Bearer ${token}`;
  return out;
}

export default function OfferCard({ offer, myMobileId, onLocalStatusChange }: Props) {
  const t = useT();
  const [busy, setBusy] = useState<null | 'accept' | 'reject' | 'withdraw'>(null);

  if (!offer || !offer.offer_id) {
    return (
      <View style={styles.card}>
        <Text style={styles.muted}>{t({ english: 'Offer details unavailable.', urdu: 'پیشکش کی تفصیل دستیاب نہیں۔' })}</Text>
      </View>
    );
  }

  const status: OfferStatus = (offer.status as OfferStatus) || 'pending';
  const isSeller = !!myMobileId && offer.seller_id === myMobileId;
  const isBuyer = !!myMobileId && offer.buyer_id === myMobileId;
  const showSellerActions = status === 'pending' && isSeller;
  const showBuyerActions = status === 'pending' && isBuyer;

  const callAction = async (action: 'accept' | 'reject' | 'withdraw') => {
    if (!offer.offer_id || busy) return;
    setBusy(action);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        API_BASE + `/api/v1/community/offers/${encodeURIComponent(offer.offer_id)}/${action}`,
        { method: 'POST', headers }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${text}`);
      }
      const json = await res.json();
      const nextStatus: OfferStatus = json?.status ?? (
        action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'expired'
      );
      onLocalStatusChange?.(offer.offer_id!, nextStatus);
    } catch (e: any) {
      Alert.alert(
        t({ english: 'Action failed', urdu: 'عمل ناکام' }),
        e?.message ?? t({ english: 'Please try again.', urdu: 'دوبارہ کوشش کریں۔' })
      );
    } finally {
      setBusy(null);
    }
  };

  const confirmAndCall = (action: 'accept' | 'reject' | 'withdraw') => {
    const verb =
      action === 'accept'
        ? t({ english: 'Accept this offer?', urdu: 'یہ پیشکش قبول کریں؟' })
        : action === 'reject'
        ? t({ english: 'Reject this offer?', urdu: 'یہ پیشکش مسترد کریں؟' })
        : t({ english: 'Withdraw this offer?', urdu: 'یہ پیشکش واپس لیں؟' });
    Alert.alert(verb, '', [
      { text: t({ english: 'Cancel', urdu: 'منسوخ' }), style: 'cancel' },
      {
        text:
          action === 'accept'
            ? t({ english: 'Accept', urdu: 'قبول' })
            : action === 'reject'
            ? t({ english: 'Reject', urdu: 'مسترد' })
            : t({ english: 'Withdraw', urdu: 'واپس لیں' }),
        style: action === 'accept' ? 'default' : 'destructive',
        onPress: () => callAction(action),
      },
    ]);
  };

  const totalLabel = formatPKR(offer.price);
  const lineLabel =
    typeof offer.quantity === 'number' && offer.unit
      ? `${offer.quantity} ${offer.unit}`
      : '';
  const totalIfQty =
    typeof offer.price === 'number' && typeof offer.quantity === 'number'
      ? offer.price * offer.quantity
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Feather name="tag" size={16} color="#9a3412" />
        </View>
        <Text style={styles.label}>{t({ english: 'OFFER', urdu: 'پیشکش' })}</Text>
        <View style={{ flex: 1 }} />
        <StatusBadge status={status} />
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.priceText}>{totalLabel}</Text>
        {lineLabel ? <Text style={styles.lineText}>· {lineLabel}</Text> : null}
      </View>
      {totalIfQty !== null ? (
        <Text style={styles.totalText}>
          {t({ english: 'Total', urdu: 'مجموعی' })}: {formatPKR(totalIfQty)}
        </Text>
      ) : null}
      {offer.message ? <Text style={styles.message}>“{offer.message}”</Text> : null}

      {showSellerActions ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnReject, busy ? styles.btnDisabled : null]}
            onPress={() => confirmAndCall('reject')}
            disabled={!!busy}
          >
            {busy === 'reject' ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Feather name="x" size={14} color="#ffffff" />
                <Text style={styles.btnText}>{t({ english: 'Reject', urdu: 'مسترد' })}</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnAccept, busy ? styles.btnDisabled : null]}
            onPress={() => confirmAndCall('accept')}
            disabled={!!busy}
          >
            {busy === 'accept' ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Feather name="check" size={14} color="#ffffff" />
                <Text style={styles.btnText}>{t({ english: 'Accept', urdu: 'قبول' })}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {showBuyerActions ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnWithdraw, busy ? styles.btnDisabled : null]}
            onPress={() => confirmAndCall('withdraw')}
            disabled={!!busy}
          >
            {busy === 'withdraw' ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Feather name="rotate-ccw" size={14} color="#ffffff" />
                <Text style={styles.btnText}>{t({ english: 'Withdraw', urdu: 'واپس لیں' })}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function StatusBadge({ status }: { status: OfferStatus }) {
  const t = useT();
  const map: Record<OfferStatus, { bg: string; fg: string; label: { english: string; urdu: string } }> = {
    pending: { bg: '#fef3c7', fg: '#92400e', label: { english: 'Pending', urdu: 'زیر التواء' } },
    accepted: { bg: '#dcfce7', fg: '#166534', label: { english: 'Accepted', urdu: 'قبول' } },
    rejected: { bg: '#fee2e2', fg: '#991b1b', label: { english: 'Rejected', urdu: 'مسترد' } },
    expired: { bg: '#e5e7eb', fg: '#374151', label: { english: 'Expired', urdu: 'ختم' } },
  };
  const cfg = map[status];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.fg }]}>{t(cfg.label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 220,
    maxWidth: 320,
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fdba74',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '900', fontSize: 11, color: '#9a3412', letterSpacing: 1.2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontWeight: '900', fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },

  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 },
  priceText: { fontWeight: '900', fontSize: 18, color: '#7c2d12' },
  lineText: { fontWeight: '700', fontSize: 13, color: '#7c2d12' },
  totalText: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#9a3412' },
  message: { marginTop: 6, fontSize: 13, color: '#7c2d12', fontStyle: 'italic' },
  muted: { color: '#6b7280', fontWeight: '700' },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 10,
  },
  btnAccept: { backgroundColor: '#16a34a' },
  btnReject: { backgroundColor: '#dc2626' },
  btnWithdraw: { backgroundColor: '#6b7280' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
});
