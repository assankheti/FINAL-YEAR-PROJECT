import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useT } from '@/contexts/LanguageContext';

export default function ViewDetail({
  onPress,
  label,
  style,
  icon = 'chevron-right',
  variant = 'button',
}: {
  onPress: () => void;
  label?: string | { english: string; urdu: string };
  style?: ViewStyle;
  icon?: React.ComponentProps<typeof Feather>['name'];
  variant?: 'button' | 'link' | 'chip';
}) {
  const t = useT();
  const resolved = typeof label === 'string' ? label : label ? t(label) : t({ english: 'View Details', urdu: 'مزید دیکھیں' });

  if (variant === 'link') {
    return (
      <TouchableOpacity style={[styles.link, style]} onPress={onPress} activeOpacity={0.8}>
        <Text style={styles.linkText}>{resolved}</Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'chip') {
    return (
      <TouchableOpacity style={[styles.chip, style]} onPress={onPress} activeOpacity={0.8}>
        <Text style={styles.chipText}>{resolved}</Text>
        <Feather name={icon} size={14} color="#0d5c4b" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress} activeOpacity={0.9}>
      <Text style={styles.buttonText}>{resolved}</Text>
      <Feather name={icon} size={16} color="#0d5c4b" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
  buttonText: { color: '#0d5c4b', fontWeight: '900', fontSize: 12 },
  link: {},
  linkText: { color: '#0d5c4b', textDecorationLine: 'underline', fontWeight: '700' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(13,92,75,0.06)' },
  chipText: { color: '#0d5c4b', fontWeight: '900', fontSize: 12 },
});
