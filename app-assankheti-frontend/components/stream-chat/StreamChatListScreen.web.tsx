import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function StreamChatListScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Feather name="smartphone" size={28} color="#0d5c4b" />
        </View>
        <Text style={styles.title}>Stream Chat runs in the mobile app</Text>
        <Text style={styles.body}>
          The installed Stream Chat UI package uses native React Native modules, so it cannot be bundled on web.
          Open this project in Expo Go or an Android/iOS simulator to test chat.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.button} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dbe5dc',
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { color: '#0f172a', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  body: { color: '#475569', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  button: { backgroundColor: '#0d5c4b', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: '900' },
});
