import Constants from 'expo-constants';

/**
 * Environment configuration
 * Auto-detects the dev machine's IP from Expo so it works on any network.
 */

const extra = Constants.expoConfig?.extra ?? {};

function getDevApiUrl(): string {
  // If explicitly set via env variable, use that
  if (extra.API_URL && extra.API_URL !== 'http://localhost:8000') {
    return extra.API_URL as string;
  }

  // Auto-detect from Expo's debugger host (works on any network)
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost;

  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:8000`;
  }

  // Fallback
  return 'http://localhost:8000';
}

export const ENV = {
  API_URL: getDevApiUrl(),
} as const;

export const API_BASE = ENV.API_URL;
