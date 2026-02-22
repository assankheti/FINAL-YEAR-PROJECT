import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FAQ = { q: string; a: string };

export default function FAQsPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const faqs = useMemo<FAQ[]>(
    () => [
      { q: 'How do I list a new product?', a: "Go to Marketplace → List New Product and fill the form." },
      { q: 'Can I edit my product after publishing?', a: 'Yes — open the product in My Products and tap Edit.' },
      { q: 'What is escrow payment?', a: 'Buyer funds are held until delivery is confirmed by the buyer.' },
    ],
    []
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={{ flex: 1 }}>
        <LinearGradient colors={['#0d5c4b', '#10b981']} style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.headerRow, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.9}>
              <Feather name="arrow-left" size={18} color="#ffffff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>FAQs</Text>
              <Text style={styles.headerSub}>عام سوالات</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: horizontalPadding, marginTop: 18 }}>
            <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', gap: 12 }}>
              {faqs.map((f, idx) => (
                <View key={idx} style={styles.card}>
                  <Text style={styles.q}>{f.q}</Text>
                  <Text style={styles.a}>{f.a}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 18, paddingBottom: 22, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.75)', marginTop: 2, fontSize: 13 },

  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  q: { fontWeight: '900', color: '#111827' },
  a: { marginTop: 8, color: '#6b7280' },
});
