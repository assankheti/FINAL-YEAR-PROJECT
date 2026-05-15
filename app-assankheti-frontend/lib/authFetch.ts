import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { API_BASE } from '../config/env';

export const SESSION_EXPIRED_ERROR = 'SESSION_EXPIRED';

let _redirecting = false;

async function handleExpiredSession(): Promise<void> {
  if (_redirecting) return;
  _redirecting = true;
  try {
    await Promise.all([
      AsyncStorage.removeItem('auth.access_token'),
      AsyncStorage.removeItem('auth.token_type'),
    ]);
    router.replace('/login');
  } finally {
    setTimeout(() => {
      _redirecting = false;
    }, 2000);
  }
}

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await AsyncStorage.getItem('auth.access_token');
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) {
    await handleExpiredSession();
    throw new Error(SESSION_EXPIRED_ERROR);
  }
  return res;
}
