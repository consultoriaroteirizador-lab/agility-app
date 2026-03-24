import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Agility App',
  slug: 'agility-app',
  newArchEnabled: true,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'agility-app',
  userInterfaceStyle: 'automatic',

  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'br.com.agility.agilityapp',
    buildNumber: '1',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription: 'Este app precisa da sua localização para rastrear suas rotas de entrega.',
      NSLocationAlwaysUsageDescription: 'Este app precisa da sua localização para rastrear suas rotas de entrega mesmo em segundo plano.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'Este app precisa da sua localização para rastrear suas rotas de entrega mesmo em segundo plano.',
      NSFaceIDUsageDescription: 'Este app usa Face ID ou Touch ID para autenticação rápida e segura.',
      UIBackgroundModes: ['location', 'fetch', 'remote-notification'],
      // Licença do Background Geolocation para iOS
      TSLocationManagerLicense: 'eyJhbGciOiJFZERTQSIsImtpZCI6ImVkMjU1MTktbWFpbi12MSJ9.eyJvcyI6ImlvcyIsImFwcF9pZCI6ImJyLmNvbS5hZ2lsaXR5LmFnaWxpdHlhcHAiLCJvcmRlcl9udW1iZXIiOjE1MzQ0LCJyZW5ld2FsX3VybCI6Imh0dHBzOi8vc2hvcC50cmFuc2lzdG9yc29mdC5jb20vY2FydC8xNjUwNzg2MTUwNToxP25vdGU9MTAyMTMiLCJjdXN0b21lcl9pZCI6OTI5MiwicHJvZHVjdCI6InJlYWN0LW5hdGl2ZS1iYWNrZ3JvdW5kLWdlb2xvY2F0aW9uIiwia2V5X3ZlcnNpb24iOjEsImFsbG93ZWRfc3VmZml4ZXMiOlsiLmRldiIsIi5kZXZlbG9wbWVudCIsIi5zdGFnaW5nIiwiLnN0YWdlIiwiLnFhIiwiLnVhdCIsIi50ZXN0IiwiLmRlYnVnIl0sIm1heF9idWlsZF9zdGFtcCI6MjAyNzAyMjYsImdyYWNlX2J1aWxkcyI6MCwiZW50aXRsZW1lbnRzIjpbImNvcmUiXSwiaWF0IjoxNzY5NDUyMzM3fQ.iliR5Dui32zcTsa1OxEpMIoa_PrDtGy-4Y8IQg8PzwAHgR-s0iWh8TK3oxe-4wjv275_HhyqMDPNHSXnna0QAQ',
    },
  },

  android: {
    package: 'br.com.agility.agilityapp',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    softwareKeyboardLayoutMode: 'pan',
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
      'VIBRATE',
      'RECEIVE_BOOT_COMPLETED',
      'WAKE_LOCK',
    ],
  },

  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },

  plugins: [
    ['expo-router', { root: 'src/app' }],
    'expo-font',
    'expo-video',
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#FF6600',
        sounds: [],
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Permitir que o app acesse sua localização para rastreamento de rotas.',
        locationWhenInUsePermission: 'Permitir que o app acesse sua localização.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    'expo-local-authentication',
    [
      'expo-build-properties',
      {
        ios: {
          backgroundModes: ['location', 'fetch'],
        },
        android: {
          extraManifestMergerClassPath: 'androidx.core.core',
          googleServicesVersion: '4.4.2',
        },
      },
    ],
    // Plugin do Background Geolocation
    [
      'react-native-background-geolocation',
      {
        // A licença Android será adicionada ao AndroidManifest.xml durante o prebuild
        license: 'eyJhbGciOiJFZERTQSIsImtpZCI6ImVkMjU1MTktbWFpbi12MSJ9.eyJvcyI6ImFuZHJvaWQiLCJhcHBfaWQiOiJici5jb20uYWdpbGl0eS5hZ2lsaXR5YXBwIiwib3JkZXJfbnVtYmVyIjoxNTM0NCwicmVuZXdhbF91cmwiOiJodHRwczovL3Nob3AudHJhbnNpc3RvcnNvZnQuY29tL2NhcnQvMTY1MDc4NjE1MDU6MT9ub3RlPTEwMjEzIiwiY3VzdG9tZXJfaWQiOjkyOTIsInByb2R1Y3QiOiJyZWFjdC1uYXRpdmUtYmFja2dyb3VuZC1nZW9sb2NhdGlvbiIsImtleV92ZXJzaW9uIjoxLCJhbGxvd2VkX3N1ZmZpeGVzIjpbIi5kZXYiLCIuZGV2ZWxvcG1lbnQiLCIuc3RhZ2luZyIsIi5zdGFnZSIsIi5xYSIsIi51YXQiLCIudGVzdCIsIi5kZWJ1ZyJdLCJtYXhfYnVpbGRfc3RhbXAiOjIwMjcwMjI2LCJncmFjZV9idWlsZHMiOjAsImVudGl0bGVtZW50cyI6WyJjb3JlIl0sImlhdCI6MTc2OTQ1MjMzN30.f1eo_Of7GJTtepT7N-cSs8jsM7uGBXl_PLns3dBf4aVHZ1Lw7rzeO2b_oV3PmpZ36tLLbnWVbHZd5igNsrKsCg',
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    router: {},
    eas: {
      projectId: '38a03953-d99c-4fbd-b51e-03fc7f397345',
    },
    appEnv: process.env.APP_ENV || 'development',
    apiKey: process.env.API_KEY || '',
  },
});
