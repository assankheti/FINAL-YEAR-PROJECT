import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient colors={["#0d5c4b", "#10b981"]} style={styles.header}>
            <View style={{ paddingHorizontal: 14 }}>
              {title ? <Text style={styles.title}>{typeof title === 'string' ? title : t(title)}</Text> : null}
              {subtitle ? <Text style={styles.sub}>{typeof subtitle === 'string' ? subtitle : t(subtitle)}</Text> : null}
            </View>
          </LinearGradient>

          <View style={styles.body}>
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
                {o.icon ? <Feather name={o.icon} size={18} color={o.destructive ? '#ef4444' : '#0d5c4b'} /> : null}
                <Text style={[styles.optionLabel, o.destructive ? { color: '#ef4444' } : null]}>{typeof o.label === 'string' ? o.label : t(o.label)}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity activeOpacity={0.85} style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.36)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  header: { paddingVertical: 14 },
  title: { color: '#fff', fontWeight: '900', fontSize: 16 },
  sub: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 13 },
  body: { padding: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8 },
  optionLabel: { marginLeft: 8, fontWeight: '800', color: '#111827' },
  optionDestructive: { backgroundColor: 'rgba(239,68,68,0.04)', borderRadius: 8 },
  cancelBtn: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: '#6b7280', fontWeight: '800' },
});
