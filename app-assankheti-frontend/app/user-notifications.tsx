import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type NotifType = 'order' | 'promo' | 'system';

type Notif = {
  id: string;
  type: NotifType;
  title: string;
  subtitle: string;
  time: string;
  isRead?: boolean;
};

export default function UserNotificationsPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const notifs = useMemo<Notif[]>
    (
      () => [
        { id: 'N1', type: 'order', title: 'Order update', subtitle: 'Your order status has changed to Shipped.', time: '10m ago' },
        { id: 'N2', type: 'promo', title: 'New deals', subtitle: 'Fresh products are available near you.', time: '2h ago', isRead: true },
        { id: 'N3', type: 'system', title: 'Account security', subtitle: 'Your account was logged in on a new device.', time: '1d ago', isRead: true },
      ],
      []
    );

  const iconFor: Record<NotifType, React.ComponentProps<typeof Feather>['name']> = {
    order: 'package',
    promo: 'tag',
    system: 'shield',
  };

  const colorFor: Record<NotifType, string> = {
    order: '#0d5c4b',
    promo: '#f59e0b',
    system: '#3b82f6',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={['#0d5c4b', '#10b981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingHorizontal: horizontalPadding }]}
        >
          <View style={[styles.headerRow, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.back()}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Feather name="arrow-left" size={18} color="#ffffff" />
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle}>Notifications</Text>
              <Text style={styles.headerSub}>اطلاعات</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ paddingVertical: 18, paddingHorizontal: horizontalPadding, paddingBottom: 28 }}>
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', gap: 12 }}>
            {notifs.map((n) => (
              <View key={n.id} style={[styles.card, n.isRead ? styles.cardRead : null]}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(17,24,39,0.05)' }]}>
                    <Feather name={iconFor[n.type] as any} size={18} color={colorFor[n.type]} />
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                      <Text style={styles.title} numberOfLines={1}>
                        {n.title}
                      </Text>
                      <Text style={styles.time}>{n.time}</Text>
                    </View>
                    <Text style={styles.sub} numberOfLines={2}>
                      {n.subtitle}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 18,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.75)', marginTop: 2, fontSize: 13 },

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
  cardRead: { opacity: 0.75 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '900', color: '#111827' },
  sub: { color: '#6b7280', fontSize: 12, marginTop: 4, lineHeight: 18 },
  time: { color: '#9ca3af', fontSize: 11, fontWeight: '800' },
});
