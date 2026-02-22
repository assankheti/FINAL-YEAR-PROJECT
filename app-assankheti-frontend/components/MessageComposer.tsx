import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useT } from '@/contexts/LanguageContext';

export default function MessageComposer({
  draft,
  onChangeDraft,
  onSend,
  placeholder,
  leftElement,
  style,
}: {
  draft: string;
  onChangeDraft: (s: string) => void;
  onSend: () => void;
  placeholder?: string | { english: string; urdu: string };
  leftElement?: React.ReactNode;
  style?: any;
}) {
  const t = useT();
  const resolvedPlaceholder = typeof placeholder === 'string' ? placeholder : placeholder ? t(placeholder) : t({ english: 'Type a message', urdu: 'پیغام لکھیں' });

  return (
    <View style={[styles.inputBar, style]}> 
      {leftElement ? <>{leftElement}</> : null}
      <TextInput
        value={draft}
        onChangeText={onChangeDraft}
        placeholder={resolvedPlaceholder}
        placeholderTextColor="#9ca3af"
        style={styles.input}
        returnKeyType="send"
        onSubmitEditing={onSend}
      />
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.sendBtn}
        onPress={onSend}
        accessibilityRole="button"
        accessibilityLabel={t({ english: 'Send', urdu: 'بھیجیں' })}
      >
        <Feather name="send" size={18} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inputBar: {
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f5f1e8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    color: '#111827',
    fontWeight: '800',
  },
  sendBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#0d5c4b', alignItems: 'center', justifyContent: 'center' },
});
