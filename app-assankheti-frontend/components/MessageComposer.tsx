import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useT } from '@/contexts/LanguageContext';

export default function MessageComposer({
  draft,
  onChangeDraft,
  onSend,
  onInputFocus,
  onInputBlur,
  placeholder,
  leftElement,
  style,
}: {
  draft: string;
  onChangeDraft: (s: string) => void;
  onSend: () => void;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
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
        onFocus={onInputFocus}
        onBlur={onInputBlur}
        placeholder={resolvedPlaceholder}
        placeholderTextColor="#9ca3af"
        style={styles.input}
        returnKeyType="send"
        blurOnSubmit={false}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e8eceb',
    paddingHorizontal: 14,
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#0d5c4b',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
