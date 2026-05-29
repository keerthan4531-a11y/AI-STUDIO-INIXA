import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.inixa.app',
  appName: 'inixa',
  webDir: 'out',
  server: {
    url: 'https://ai-studio-inixa.vercel.app',
    cleartext: true
  }
};

export default config;
