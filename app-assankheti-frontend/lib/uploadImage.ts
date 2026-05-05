import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE } from '../config/env';

function inferMime(uri: string): { mime: string; ext: string } {
  const lower = uri.split('?')[0].toLowerCase();
  if (lower.endsWith('.png')) return { mime: 'image/png', ext: 'png' };
  return { mime: 'image/jpeg', ext: 'jpg' };
}

export async function uploadImage(uri: string): Promise<string> {
  if (!uri) throw new Error('uploadImage: uri is required');

  const token = await AsyncStorage.getItem('auth.access_token');
  if (!token) throw new Error('uploadImage: not authenticated');

  const { mime, ext } = inferMime(uri);

  const form = new FormData();
  form.append('file', {
    uri,
    name: `upload.${ext}`,
    type: mime,
  } as unknown as Blob);

  const res = await fetch(API_BASE + '/api/v1/media/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!res.ok) {
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
