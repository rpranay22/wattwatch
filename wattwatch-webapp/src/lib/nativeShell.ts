import { Capacitor } from '@capacitor/core';

/** Native shell tweaks (status bar overlap, touch scrolling, etc.). */
export function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.classList.add('native-app');
  document.body.classList.add('native-app');
}
