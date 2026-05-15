import React from 'react';
import { useT } from '@/contexts/LanguageContext';
import { Feather } from '@expo/vector-icons';
import { Modal, View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';

type Props = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
};

export default function DeleteConfirmation({ visible, onCancel, onConfirm, title = 'Delete', message = 'Are you sure?' }: Props) {
  const t = useT();
  const { width } = useWindowDimensions();
  const isTiny = width < 350;
  const boxWidth = Math.min(width - 36, 420);
  // title/message may be bilingual objects or strings in callers
  const resolvedTitle = typeof title === 'string' ? title : (title as any) ? t(title as any) : 'Delete';
  const resolvedMessage = typeof message === 'string' ? message : (message as any) ? t(message as any) : 'Are you sure?';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.box, isTiny ? styles.boxTiny : null, { width: boxWidth }]}>
          <View style={styles.iconWrap}>
            <Feather name="trash-2" size={22} color="#ef4444" />
          </View>
          <Text style={styles.title}>{resolvedTitle}</Text>
          <Text style={styles.msg}>{resolvedMessage}</Text>

          <View style={[styles.row, isTiny ? styles.rowTiny : null]}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onCancel} activeOpacity={0.9}>
              <Text style={styles.cancelText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {t({ english: 'Cancel', urdu: 'منسوخ' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.confirmBtn]} onPress={onConfirm} activeOpacity={0.9}>
              <Text style={styles.confirmText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {t({ english: 'Delete', urdu: 'حذف کریں' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 8,
  },
  boxTiny: { borderRadius: 20, padding: 16 },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff1f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '900', color: '#111827', textAlign: 'center' },
  msg: { color: '#667085', marginTop: 8, textAlign: 'center', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' },
  rowTiny: { gap: 8 },
  btn: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  cancelBtn: { backgroundColor: '#ecfdf3' },
  confirmBtn: { backgroundColor: '#ef4444' },
  cancelText: { color: '#0d5c4b', fontWeight: '900' },
  confirmText: { color: '#ffffff', fontWeight: '900' },
});
