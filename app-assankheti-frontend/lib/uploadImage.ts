import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { API_BASE } from '../config/env';
import { SESSION_EXPIRED_ERROR } from './authFetch';

export { SESSION_EXPIRED_ERROR };

function inferMime(uri: string): { mime: string; ext: string } {
  const lower = uri.split('?')[0].toLowerCase();
  if (lower.endsWith('.png')) return { mime: 'image/png', ext: 'png' };
  return { mime: 'image/jpeg', ext: 'jpg' };
}

async function clearAuth(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem('auth.access_token'),
    AsyncStorage.removeItem('auth.token_type'),
  ]);
}

export async function uploadImage(uri: string): Promise<string> {
  if (!uri) throw new Error('uploadImage: uri is required');

  const token = await AsyncStorage.getItem('auth.access_token');
  if (!token) throw new Error(SESSION_EXPIRED_ERROR);

  const { mime, ext } = inferMime(uri);
  const filename = `upload.${ext}`;

  const form = new FormData();

  if (Platform.OS === 'web') {
    // expo-image-picker returns blob: / data: URIs on web. DOM FormData
    // stringifies plain objects to "[object Object]", so we need a real Blob.
    const resp = await fetch(uri);
    let blob = await resp.blob();
    if (!blob.type) {
      blob = new Blob([blob], { type: mime });
    }
    form.append('file', blob, filename);
  } else {
    form.append('file', {
      uri,
      name: filename,
      type: mime,
    } as unknown as Blob);
  }

  const res = await fetch(API_BASE + '/api/v1/media/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!res.ok) {
    if (res.status === 401) {
      await clearAuth();
      throw new Error(SESSION_EXPIRED_ERROR);
    }
    let detail = `Upload failed (${res.status})`;
    try {
      const json = await res.json();
      if (json?.detail) detail = json.detail;
    } catch {
      // ignore parse errors, fall back to status-only message
    }
    throw new Error(detail);
  }

  const json = await res.json();
  if (!json?.url) throw new Error('Upload response missing url');
  return json.url as string;
}
