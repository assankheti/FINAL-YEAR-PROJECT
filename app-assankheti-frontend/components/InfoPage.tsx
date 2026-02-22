import React from 'react';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

type I18nString = string | { english: string; urdu?: string };

type Props = {
  title: I18nString;
  subtitle?: I18nString;
  children?: React.ReactNode;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  contentStyle?: object;
};

function resolveText(val: I18nString) {
  if (typeof val === 'string') return val;
  return val.english ?? '';
}

export default function InfoPage({ title, subtitle, children, searchQuery, onSearchChange, contentStyle }: Props) {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={["#0d5c4b", "#10b981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={[styles.headerRow, { paddingHorizontal: 16 }]}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.9}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Feather name="arrow-left" size={18} color="#ffffff" />
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle}>{resolveText(title)}</Text>
              {subtitle ? <Text style={styles.headerSub}>{resolveText(subtitle)}</Text> : null}
            </View>
          </View>

          {onSearchChange ? (
            <View style={styles.searchWrap}>
              <Feather name="search" size={18} color="#6b7280" />
              <TextInput
                placeholder="Search..."
                placeholderTextColor="#6b7280"
                value={searchQuery}
                onChangeText={onSearchChange}
                style={styles.searchInput}
              />
            </View>
          ) : null}
        </LinearGradient>

        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: 920, alignSelf: 'center' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.75)', marginTop: 2, fontSize: 13 },

  searchWrap: {
    marginTop: 14,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    maxWidth: 920,
    alignSelf: 'center',
  },
  searchInput: { flex: 1, height: 48, fontSize: 14, color: '#111827' },
});
