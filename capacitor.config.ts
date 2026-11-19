/**
 * Native shell configuration: identifies the Android app and points Capacitor at the compiled browser bundle.
 */
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.diamachi.brufin',
  appName: 'BruFin',
  webDir: 'dist'
};

export default config;
