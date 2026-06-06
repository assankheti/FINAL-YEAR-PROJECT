import AsyncStorage from '@react-native-async-storage/async-storage';

export type LocalNotificationRecord = {
  notification_id: string;
  namespace: string;
  type: string;
  title_en: string;
  title_ur: string;
  body_en: string;
  body_ur: string;
  read: boolean;
  created_at: string;
  data?: Record<string, unknown> | null;
};

export type LocalNotificationSeed = {
  id: string;
  type?: string;
  title?: string;
  titleEn?: string;
  titleUr?: string;
  body?: string;
  bodyEn?: string;
  bodyUr?: string;
  isRead?: boolean;
  createdAt?: string;
  data?: Record<string, unknown>;
};

const STORAGE_KEY = 'assanKheti.localNotificationInbox.v1';
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeLocalNotifications(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function readAllLocalNotifications(): Promise<LocalNotificationRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.notification_id === 'string')
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
  } catch {
    return [];
  }
}

async function writeAllLocalNotifications(items: LocalNotificationRecord[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function listLocalNotifications(namespaces?: string[]) {
  const items = await readAllLocalNotifications();
  if (!namespaces?.length) return items;
  const allowed = new Set(namespaces);
  return items.filter((item) => allowed.has(item.namespace));
}

export async function upsertLocalNotifications(namespace: string, seeds: LocalNotificationSeed[]) {
  if (!seeds.length) return;

  const existing = await readAllLocalNotifications();
  const byId = new Map(existing.map((item) => [item.notification_id, item]));

  for (const seed of seeds) {
    const notificationId = `${namespace}:${seed.id}`;
    const current = byId.get(notificationId);
    const titleEn = seed.titleEn ?? seed.title ?? current?.title_en ?? '';
    const titleUr = seed.titleUr ?? seed.title ?? current?.title_ur ?? titleEn;
    const bodyEn = seed.bodyEn ?? seed.body ?? current?.body_en ?? '';
    const bodyUr = seed.bodyUr ?? seed.body ?? current?.body_ur ?? bodyEn;

    byId.set(notificationId, {
      notification_id: notificationId,
      namespace,
      type: seed.type ?? current?.type ?? 'system',
      title_en: titleEn,
      title_ur: titleUr,
      body_en: bodyEn,
      body_ur: bodyUr,
      read: current?.read ?? Boolean(seed.isRead),
      created_at: current?.created_at ?? seed.createdAt ?? new Date().toISOString(),
      data: seed.data ?? current?.data ?? null,
    });
  }

  const next = [...byId.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  await writeAllLocalNotifications(next);
  emitChange();
}

export async function markLocalNotificationsRead(options?: {
  notificationIds?: string[];
  namespaces?: string[];
}) {
  const existing = await readAllLocalNotifications();
  const ids = options?.notificationIds ? new Set(options.notificationIds) : null;
  const namespaces = options?.namespaces ? new Set(options.namespaces) : null;

  let changed = false;
  const next = existing.map((item) => {
    const matchesId = !ids || ids.has(item.notification_id);
    const matchesNamespace = !namespaces || namespaces.has(item.namespace);
    if (!item.read && matchesId && matchesNamespace) {
      changed = true;
      return { ...item, read: true };
    }
    return item;
  });

  if (!changed) return;
  await writeAllLocalNotifications(next);
  emitChange();
}

export async function setLocalNotificationRead(notificationId: string, read: boolean) {
  const existing = await readAllLocalNotifications();
  let changed = false;
  const next = existing.map((item) => {
    if (item.notification_id === notificationId && item.read !== read) {
      changed = true;
      return { ...item, read };
    }
    return item;
  });

  if (!changed) return;
  await writeAllLocalNotifications(next);
  emitChange();
}

export async function removeLocalNotification(notificationId: string) {
  const existing = await readAllLocalNotifications();
  const next = existing.filter((item) => item.notification_id !== notificationId);
  if (next.length === existing.length) return;
  await writeAllLocalNotifications(next);
  emitChange();
}
