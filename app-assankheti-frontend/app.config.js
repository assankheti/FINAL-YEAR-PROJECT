import 'dotenv/config';

// In Docker, API_URL comes from the container environment variable.
// In local dev, dotenv reads from the local .env file.
const API_URL = process.env.API_URL || 'http://localhost:8000';

export default {
  expo: {
    name: 'assankhetiapp',
    slug: 'assankhetiapp',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'assankhetiapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      usesCleartextTraffic: true,
    },
    web: {
      output: 'static',
    },
    splash: {
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    plugins: [
      'expo-router',
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
      // Add other env variables here as needed
      // GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    },
  },
};
