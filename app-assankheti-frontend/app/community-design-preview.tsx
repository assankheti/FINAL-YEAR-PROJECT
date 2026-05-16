import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  green800: '#0f4a2a',
  green700: '#126437',
  green600: '#15803d',
  green500: '#1f9b51',
  green400: '#22c55e',
  amber100: '#fef3c7',
  amber200: '#fde68a',
  amber800: '#92400e',
  cream: '#f4f3ee',
  white: '#ffffff',
  ink: '#14213d',
  muted: '#667085',
  line: '#e5e7eb',
  softGreen: '#ecfdf5',
  softGray: '#f7f7f5',
  phoneShadow: 'rgba(15,74,42,0.12)',
  withdrawn: '#98a2b3',
  withdrawnBg: '#eef2f6',
  offerBorder: '#e6c67a',
  unread: '#ef4444',
  sent: '#98a2b3',
  read: '#16a34a',
} as const;

const headingFont = Platform.OS === 'web' ? 'Sora, system-ui, sans-serif' : undefined;
const bodyFont = Platform.OS === 'web' ? 'DM Sans, system-ui, sans-serif' : undefined;

function fontHeading(weight: '600' | '700' | '800' = '700') {
  return { fontFamily: headingFont, fontWeight: weight as any };
}

function fontBody(weight: '400' | '500' | '700' | '800' = '500') {
  return { fontFamily: bodyFont, fontWeight: weight as any };
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return <View style={styles.phoneFrame}>{children}</View>;
}

function GlassIconButton({ icon }: { icon: React.ComponentProps<typeof Feather>['name'] }) {
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.glassIconBtn}>
      <Feather name={icon} size={18} color="#ffffff" />
    </TouchableOpacity>
  );
}

function CommunityHubPhone() {
  return (
    <PhoneFrame>
      <View style={styles.phoneCanvas}>
        <LinearGradient colors={[C.green800, C.green500, C.green400]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroHeader}>
          <View style={styles.heroGlowTop} />
          <View style={styles.heroGlowBottom} />
          <View style={styles.heroControls}>
            <GlassIconButton icon="arrow-left" />
            <GlassIconButton icon="users" />
          </View>

          <Text style={styles.heroTitle}>Community</Text>
          <Text style={styles.heroSubtitle}>Farmers & Buyers Network</Text>

          <View style={styles.heroSearch}>
            <Feather name="search" size={16} color="rgba(255,255,255,0.82)" />
            <Text style={styles.heroSearchText}>Search groups, buyers, messages...</Text>
          </View>
        </LinearGradient>

        <View style={styles.tabsShell}>
          {[
            { label: 'Groups', active: true },
            { label: 'Direct Messages', active: false },
            { label: 'Alerts', active: false },
          ].map((tab) => (
            <View key={tab.label} style={styles.tabItem}>
              <Text style={[styles.tabText, tab.active && styles.tabTextActive]}>{tab.label}</Text>
              {tab.active ? <View style={styles.tabIndicator} /> : null}
            </View>
          ))}
        </View>

        <ScrollView
          style={styles.screenScroll}
          contentContainerStyle={styles.communityBody}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Groups</Text>
            <Text style={styles.sectionMeta}>Recommended spaces</Text>
          </View>

          <View style={styles.emptyGroupsCard}>
            <View style={styles.dashedIconWrap}>
              <Feather name="users" size={20} color={C.green700} />
            </View>
            <Text style={styles.emptyCardTitle}>No groups joined yet</Text>
            <Text style={styles.emptyCardBody}>
              Discover crop communities, local mandi circles, and buyer rooms curated for your region.
            </Text>
            <TouchableOpacity activeOpacity={0.9} style={styles.ctaBtn}>
              <Text style={styles.ctaBtnText}>Explore Groups</Text>
              <Feather name="arrow-right" size={15} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Suggested for you</Text>
            <Text style={styles.sectionMeta}>2 groups</Text>
          </View>

          <View style={styles.groupCard}>
            <View style={styles.groupIconBubble}>
              <Text style={styles.groupEmoji}>🌾</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.groupName}>Rice Growers Forum</Text>
              <Text style={styles.groupMeta}>1,248 members</Text>
            </View>
            <TouchableOpacity activeOpacity={0.9} style={styles.joinBtn}>
              <Text style={styles.joinBtnText}>Join</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.groupCard}>
            <View style={styles.groupIconBubble}>
              <Text style={styles.groupEmoji}>🥕</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.groupName}>Vegetable Market Watch</Text>
              <Text style={styles.groupMeta}>864 members</Text>
            </View>
            <TouchableOpacity activeOpacity={0.9} style={styles.joinBtn}>
              <Text style={styles.joinBtnText}>Join</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.sectionRow, { marginTop: 12 }]}>
            <Text style={styles.sectionTitle}>Direct Messages</Text>
            <Text style={styles.sectionMeta}>1 active</Text>
          </View>

          <View style={styles.dmCard}>
            <View style={styles.dmAvatarWrap}>
              <View style={styles.dmAvatar}>
                <Text style={styles.dmAvatarText}>AA</Text>
              </View>
              <View style={styles.onlineDot} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.dmTopRow}>
                <Text style={styles.dmName}>Ahmad Ali</Text>
                <Text style={styles.dmTime}>12:36</Text>
              </View>
              <View style={styles.offerChip}>
                <Feather name="tag" size={12} color={C.amber800} />
                <Text style={styles.offerChipText}>Offer · Rs 180 for 10 kg</Text>
              </View>
              <Text style={styles.dmPreview} numberOfLines={1}>
                I can deliver tomorrow morning if the quantity works for you.
              </Text>
            </View>
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>2</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </PhoneFrame>
  );
}

function OfferMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.offerMetric}>
      <Text style={styles.offerMetricLabel}>{label}</Text>
      <Text style={styles.offerMetricValue}>{value}</Text>
    </View>
  );
}

function WithdrawnOfferCard() {
  return (
    <View style={[styles.offerCard, styles.withdrawnOfferCard]}>
      <View style={styles.offerCardHead}>
        <View style={[styles.statusPill, styles.withdrawnPill]}>
          <Text style={styles.withdrawnPillText}>Withdrawn</Text>
        </View>
        <Text style={styles.offerCardType}>Buyer Offer</Text>
      </View>
      <View style={styles.offerMetricsRow}>
        <OfferMetric label="Price" value="Rs 180" />
        <OfferMetric label="Qty" value="10 kg" />
        <OfferMetric label="Total" value="Rs 1,800" />
      </View>
      <View style={styles.offerFooterMuted}>
        <Feather name="slash" size={14} color={C.withdrawn} />
        <Text style={styles.offerFooterMutedText}>This offer was withdrawn</Text>
      </View>
    </View>
  );
}

function PendingOfferCard() {
  return (
    <View style={styles.offerCard}>
      <View style={styles.offerCardHead}>
        <View style={[styles.statusPill, styles.pendingPill]}>
          <Text style={styles.pendingPillText}>Pending</Text>
        </View>
        <Text style={styles.offerCardType}>Buyer Offer</Text>
      </View>
      <View style={styles.offerMetricsRow}>
        <OfferMetric label="Price" value="Rs 180" />
        <OfferMetric label="Qty" value="10 kg" />
        <OfferMetric label="Total" value="Rs 1,800" />
      </View>
      <View style={styles.offerActionsRow}>
        <TouchableOpacity activeOpacity={0.9} style={styles.withdrawBtn}>
          <Text style={styles.withdrawBtnText}>Withdraw</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.9} style={styles.acceptBtn}>
          <Text style={styles.acceptBtnText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MessageMeta({ time, read }: { time: string; read?: boolean }) {
  return (
    <View style={styles.msgMeta}>
      <Text style={styles.msgMetaText}>{time}</Text>
      <Feather name="check" size={12} color={read ? C.read : C.sent} />
    </View>
  );
}

function DirectMessagePhone() {
  return (
    <PhoneFrame>
      <View style={[styles.phoneCanvas, { backgroundColor: C.cream }]}>
        <LinearGradient colors={[C.green800, C.green700, C.green400]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chatHeader}>
          <View style={styles.chatHeaderGlow} />
          <TouchableOpacity activeOpacity={0.9} style={styles.glassIconBtn}>
            <Feather name="arrow-left" size={18} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.chatHeaderProfile}>
            <View style={styles.chatAvatarWrap}>
              <View style={styles.chatAvatar}>
                <Text style={styles.chatAvatarText}>AA</Text>
              </View>
              <View style={styles.onlineDotLarge} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.chatName}>Ahmad Ali</Text>
              <Text style={styles.chatStatus}>Active now</Text>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.9} style={styles.glassIconBtn}>
            <Feather name="more-horizontal" size={18} color="#ffffff" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView
          style={styles.screenScroll}
          contentContainerStyle={styles.chatBody}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.offerWrapLeft}>
            <WithdrawnOfferCard />
            <MessageMeta time="23:17" />
          </View>

          <View style={styles.systemPillRow}>
            <View style={styles.systemPill}>
              <Text style={styles.systemPillText}>Offer withdrawn · 23:18</Text>
            </View>
          </View>

          <View style={styles.offerWrapLeft}>
            <PendingOfferCard />
            <MessageMeta time="23:19" />
          </View>

          <View style={styles.imageBubbleWrap}>
            <View style={styles.imageBubble} />
            <MessageMeta time="23:20" read />
          </View>
        </ScrollView>

        <View style={styles.chatComposerBar}>
          <TouchableOpacity activeOpacity={0.9} style={styles.composerIconBtn}>
            <Feather name="paperclip" size={18} color={C.green700} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} style={styles.composerIconBtn}>
            <Feather name="image" size={18} color={C.green700} />
          </TouchableOpacity>
          <View style={styles.composerInputShell}>
            <Text style={styles.composerPlaceholder}>Type a message...</Text>
          </View>
          <TouchableOpacity activeOpacity={0.9} style={styles.composerSendBtn}>
            <Feather name="send" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </PhoneFrame>
  );
}

export default function CommunityDesignPreviewPage() {
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const doc = (globalThis as any).document;
    if (!doc) return;

    const fontId = 'community-design-preview-fonts';
    if (!doc.getElementById(fontId)) {
      const fontLink = doc.createElement('link');
      fontLink.id = fontId;
      fontLink.rel = 'stylesheet';
      fontLink.href =
        'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Sora:wght@600;700;800&display=swap';
      doc.head.appendChild(fontLink);
    }
  }, []);

  const frameGap = 28;
  const totalFramesWidth = 360 * 2 + frameGap;
  const horizontalInset = width > totalFramesWidth + 80 ? (width - totalFramesWidth) / 2 : 24;

  return (
    <SafeAreaView edges={['top']} style={styles.page}>
      <ScrollView contentContainerStyle={styles.pageScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageKicker}>Community Redesign Preview</Text>
          <Text style={styles.pageTitle}>Messaging Hub + Direct Offer Chat</Text>
          <Text style={styles.pageSub}>
            A polished two-screen React artifact styled for an agricultural marketplace experience.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.gallery,
            {
              paddingLeft: horizontalInset,
              paddingRight: Math.max(24, horizontalInset),
              gap: frameGap,
            },
          ]}
        >
          <CommunityHubPhone />
          <DirectMessagePhone />
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#ebf2ec',
  },
  pageScroll: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  pageHeader: {
    paddingHorizontal: 24,
    marginBottom: 24,
    maxWidth: 860,
    alignSelf: 'center',
    width: '100%',
  },
  pageKicker: {
    color: C.green700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontSize: 11,
    ...fontBody('800'),
  },
  pageTitle: {
    marginTop: 8,
    color: C.ink,
    fontSize: 32,
    lineHeight: 38,
    ...fontHeading('800'),
  },
  pageSub: {
    marginTop: 10,
    color: C.muted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 620,
    ...fontBody('500'),
  },
  gallery: {
    alignItems: 'flex-start',
  },
  phoneFrame: {
    width: 360,
    height: 720,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: C.cream,
    borderWidth: 1,
    borderColor: 'rgba(15,74,42,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  phoneCanvas: {
    flex: 1,
    backgroundColor: C.cream,
  },
  heroHeader: {
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 18,
    minHeight: 234,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  heroGlowTop: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
    right: -40,
    top: -30,
  },
  heroGlowBottom: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(255,255,255,0.05)',
    left: -26,
    bottom: -34,
  },
  heroControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glassIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    marginTop: 22,
    color: '#ffffff',
    fontSize: 34,
    lineHeight: 40,
    ...fontHeading('800'),
  },
  heroSubtitle: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    lineHeight: 21,
    ...fontBody('700'),
  },
  heroSearch: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroSearchText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 14,
    ...fontBody('700'),
  },
  tabsShell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#edf1ea',
  },
  tabItem: {
    minHeight: 56,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabText: {
    color: '#7b8794',
    fontSize: 13,
    ...fontBody('700'),
  },
  tabTextActive: {
    color: C.green800,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 34,
    height: 3,
    borderRadius: 999,
    backgroundColor: C.green600,
  },
  screenScroll: {
    flex: 1,
  },
  communityBody: {
    padding: 18,
    gap: 12,
  },
  sectionRow: {
    marginTop: 2,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    color: C.green800,
    fontSize: 18,
    ...fontHeading('700'),
  },
  sectionMeta: {
    color: C.muted,
    fontSize: 12,
    ...fontBody('700'),
  },
  emptyGroupsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
  },
  dashedIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(15,74,42,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.softGreen,
  },
  emptyCardTitle: {
    marginTop: 14,
    color: C.ink,
    fontSize: 22,
    lineHeight: 28,
    ...fontHeading('700'),
  },
  emptyCardBody: {
    marginTop: 8,
    color: C.muted,
    fontSize: 14,
    lineHeight: 21,
    ...fontBody('500'),
  },
  ctaBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: C.green600,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaBtnText: {
    color: '#ffffff',
    fontSize: 13,
    ...fontBody('800'),
  },
  groupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupIconBubble: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupEmoji: {
    fontSize: 22,
  },
  groupName: {
    color: C.ink,
    fontSize: 15,
    ...fontHeading('700'),
  },
  groupMeta: {
    marginTop: 4,
    color: C.muted,
    fontSize: 12,
    ...fontBody('500'),
  },
  joinBtn: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(21,128,61,0.18)',
    backgroundColor: '#f8fffb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: {
    color: C.green700,
    fontSize: 12,
    ...fontBody('800'),
  },
  dmCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dmAvatarWrap: {
    position: 'relative',
  },
  dmAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.green800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dmAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    ...fontHeading('700'),
  },
  onlineDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.green400,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  dmTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dmName: {
    color: C.ink,
    fontSize: 15,
    ...fontHeading('700'),
  },
  dmTime: {
    color: C.muted,
    fontSize: 12,
    ...fontBody('700'),
  },
  offerChip: {
    marginTop: 6,
    alignSelf: 'flex-start',
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: C.amber100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offerChipText: {
    color: C.amber800,
    fontSize: 11,
    ...fontBody('800'),
  },
  dmPreview: {
    marginTop: 8,
    color: C.muted,
    fontSize: 13,
    lineHeight: 18,
    ...fontBody('500'),
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: C.unread,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    ...fontBody('800'),
  },
  chatHeader: {
    minHeight: 116,
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  chatHeaderGlow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.06)',
    right: -44,
    top: -40,
  },
  chatHeaderProfile: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatAvatarWrap: {
    position: 'relative',
  },
  chatAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  chatAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    ...fontHeading('700'),
  },
  onlineDotLarge: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.green400,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: C.green700,
  },
  chatName: {
    color: '#ffffff',
    fontSize: 16,
    ...fontHeading('700'),
  },
  chatStatus: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    ...fontBody('700'),
  },
  chatBody: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
  },
  offerWrapLeft: {
    alignSelf: 'flex-start',
    width: '100%',
    maxWidth: 286,
  },
  offerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.offerBorder,
    padding: 14,
  },
  withdrawnOfferCard: {
    opacity: 0.72,
  },
  offerCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  offerCardType: {
    color: C.muted,
    fontSize: 12,
    ...fontBody('700'),
  },
  statusPill: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingPill: {
    backgroundColor: C.amber100,
  },
  pendingPillText: {
    color: C.amber800,
    fontSize: 11,
    ...fontBody('800'),
  },
  withdrawnPill: {
    backgroundColor: C.withdrawnBg,
  },
  withdrawnPillText: {
    color: C.withdrawn,
    textDecorationLine: 'line-through',
    fontSize: 11,
    ...fontBody('800'),
  },
  offerMetricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 14,
  },
  offerMetric: {
    flex: 1,
    minHeight: 72,
    borderRadius: 12,
    backgroundColor: '#fffdf7',
    borderWidth: 1,
    borderColor: 'rgba(230,198,122,0.55)',
    padding: 10,
    justifyContent: 'space-between',
  },
  offerMetricLabel: {
    color: C.muted,
    fontSize: 11,
    ...fontBody('700'),
  },
  offerMetricValue: {
    color: C.ink,
    fontSize: 16,
    ...fontHeading('700'),
  },
  offerFooterMuted: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eceff3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offerFooterMutedText: {
    color: C.withdrawn,
    fontSize: 12,
    ...fontBody('700'),
  },
  offerActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  withdrawBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#eef2f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawBtnText: {
    color: '#475467',
    fontSize: 13,
    ...fontBody('800'),
  },
  acceptBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: C.green600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    color: '#ffffff',
    fontSize: 13,
    ...fontBody('800'),
  },
  systemPillRow: {
    alignItems: 'center',
  },
  systemPill: {
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#e9efe9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemPillText: {
    color: '#55606d',
    fontSize: 12,
    ...fontBody('700'),
  },
  imageBubbleWrap: {
    alignSelf: 'flex-end',
    width: '100%',
    maxWidth: 230,
  },
  imageBubble: {
    height: 142,
    borderRadius: 16,
    backgroundColor: C.green800,
  },
  msgMeta: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  msgMetaText: {
    color: C.muted,
    fontSize: 11,
    ...fontBody('700'),
  },
  chatComposerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 18 : 12,
    backgroundColor: C.cream,
    borderTopWidth: 1,
    borderTopColor: '#ece8dd',
  },
  composerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e6e1d6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInputShell: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e6e1d6',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  composerPlaceholder: {
    color: '#98a2b3',
    fontSize: 14,
    ...fontBody('500'),
  },
  composerSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.green600,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
