import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useLanguage, useT } from '@/contexts/LanguageContext';

export default function GreenHeader({
  title,
  onBack,
  showBack = true,
  rightElement,
  children,
}: {
  title: string | { english: string; urdu: string };
  onBack?: () => void;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const { textLanguage } = useLanguage();
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
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { textAlign: textLanguage === 'urdu' ? 'right' : 'left' }]} numberOfLines={1}>
            {resolvedTitle}
          </Text>
          {children ? <View style={{ marginTop: 10 }}>{children}</View> : null}
        </View>

        {rightElement ? (
          <View style={styles.headerActions}>{rightElement}</View>
        ) : showBack ? (
          <TouchableOpacity onPress={onBack} activeOpacity={0.9} style={styles.backBtn}>
            <Feather name="arrow-left" size={18} color="#ffffff" />
          </TouchableOpacity>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 18,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, alignSelf: 'center', maxWidth: 520 },
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
});
