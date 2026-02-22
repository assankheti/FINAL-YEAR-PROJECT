import React, { useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import GreenHeader from '@/components/GreenHeader';
import { useLanguage, useT } from '@/contexts/LanguageContext';

export type NotificationItem = {
  id: string;
  type: string;
  title?: string;
  titleUrdu?: string;
  subtitle?: string;
  description?: string;
  time?: string;
  isRead?: boolean;
};

export type TypeConfig = Record<string, { icon: React.ComponentProps<typeof Feather>['name']; bg: string; fg: string }>;

export default function Notification({
  initial = [],
  title = { english: 'Notifications', urdu: 'اطلاعات' },
  onBack,
  typeConfig = {},
}: {
  initial?: NotificationItem[];
  title?: { english: string; urdu: string };
  onBack?: () => void;
  typeConfig?: TypeConfig;
}) {
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const { textLanguage } = useLanguage();
  const t = useT();

  const defaultTypeConfig: TypeConfig = {
    weather: { icon: 'cloud', bg: 'rgba(16,185,129,0.18)', fg: '#10b981' },
    price: { icon: 'trending-up', bg: 'rgba(245,158,11,0.18)', fg: '#f59e0b' },
    scheme: { icon: 'gift', bg: 'rgba(13,92,75,0.14)', fg: '#0d5c4b' },
    order: { icon: 'bell', bg: 'rgba(13,92,75,0.14)', fg: '#0d5c4b' },
    alert: { icon: 'alert-triangle', bg: 'rgba(239,68,68,0.16)', fg: '#ef4444' },
    promo: { icon: 'tag', bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' },
    system: { icon: 'shield', bg: 'rgba(59,130,246,0.08)', fg: '#3b82f6' },
  };

  const cfgs = { ...defaultTypeConfig, ...typeConfig };

  const [notifs, setNotifs] = useState<NotificationItem[]>(initial);

  const unreadCount = notifs.filter((n) => !n.isRead).length;

  const markAllRead = () => setNotifs((p) => p.map((n) => ({ ...n, isRead: true })));

  const handleOpenNotification = (id: string) => {
    // by default remove the notification (treated as read)
    setNotifs((p) => p.filter((n) => n.id !== id));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ flex: 1 }}>
        <GreenHeader title={title} onBack={onBack}>
          {unreadCount > 0 ? (
            <TouchableOpacity activeOpacity={0.9} onPress={markAllRead} style={styles.markBtnUnderTitle}>
              <Feather name="check" size={14} color="#0d5c4b" />
              <Text style={styles.markText}>{t({ english: 'Mark All Read', urdu: 'سب کو پڑھا ہوا نشان زد کریں' })}</Text>
            </TouchableOpacity>
          ) : null}
        </GreenHeader>

        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          {unreadCount > 0 ? (
            <View style={{ paddingHorizontal: horizontalPadding, marginTop: -18 }}>
              <View style={[styles.unreadCard, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
                <View style={styles.unreadIcon}>
                  <Feather name="bell" size={18} color="#f59e0b" />
                </View>
                <Text style={styles.unreadText}>
                  {t({ english: 'You have', urdu: 'آپ کے پاس' })} <Text style={styles.unreadBold}>{unreadCount} {t({ english: 'unread', urdu: 'بے پڑھے' })}</Text> {t({ english: 'notifications', urdu: 'اطلاعات' })}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={{ paddingHorizontal: horizontalPadding, marginTop: unreadCount > 0 ? 16 : 18 }}>
            <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', gap: 12 }}>
              {notifs.map((n) => {
                const cfg = cfgs[n.type] ?? { icon: 'bell', bg: 'rgba(0,0,0,0.05)', fg: '#111827' };
                return (
                  <TouchableOpacity key={n.id} activeOpacity={0.9} onPress={() => handleOpenNotification(n.id)} style={[styles.card, !n.isRead ? styles.cardUnread : null]}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={[styles.typeIcon, { backgroundColor: cfg.bg }]}>
                        <Feather name={cfg.icon as any} size={18} color={cfg.fg} />
                      </View>

                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.title} numberOfLines={2}>
                              {textLanguage === 'urdu' ? n.titleUrdu ?? n.title : n.title}
                            </Text>
                          </View>
                          <Text style={styles.time}>{n.time}</Text>
                        </View>

                        {n.description ? <Text style={styles.desc}>{n.description}</Text> : n.subtitle ? <Text style={styles.desc}>{n.subtitle}</Text> : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 18,
    paddingBottom: 36,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: { alignItems: 'flex-end', justifyContent: 'flex-start' },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },

  markBtnUnderTitle: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  markText: { color: '#0d5c4b', fontWeight: '900', fontSize: 12 },

  unreadCard: {
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unreadIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245,158,11,0.18)', alignItems: 'center', justifyContent: 'center' },
  unreadText: { flex: 1, color: '#111827', fontSize: 13 },
  unreadBold: { fontWeight: '900', color: '#f59e0b' },

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
  cardUnread: { borderLeftWidth: 4, borderLeftColor: '#f59e0b' },

  typeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '900', color: '#111827' },
  time: { color: '#6b7280', fontSize: 11 },
  desc: { color: '#6b7280', fontSize: 13, marginTop: 8, lineHeight: 18 },
});
