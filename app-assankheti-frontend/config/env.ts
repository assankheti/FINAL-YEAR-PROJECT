import Constants from 'expo-constants';

/**
 * Environment configuration
 * All environment variables should be accessed through this file
 */

const extra = Constants.expoConfig?.extra ?? {};

export const ENV = {
  API_URL: extra.API_URL as string || 'http://localhost:8000',
  // Add other environment variables here
  // GOOGLE_MAPS_API_KEY: extra.GOOGLE_MAPS_API_KEY as string,
} as const;

// Export individual variables for convenience
export const API_BASE = ENV.API_URL;
