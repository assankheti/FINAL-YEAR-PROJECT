import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { API_BASE } from '../config/env';
import { APP_FLOW_KEYS, clearAuthSession, readAppFlowState } from './appFlow';

export const SESSION_EXPIRED_ERROR = 'SESSION_EXPIRED';

let _redirecting = false;

async function handleExpiredSession(): Promise<void> {
  if (_redirecting) return;
  _redirecting = true;
  try {
    const state = await readAppFlowState();
    await clearAuthSession();
    router.replace({
      pathname: '/login',
      params: state.role ? { userType: state.role } : undefined,
    } as any);
  } finally {
    setTimeout(() => {
      _redirecting = false;
    }, 2000);
  }
}

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await AsyncStorage.getItem(APP_FLOW_KEYS.accessToken);
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
