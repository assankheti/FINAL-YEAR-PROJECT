import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type MobileNotificationItem = {
  id: string;
  title: string;
  body?: string;
  isRead?: boolean;
  data?: Record<string, unknown>;
};

const PUSH_SETTING_KEY = 'settings.pushNotifications';
const SENT_NOTIFICATIONS_KEY = 'assanKheti.sentMobileNotifications.v1';
const ANDROID_CHANNEL_ID = 'assan-kheti-alerts';

let handlerConfigured = false;
let permissionPromise: Promise<boolean> | null = null;

export function configureMobileNotifications() {
  if (handlerConfigured || Platform.OS === 'web') return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });

  handlerConfigured = true;
}

async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  configureMobileNotifications();

  if (!permissionPromise) {
    permissionPromise = (async () => {
      const current = await Notifications.getPermissionsAsync();
      if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
        return true;
      }

      const requested = await Notifications.requestPermissionsAsync();
      return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    })();
  }

  return permissionPromise;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Assan Kheti Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#10b981',
    sound: 'default',
  });
}

async function pushNotificationsEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(PUSH_SETTING_KEY);
  return raw !== 'false';
}

async function readSentNotificationKeys(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(SENT_NOTIFICATIONS_KEY);
  if (!raw) return new Set();

  try {
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

async function writeSentNotificationKeys(keys: Set<string>) {
  await AsyncStorage.setItem(SENT_NOTIFICATIONS_KEY, JSON.stringify([...keys]));
}

export async function showMobileNotificationOnce(
  namespace: string,
  item: MobileNotificationItem
): Promise<boolean> {
  if (!item.title.trim() || item.isRead) return false;
  if (!(await pushNotificationsEnabled())) return false;
  if (!(await ensureNotificationPermission())) return false;

  await ensureAndroidChannel();

  const sentKeys = await readSentNotificationKeys();
  const key = `${namespace}:${item.id}`;
  if (sentKeys.has(key)) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: item.title,
      body: item.body,
      sound: 'default',
      data: { namespace, notificationId: item.id, ...(item.data ?? {}) },
    },
    trigger: Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null,
  });

  sentKeys.add(key);
  await writeSentNotificationKeys(sentKeys);
  return true;
}

export async function showMobileNotificationsOnce(
  namespace: string,
  items: MobileNotificationItem[]
) {
  for (const item of items) {
    try {
      await showMobileNotificationOnce(namespace, item);
    } catch (err) {
      console.error('Failed to show mobile notification:', err);
    }
  }
}
