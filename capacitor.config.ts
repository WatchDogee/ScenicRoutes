import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.scenicroutes.app',
  appName: 'ScenicRoutes',
  webDir: 'public',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Geolocation: {
      permissions: {
        location: {
          description: 'Required for route planning and navigation',
        },
      },
    },
  },
};

export default config;

