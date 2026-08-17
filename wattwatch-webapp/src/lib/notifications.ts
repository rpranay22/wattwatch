// Notifications: native FCM (APK via Capacitor) + web fallback (browser tab open).

import { CHEAP_MAX, formatPrice, tierFor, type Tier } from './pricing';
import { isNativeApp, initMobilePush, syncCheapWindowPreference, pushMode } from './push';

export type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

const CHEAP_NOTIFY_KEY = 'ww_cheap_notify';

export { pushMode, isNativeApp };

export function notificationSupport(): PermissionState {
  if (isNativeApp()) return 'default'; // resolved after initMobilePush
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as PermissionState;
}

/** Request push permission — native FCM on APK, browser API on web. */
export async function requestPermission(): Promise<PermissionState> {
  if (isNativeApp()) {
    const result = await initMobilePush();
    return result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'unsupported';
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  const result = await Notification.requestPermission();
  return result as PermissionState;
}

export function isCheapWindowNotifyEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(CHEAP_NOTIFY_KEY) !== 'false';
}

export async function setCheapWindowNotifyEnabled(on: boolean) {
  localStorage.setItem(CHEAP_NOTIFY_KEY, on ? 'true' : 'false');
  await syncCheapWindowPreference(on);
}

export function notify(title: string, body: string, tag = 'wattwatch') {
  if (isNativeApp()) return; // native uses server FCM
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/vite.svg', tag });
  } catch {}
}

const firedThisSession = new Set<string>();

export function checkAlerts(
  alerts: { id: string; name: string; kind: string; condition?: string; threshold?: number; start?: string; enabled: boolean }[],
  currentPrice: number,
) {
  if (isNativeApp()) return; // custom alerts: future server-side push

  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  for (const a of alerts) {
    if (!a.enabled || firedThisSession.has(a.id)) continue;

    if (a.kind === 'price' && a.threshold != null) {
      const hit = a.condition === 'below' ? currentPrice < a.threshold : currentPrice > a.threshold;
      if (hit) {
        notify('WattWatch price alert', `${a.name} — the price is now ${formatPrice(currentPrice)}/kWh.`, `alert-${a.id}`);
        firedThisSession.add(a.id);
      }
    }

    if (a.kind === 'time' && a.start === hhmm) {
      notify('WattWatch reminder', a.name, `alert-${a.id}`);
      firedThisSession.add(a.id);
    }
  }
}

let lastTier: Tier | null = null;
let cheapWindowNotified = false;

/** Web-only cheap-window ping. APK uses server FCM (works when app is closed). */
export function checkCheapWindow(currentPrice: number) {
  if (isNativeApp()) return;
  if (!isCheapWindowNotifyEnabled()) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const tier = tierFor(currentPrice);

  if (tier !== 'cheap') {
    lastTier = tier;
    cheapWindowNotified = false;
    return;
  }

  if (cheapWindowNotified) {
    lastTier = tier;
    return;
  }

  const entering = lastTier !== null && lastTier !== 'cheap';
  const title = entering ? 'Price dropped — cheap window' : 'Cheap electricity now';
  const body = entering
    ? `${formatPrice(currentPrice)}/kWh (under ${formatPrice(CHEAP_MAX)}). Good time to run appliances or charge your EV.`
    : `${formatPrice(currentPrice)}/kWh — you're in a cheap window. Good time to use heavy loads.`;

  notify(title, body, 'wattwatch-cheap');
  cheapWindowNotified = true;
  lastTier = tier;
}

export function resetCheapWindowState() {
  lastTier = null;
  cheapWindowNotified = false;
  firedThisSession.clear();
}
