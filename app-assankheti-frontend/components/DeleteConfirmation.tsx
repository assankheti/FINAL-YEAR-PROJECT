import React from 'react';
import { useT } from '@/contexts/LanguageContext';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
};

export default function DeleteConfirmation({ visible, onCancel, onConfirm, title = 'Delete', message = 'Are you sure?' }: Props) {
  const t = useT();
  // title/message may be bilingual objects or strings in callers
  const resolvedTitle = typeof title === 'string' ? title : (title as any) ? t(title as any) : 'Delete';
  const resolvedMessage = typeof message === 'string' ? message : (message as any) ? t(message as any) : 'Are you sure?';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{resolvedTitle}</Text>
          <Text style={styles.msg}>{resolvedMessage}</Text>

          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onCancel} activeOpacity={0.9}>
              <Text style={styles.cancelText}>{t({ english: 'Cancel', urdu: 'منسوخ' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.confirmBtn]} onPress={onConfirm} activeOpacity={0.9}>
              <Text style={styles.confirmText}>{t({ english: 'Delete', urdu: 'حذف کریں' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  box: { width: '86%', backgroundColor: '#fff', borderRadius: 12, padding: 18, alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '900', color: '#111827' },
  msg: { color: '#6b7280', marginTop: 8, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: 'rgba(13,92,75,0.06)' },
  confirmBtn: { backgroundColor: '#ef4444' },
  cancelText: { color: '#0d5c4b', fontWeight: '900' },
  confirmText: { color: '#ffffff', fontWeight: '900' },
});
