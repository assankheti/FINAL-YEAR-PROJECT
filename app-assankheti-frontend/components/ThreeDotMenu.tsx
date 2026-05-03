import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '@/contexts/LanguageContext';

type Option = {
  key: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  // label can be a bilingual object or a plain string
  label: string | { english: string; urdu?: string };
  destructive?: boolean;
  onPress?: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  options: Option[];
};

export default function ThreeDotMenu({ visible, onClose, title, subtitle, options }: Props) {
  const t = useT();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetWidth = Math.min(width, 560);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { maxWidth: sheetWidth }]}>
          <LinearGradient colors={["#0d5c4b", "#10b981"]} style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerCopy}>
              {title ? (
                <Text style={styles.title} numberOfLines={1}>
                  {typeof title === 'string' ? title : t(title)}
                </Text>
              ) : null}
              {subtitle ? (
                <Text style={styles.sub} numberOfLines={1}>
                  {typeof subtitle === 'string' ? subtitle : t(subtitle)}
                </Text>
              ) : null}
            </View>
          </LinearGradient>

          <View style={[styles.body, { paddingBottom: Math.max(14, insets.bottom + 10) }]}>
            {options.map((o) => (
              <TouchableOpacity
                key={o.key}
                activeOpacity={0.85}
                style={[styles.optionRow, o.destructive ? styles.optionDestructive : null]}
                onPress={() => {
                  onClose();
                  o.onPress?.();
                }}
              >
                <View style={[styles.optionIcon, o.destructive ? styles.optionIconDestructive : null]}>
                  {o.icon ? <Feather name={o.icon} size={18} color={o.destructive ? '#ef4444' : '#0d5c4b'} /> : null}
                </View>
                <Text style={[styles.optionLabel, o.destructive ? styles.optionLabelDestructive : null]} numberOfLines={1}>
                  {typeof o.label === 'string' ? o.label : t(o.label)}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity activeOpacity={0.85} style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>{t({ english: 'Cancel', urdu: 'منسوخ' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.42)', justifyContent: 'flex-end', alignItems: 'center' },
  container: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: { paddingTop: 10, paddingBottom: 16 },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.42)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerCopy: { paddingHorizontal: 18 },
  title: { color: '#fff', fontWeight: '900', fontSize: 17, lineHeight: 22 },
  sub: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 13, fontWeight: '700' },
  body: { padding: 14 },
  optionRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(13,92,75,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconDestructive: { backgroundColor: '#fff1f1' },
  optionLabel: { flex: 1, fontWeight: '900', color: '#111827', fontSize: 15 },
  optionLabelDestructive: { color: '#ef4444' },
  optionDestructive: { backgroundColor: 'rgba(239,68,68,0.04)' },
  cancelBtn: { marginTop: 8, minHeight: 50, borderRadius: 16, backgroundColor: '#f2f4f7', alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#475467', fontWeight: '900' },
});
