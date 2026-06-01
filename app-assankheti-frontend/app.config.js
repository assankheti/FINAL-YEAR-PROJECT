import dotenv from 'dotenv';
import path from 'path';

// Load .env from the repository root (one level above the frontend folder)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

const PRODUCTION_API_URL =
  process.env.PRODUCTION_API_URL || 'https://assan-kheti-backend.onrender.com';
const USE_PRODUCTION_API =
  process.env.USE_PRODUCTION_API === undefined
    ? true
    : ['1', 'true', 'yes', 'on'].includes(
        String(process.env.USE_PRODUCTION_API).trim().toLowerCase()
      );
const API_URL = USE_PRODUCTION_API
  ? PRODUCTION_API_URL
  : process.env.API_URL || 'http://localhost:8000';
const STREAM_API_KEY = process.env.STREAM_API_KEY || '';

export default {
  expo: {
    name: 'assan-kheti',
    slug: 'assan-kheti',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'assankhetiapp',
    icon: './assets/images/logo-removebg.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      icon: './assets/images/logo-removebg.png',
      supportsTablet: true,
    },
    android: {
      package: 'com.assankheti.app',
      versionCode: 2,
      permissions: ['INTERNET'],
      softwareKeyboardLayoutMode: 'resize',
      intentFilters: [
        {
          action: 'VIEW',
          data: [{ scheme: 'assankhetiapp' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      adaptiveIcon: {
        foregroundImage: './assets/images/logo-removebg.png',
        backgroundColor: '#E6F4FE',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      usesCleartextTraffic: true,
    },
    web: {
      output: 'static',
      favicon: './assets/images/logo-removebg.png',
    },
    splash: {
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    plugins: [
      'expo-router',
      'expo-localization',
      'expo-notifications',
      'expo-video',
      'expo-audio',
      [
        'expo-splash-screen',
        {
          image: './assets/images/logo-removebg.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      API_URL,
      PRODUCTION_API_URL,
      USE_PRODUCTION_API,
      STREAM_API_KEY,
      eas: {
        projectId: '30f790ba-3355-477d-8e3c-1c33134336d3',
      },
      // Add other env variables here as needed
      GEMINI_KEY: process.env.GEMINI_KEY || process.env.GEMINI_API_KEY,
      // GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    },
  },
};
