import React, { useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated, PanResponder, View, Text, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
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

function SwipeDismissCard({
  children,
  isUnread,
  onPress,
  onDismiss,
}: {
  children: React.ReactNode;
  isUnread: boolean;
  onPress: () => void;
  onDismiss: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const hasDragged = useRef(false);

  const resetPosition = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 5,
    }).start(() => {
      hasDragged.current = false;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
      onPanResponderGrant: () => {
        hasDragged.current = false;
      },
      onPanResponderMove: (_event, gesture) => {
        hasDragged.current = Math.abs(gesture.dx) > 10;
        translateX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_event, gesture) => {
        const shouldDismiss = Math.abs(gesture.dx) > 110 || Math.abs(gesture.vx) > 0.75;

        if (shouldDismiss) {
          Animated.timing(translateX, {
            toValue: gesture.dx >= 0 ? 440 : -440,
            duration: 180,
            useNativeDriver: true,
          }).start(onDismiss);
          return;
        }

        resetPosition();
      },
      onPanResponderTerminate: resetPosition,
    })
  ).current;

  const opacity = translateX.interpolate({
    inputRange: [-180, 0, 180],
    outputRange: [0.4, 1, 0.4],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.swipeDeleteBg}>
        <Feather name="trash-2" size={20} color="#ef4444" />
        <Feather name="trash-2" size={20} color="#ef4444" />
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.swipeCard,
          {
            opacity,
            transform: [{ translateX }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (!hasDragged.current) onPress();
          }}
          style={[styles.card, isUnread ? styles.cardUnread : null]}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

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
  const isCompactHeader = width < 390;
  const horizontalPadding = Math.max(18, Math.min(28, Math.round(width * 0.06)));
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
    setNotifs((p) => p.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleDismissNotification = (id: string) => {
    setNotifs((p) => p.filter((n) => n.id !== id));
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <GreenHeader
          title={title}
          onBack={onBack}
          rightElement={
            unreadCount > 0 ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={markAllRead}
                style={[styles.markBtn, isCompactHeader ? styles.markBtnCompact : null]}
              >
                <Feather name="check" size={15} color="#0d5c4b" />
                <Text style={[styles.markText, isCompactHeader ? styles.markTextCompact : null]} numberOfLines={1}>
                  {t({ english: 'Mark All Read', urdu: 'سب کو پڑھا ہوا نشان زد کریں' })}
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: horizontalPadding, paddingBottom: 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
            {unreadCount > 0 ? (
              <View style={styles.unreadCard}>
                <View style={styles.unreadIcon}>
                  <Feather name="bell" size={18} color="#f59e0b" />
                </View>
                <Text style={styles.unreadText}>
                  {t({ english: 'You have', urdu: 'آپ کے پاس' })} <Text style={styles.unreadBold}>{unreadCount} {t({ english: 'unread', urdu: 'بے پڑھے' })}</Text> {t({ english: 'notifications', urdu: 'اطلاعات' })}
                </Text>
              </View>
            ) : null}

            <View style={[styles.list, { marginTop: unreadCount > 0 ? 16 : 2 }]}>
              {notifs.map((n) => {
                const cfg = cfgs[n.type] ?? { icon: 'bell', bg: 'rgba(0,0,0,0.05)', fg: '#111827' };
                return (
                  <SwipeDismissCard
                    key={n.id}
                    isUnread={!n.isRead}
                    onPress={() => handleOpenNotification(n.id)}
                    onDismiss={() => handleDismissNotification(n.id)}
                  >
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={[styles.typeIcon, { backgroundColor: cfg.bg }]}>
                        <Feather name={cfg.icon as any} size={18} color={cfg.fg} />
                      </View>

                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.cardHeader}>
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
                  </SwipeDismissCard>
                );
              })}
            </View>

            {notifs.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Feather name="check-circle" size={24} color="#10b981" />
                </View>
                <Text style={styles.emptyTitle}>{t({ english: 'All caught up', urdu: 'سب مکمل ہے' })}</Text>
                <Text style={styles.emptyText}>{t({ english: 'New updates will appear here.', urdu: 'نئی اپڈیٹس یہاں ظاہر ہوں گی۔' })}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0d5c4b',
  },
  screen: {
    flex: 1,
    backgroundColor: '#f7faf6',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#f7faf6',
  },
  scrollContent: {
    paddingTop: 18,
  },
  markBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markBtnCompact: {
    minHeight: 36,
    paddingHorizontal: 9,
    gap: 6,
  },
  markText: { color: '#0d5c4b', fontWeight: '900', fontSize: 12 },
  markTextCompact: { fontSize: 11 },

  unreadCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unreadIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(245,158,11,0.16)', alignItems: 'center', justifyContent: 'center' },
  unreadText: { flex: 1, color: '#111827', fontSize: 14, lineHeight: 20 },
  unreadBold: { fontWeight: '900', color: '#f59e0b' },
  list: {
    gap: 14,
  },
  swipeContainer: {
    position: 'relative',
  },
  swipeDeleteBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  swipeCard: {
    borderRadius: 18,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: '#f59e0b', backgroundColor: '#fffdf8' },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  typeIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '900', color: '#111827', fontSize: 16, lineHeight: 21 },
  time: { color: '#6b7280', fontSize: 12, lineHeight: 18, textAlign: 'right', maxWidth: 86 },
  desc: { color: '#667085', fontSize: 14, marginTop: 8, lineHeight: 20 },
  emptyCard: {
    marginTop: 18,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(13,92,75,0.08)',
  },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(16,185,129,0.12)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 12, color: '#111827', fontSize: 16, fontWeight: '900' },
  emptyText: { marginTop: 6, color: '#667085', fontSize: 13, textAlign: 'center' },
});
