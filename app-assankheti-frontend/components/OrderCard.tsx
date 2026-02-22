import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ViewDetail from './ViewDetail';

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered';

export type Order = {
  id: string;
  productName: string;
  quantity: string;
  price: string;
  counterparty?: string; // buyer or seller label
  status: OrderStatus;
  date?: string;
  image?: string;
};

const statusConfig: Record<OrderStatus, { label: string; bg: string; fg: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
  pending: { label: 'Pending', bg: 'rgba(245,158,11,0.16)', fg: '#f59e0b', icon: 'clock' },
  confirmed: { label: 'Confirmed', bg: 'rgba(16,185,129,0.18)', fg: '#10b981', icon: 'check-circle' },
  shipped: { label: 'Shipped', bg: 'rgba(13,92,75,0.14)', fg: '#0d5c4b', icon: 'truck' },
  delivered: { label: 'Delivered', bg: 'rgba(13,92,75,0.14)', fg: '#0d5c4b', icon: 'package' },
};

export default function OrderCard({ order, onView }: { order: Order; onView?: (id: string) => void }) {
  const st = statusConfig[order.status];

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={styles.emojiBox}>
          <Text style={{ fontSize: 20 }}>{order.image ?? '📦'}</Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.productName} numberOfLines={2}>{order.productName}</Text>
              <Text style={styles.subText}>{order.quantity}</Text>
            </View>

            <Text style={styles.price}>{order.price}</Text>
          </View>

          <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
            <View>
              {order.counterparty ? <Text style={styles.subText}>{order.counterparty}</Text> : null}
              {order.date ? <Text style={styles.subText}>{order.date}</Text> : null}
            </View>

            <View style={[styles.statusPill, { backgroundColor: st.bg }]}> 
              <Feather name={st.icon as any} size={12} color={st.fg} />
              <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerLeft}>Order #{order.id}</Text>
        <ViewDetail onPress={() => onView?.(order.id)} style={styles.viewBtn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  emojiBox: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' },
  productName: { fontWeight: '900', color: '#111827' },
  subText: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  price: { fontWeight: '900', color: '#0d5c4b' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontWeight: '900', fontSize: 11 },
  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: { color: '#6b7280', fontSize: 11 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
  viewBtnText: { color: '#0d5c4b', fontWeight: '900', fontSize: 12 },
});
