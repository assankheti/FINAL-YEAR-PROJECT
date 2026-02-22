import React from 'react';
import { View } from 'react-native';
import OrderCard, { Order } from './OrderCard';

export default function OrdersList({ orders, onView }: { orders: Order[]; onView?: (id: string) => void }) {
  return (
    <View style={{ gap: 12 }}>
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} onView={onView} />
      ))}
    </View>
  );
}
