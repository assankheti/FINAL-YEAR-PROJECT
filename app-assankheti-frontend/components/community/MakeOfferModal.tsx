import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_BASE } from '@/config/env';
import { useT } from '@/contexts/LanguageContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  productId: string;
  sellerId: string;
  defaultPrice?: number;
  defaultQuantity?: number;
  unit: string;
  productName?: string;
  /** Receives the created offer (with conversation_id) on successful submit. */
  onCreated?: (offer: { offer_id: string; conversation_id?: string | null; [k: string]: any }) => void;
};

function formatPKR(n: number): string {
  if (!isFinite(n)) return '';
  return 'Rs ' + Math.round(n).toLocaleString('en-PK');
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('auth.access_token');
  const out: Record<string, string> = {};
  if (token) out.Authorization = `Bearer ${token}`;
  return out;
}

export default function MakeOfferModal({
  visible,
  onClose,
  productId,
  sellerId,
  defaultPrice,
  defaultQuantity,
  unit,
  productName,
  onCreated,
}: Props) {
  const t = useT();
  const [price, setPrice] = useState<string>(
    defaultPrice != null ? String(defaultPrice) : ''
  );
  const [quantity, setQuantity] = useState<string>(
    defaultQuantity != null ? String(defaultQuantity) : ''
  );
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form whenever the modal opens with new defaults
  useEffect(() => {
    if (!visible) return;
    setPrice(defaultPrice != null ? String(defaultPrice) : '');
    setQuantity(defaultQuantity != null ? String(defaultQuantity) : '');
    setMessage('');
  }, [visible, defaultPrice, defaultQuantity]);

  const priceNum = Number(price);
  const qtyNum = Number(quantity);
  const total = useMemo(() => {
    if (!isFinite(priceNum) || !isFinite(qtyNum)) return 0;
    return priceNum * qtyNum;
  }, [priceNum, qtyNum]);
  const formValid =
    isFinite(priceNum) && priceNum > 0 && isFinite(qtyNum) && qtyNum > 0;

  const submit = async () => {
    if (!formValid || submitting) return;
    if (!sellerId || !productId) {
      Alert.alert(
        t({ english: 'Cannot submit', urdu: 'جمع نہیں کیا جا سکتا' }),
        t({ english: 'Missing seller or product info.', urdu: 'فروخت کنندہ یا مصنوع کی معلومات غائب ہیں۔' })
      );
      return;
    }
    setSubmitting(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(API_BASE + '/api/v1/community/offers/create', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          seller_id: sellerId,
          price: priceNum,
          quantity: qtyNum,
          unit,
          message: message.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${text}`);
      }
      const json = await res.json();
      onCreated?.(json);
      onClose();
    } catch (e: any) {
      Alert.alert(
        t({ english: 'Could not create offer', urdu: 'پیشکش نہیں بھیجی جا سکی' }),
        e?.message ?? t({ english: 'Please try again.', urdu: 'دوبارہ کوشش کریں۔' })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={submitting ? undefined : onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.center}
        >
          <Pressable onPress={() => null} style={styles.sheet}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>
                {t({ english: 'Make an offer', urdu: 'پیشکش بنائیں' })}
              </Text>
              <TouchableOpacity onPress={onClose} disabled={submitting} style={styles.closeBtn}>
                <Feather name="x" size={18} color="#0d5c4b" />
              </TouchableOpacity>
            </View>
            {productName ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {productName}
              </Text>
            ) : null}

            <Text style={styles.label}>
              {t({ english: 'Price per unit', urdu: 'فی یونٹ قیمت' })}
            </Text>
            <View style={styles.inputRow}>
              <Text style={styles.prefix}>Rs</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>

            <Text style={styles.label}>
              {t({ english: 'Quantity', urdu: 'مقدار' })}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                style={styles.input}
              />
              <Text style={styles.suffix}>{unit}</Text>
            </View>

            <Text style={styles.label}>
              {t({ english: 'Message (optional)', urdu: 'پیغام (اختیاری)' })}
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={t({ english: 'Any details for the seller…', urdu: 'فروخت کنندہ کے لیے تفصیل…' })}
              placeholderTextColor="#9ca3af"
              multiline
              style={[styles.input, styles.messageInput]}
              maxLength={500}
            />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                {t({ english: 'Total', urdu: 'مجموعی' })}
              </Text>
              <Text style={styles.totalValue}>{total > 0 ? formatPKR(total) : '—'}</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, (!formValid || submitting) && styles.submitDisabled]}
              onPress={submit}
              disabled={!formValid || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#ffffff" />
                  <Text style={styles.submitText}>
                    {t({ english: 'Send offer', urdu: 'پیشکش بھیجیں' })}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  center: { width: '100%' },
  sheet: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontWeight: '900', fontSize: 18, color: '#0d5c4b' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { color: '#6b7280', fontWeight: '700', marginTop: 2, marginBottom: 6 },

  label: { marginTop: 10, fontWeight: '900', fontSize: 12, color: '#0d5c4b', letterSpacing: 0.6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    marginTop: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },
  messageInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    minHeight: 60,
    textAlignVertical: 'top',
    marginTop: 6,
  },
  prefix: { fontWeight: '900', color: '#0d5c4b' },
  suffix: { fontWeight: '900', color: '#6b7280' },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
  },
  totalLabel: { fontWeight: '900', color: '#0d5c4b' },
  totalValue: { fontWeight: '900', fontSize: 18, color: '#0d5c4b' },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0d5c4b',
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#ffffff', fontWeight: '900', fontSize: 15 },
});
