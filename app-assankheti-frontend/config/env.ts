import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

/**
 * Environment configuration
 * Auto-detects the dev machine's IP from Expo so it works on any network.
 */

const extra = Constants.expoConfig?.extra ?? {};

function isUsableHost(host?: string | null): host is string {
  if (!host) return false;
  const normalized = host.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'localhost' && normalized !== '127.0.0.1' && normalized !== '0.0.0.0';
}

function extractHost(value?: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;

  // Supports values like:
  // 1) "192.168.10.4:19000"
  // 2) "http://192.168.10.4:8081/index.bundle?..."
  // 3) "https://example.com:443"
  const hostMatch = cleaned.match(/^(?:https?:\/\/)?([^/:?]+)(?::\d+)?/i);
  return hostMatch?.[1] ?? null;
}

function buildApiUrlFromHost(host?: string | null): string | null {
  const parsedHost = extractHost(host);
  if (!isUsableHost(parsedHost)) return null;
  return `http://${parsedHost}:8000`;
}

function getDevApiUrl(): string {
  // If explicitly set via env variable, use that
  if (extra.API_URL && extra.API_URL !== 'http://localhost:8000') {
    return extra.API_URL as string;
  }

  // Auto-detect from Expo/Dev Client hosts first.
  const candidateHosts: (string | null | undefined)[] = [
    Constants.expoGoConfig?.debuggerHost,
    (Constants as any).manifest?.debuggerHost,
    (Constants as any).expoConfig?.hostUri,
    (Constants as any).manifest2?.extra?.expoClient?.hostUri,
    (NativeModules as any)?.SourceCode?.scriptURL,
  ];

  for (const candidate of candidateHosts) {
    const url = buildApiUrlFromHost(candidate);
    if (url) return url;
  }

  // Final emulator/simulator fallback.
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://127.0.0.1:8000';
}

export const ENV = {
  API_URL: getDevApiUrl(),
} as const;

export const API_BASE = ENV.API_URL;
