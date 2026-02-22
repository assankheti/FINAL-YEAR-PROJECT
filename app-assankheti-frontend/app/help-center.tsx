import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useT } from '@/contexts/LanguageContext';
import InfoPage from '@/components/InfoPage';

type HelpCategory = {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  labelUrdu: string;
  count: number;
};

type FAQ = {
  question: string;
  questionUrdu: string;
  answer: string;
};

export default function HelpCenterPage() {
  const router = useRouter();
  const t = useT();
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const [searchQuery, setSearchQuery] = useState('');

  const helpCategories = useMemo<HelpCategory[]>(
    () => [{ icon: 'tool', label: 'Troubleshooting', labelUrdu: 'مسائل حل کریں', count: 12 }],
    []
  );

  return (
    <InfoPage
      title={t({ english: 'Help Center', urdu: 'مدد کا مرکز' })}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      contentStyle={{ paddingBottom: 28 }}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: horizontalPadding, marginTop: 18 }}>
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
            <Text style={styles.blockTitle}>{t({ english: 'Browse Topics', urdu: 'موضوعات دیکھیں' })}</Text>

            <View style={styles.grid}>
              {helpCategories.map((c) => (
                <TouchableOpacity
                  key={c.label}
                  activeOpacity={0.9}
                  style={styles.gridCard}
                  onPress={() => router.push('/help-center/troubleshooting')}
                >
                  <View style={styles.gridIconBox}>
                    <Feather name={c.icon as any} size={18} color="#0d5c4b" />
                  </View>
                  <Text style={styles.gridLabel}>{t({ english: c.label, urdu: c.labelUrdu })}</Text>
                  <Text style={styles.gridCount}>{t({ english: `${c.count} articles`, urdu: `${c.count} مضامین` })}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: horizontalPadding, marginTop: 22 }}>
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
            <Text style={styles.blockTitle}>{t({ english: 'Still need help?', urdu: 'مزید مدد چاہیے؟' })}</Text>

            <View style={styles.contactCard}>
              <TouchableOpacity activeOpacity={0.9} style={styles.contactRow}>
                <View style={[styles.contactIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                  <Feather name="phone" size={18} color="#10b981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactTitle}>{t({ english: 'Call Us', urdu: 'ہمیں کال کریں' })}</Text>
                  <Text style={styles.contactSub}>+92 300 1234567</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.9} style={styles.contactRow}>
                <View style={[styles.contactIcon, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                  <Feather name="mail" size={18} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactTitle}>{t({ english: 'Email Support', urdu: 'ای میل سپورٹ' })}</Text>
                  <Text style={styles.contactSub}>support@assankheti.pk</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </InfoPage>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  },
  searchInput: { flex: 1, height: 48, fontSize: 14, color: '#111827' },

  blockTitle: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 10 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  gridIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(13,92,75,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridLabel: { fontWeight: '800', color: '#111827', fontSize: 13 },
  gridUrdu: { color: '#6b7280', fontSize: 11, marginTop: 3 },
  gridCount: { color: '#6b7280', fontSize: 11, marginTop: 8 },

  faqCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  faqHeader: { padding: 14, flexDirection: 'row', alignItems: 'center' },
  faqQ: { fontWeight: '800', color: '#111827', fontSize: 13 },
  faqUrdu: { color: '#6b7280', fontSize: 11, marginTop: 4 },
  chevOpen: { transform: [{ rotate: '90deg' }] },
  faqBody: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 },
  faqA: { color: '#6b7280', fontSize: 13, lineHeight: 18 },

  contactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 10 },
  contactIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  contactTitle: { fontWeight: '800', color: '#111827', fontSize: 13 },
  contactSub: { color: '#6b7280', fontSize: 11, marginTop: 3 },
});
