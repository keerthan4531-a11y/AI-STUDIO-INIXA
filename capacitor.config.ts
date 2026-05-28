import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.inixa.app',
  appName: 'inixa',
  webDir: 'out',
  server: {
    url: 'http://10.169.5.137:3000',
    cleartext: true
  }
};

export default config;
