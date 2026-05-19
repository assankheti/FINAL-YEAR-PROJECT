import dotenv from 'dotenv';
import path from 'path';

// Load .env from the repository root (one level above the frontend folder)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// In Docker, API_URL comes from the container environment variable.
// In local dev, dotenv reads from the local .env file.
const API_URL = process.env.API_URL || 'http://localhost:8000';
const STREAM_API_KEY = process.env.STREAM_API_KEY || '';

export default {
  expo: {
    name: 'assankhetiapp',
    slug: 'assankhetiapp',
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
      STREAM_API_KEY,
      // Add other env variables here as needed
      OPENAI_KEY: process.env.OPENAI_KEY || process.env.OPENAI_API_KEY,
      // GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    },
  },
};
