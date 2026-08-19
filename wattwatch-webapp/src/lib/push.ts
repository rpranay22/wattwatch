// Mobile push (Capacitor + FCM) and web push registration with the WattWatch API.
// APK: server sends FCM when price enters cheap window — works when app is closed.
// Web: browser notifications while tab is open (see notifications.ts).

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { api } from './api';
import { isCheapWindowNotifyEnabled } from './notifications';
import { initFirebase } from './firebase';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function pushMode(): 'native' | 'web' {
  return isNativeApp() ? 'native' : 'web';
}

let deviceToken: string | null = null;
let listenersAttached = false;

export async function initMobilePush(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!isNativeApp()) return 'unsupported';

  await initFirebase();

  if (!listenersAttached) {
    listenersAttached = true;

    PushNotifications.addListener('registration', async (token) => {
      deviceToken = token.value;
      console.log('FCM registration token:', token.value);
      try {
        await api.registerPushToken(token.value, Capacitor.getPlatform() as 'android' | 'ios', isCheapWindowNotifyEnabled());
      } catch (e) {
        console.warn('push token register failed:', e);
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('push registration error:', err.error);
    });

    PushNotifications.addListener('pushNotificationReceived', (n) => {
      console.log('push received (foreground):', n.title, n.body);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('push tapped:', action.notification?.data);
    });
  }

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt') {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== 'granted') return 'denied';

  await PushNotifications.register();
  return 'granted';
}

export async function teardownMobilePush() {
  if (!isNativeApp() || !deviceToken) return;
  try {
    await api.unregisterPushToken(deviceToken);
  } catch {}
  deviceToken = null;
}

export async function syncCheapWindowPreference(enabled: boolean) {
  if (isNativeApp() && deviceToken) {
    try {
      await api.updatePushPreferences(enabled);
    } catch {}
  }
}

export function getDevicePushToken(): string | null {
  return deviceToken;
}

export async function getPushStatus() {
  if (!isNativeApp()) return null;
  try {
    return await api.getPushStatus();
  } catch {
    return null;
  }
}
