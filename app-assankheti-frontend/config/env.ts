import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

/**
 * Environment configuration
 * Expo Go on a real phone should talk to the laptop over LAN.
 * Android emulator should fall back to 10.0.2.2 only when no LAN host is known.
 */

const extra = Constants.expoConfig?.extra ?? {};
const PRODUCTION_API_URL =
  typeof extra.PRODUCTION_API_URL === 'string' && extra.PRODUCTION_API_URL.trim()
    ? extra.PRODUCTION_API_URL.trim()
    : 'https://assan-kheti-backend.onrender.com';

function getBooleanExtra(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

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

function getExplicitApiUrl(): string | null {
  const configured = typeof extra.API_URL === 'string' ? extra.API_URL.trim() : '';
  if (!configured) return null;

  const isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?\/?$/i.test(configured);
  if (isLoopback) return null;

  return configured;
}

function getExpoLanApiUrl(): string | null {
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

  return null;
}

function getDevApiUrl(): string {
  if (getBooleanExtra(extra.USE_PRODUCTION_API)) {
    return PRODUCTION_API_URL;
  }

  const explicitUrl = getExplicitApiUrl();
  if (explicitUrl) return explicitUrl;

  const expoLanUrl = getExpoLanApiUrl();
  if (expoLanUrl) return expoLanUrl;

  // Final emulator/simulator fallback.
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://127.0.0.1:8000';
}

export const ENV = {
  API_URL: getDevApiUrl(),
  USE_PRODUCTION_API: getBooleanExtra(extra.USE_PRODUCTION_API),
} as const;

export const API_BASE = ENV.API_URL;
