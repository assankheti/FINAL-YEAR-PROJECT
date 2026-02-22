import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const KEY = 'assan_kheti_mobile_id';

export async function getOrCreateMobileId(): Promise<string> {
    const existing = await AsyncStorage.getItem(KEY);
    if (existing) return existing;

    // UUID generated on device (no IMEI needed)
    const fresh = Crypto.randomUUID();
    await AsyncStorage.setItem(KEY, fresh);
    return fresh;
}