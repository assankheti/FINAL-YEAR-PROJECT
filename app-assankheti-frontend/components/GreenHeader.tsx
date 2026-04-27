import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useT } from '@/contexts/LanguageContext';

export default function GreenHeader({
  title,
  onBack,
  showBack = true,
  titleLines = 1,
  rightElement,
  children,
}: {
  title: string | { english: string; urdu: string };
  onBack?: () => void;
  showBack?: boolean;
  titleLines?: number;
  rightElement?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const t = useT();

  const resolvedTitle = typeof title === 'string' ? title : t(title);

  return (
    <LinearGradient
      colors={["#0d5c4b", "#10b981"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingHorizontal: horizontalPadding }]}
    >
      <View style={[styles.headerRow, { width: '100%' }]}>
        <View style={styles.sideSlot}>
          {showBack ? (
            <TouchableOpacity onPress={onBack} activeOpacity={0.9} style={styles.backBtn}>
              <Feather name="arrow-left" size={18} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.sidePlaceholder} />
          )}
        </View>

        <View style={styles.titleWrap}>
          <Text style={[styles.headerTitle, titleLines > 1 && styles.headerTitleMultiline]} numberOfLines={titleLines}>
            {resolvedTitle}
          </Text>
        </View>

        <View style={[styles.sideSlot, styles.headerActions]}>
          {rightElement ? rightElement : <View style={styles.sidePlaceholder} />}
        </View>
      </View>
      {children ? <View style={styles.childrenWrap}>{children}</View> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: 520,
    gap: 8,
  },
  sideSlot: { width: 44, alignItems: 'flex-start', justifyContent: 'center' },
  sidePlaceholder: { width: 40, height: 40 },
  titleWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: { alignItems: 'flex-end', justifyContent: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  headerTitleMultiline: { lineHeight: 24 },
  childrenWrap: { marginTop: 12, alignSelf: 'center', width: '100%', maxWidth: 520 },
});
