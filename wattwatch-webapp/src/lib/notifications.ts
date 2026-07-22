// Browser notifications. Uses the Web Notifications API — no server push
// infrastructure needed, which means notifications work while the WattWatch
// tab is open. This is the honest scope: real notifications, delivered by the
// browser, driven by the user's own alerts.

export type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function notificationSupport(): PermissionState {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as PermissionState;
}

export async function requestPermission(): Promise<PermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported';
  const result = await Notification.requestPermission();
  return result as PermissionState;
}

export function notify(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/vite.svg', tag: 'wattwatch' });
  } catch {
    // Some browsers block constructing Notification directly; fail quietly
    // rather than breaking the page.
  }
}

// Checks the user's alerts against the current price and fires a browser
// notification when one matches. Called on a timer while the app is open.
// Each alert only fires once per session to avoid spamming.
const firedThisSession = new Set<string>();

export function checkAlerts(
  alerts: { id: string; name: string; kind: string; condition?: string; threshold?: number; start?: string; enabled: boolean }[],
  currentPrice: number,
) {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  for (const a of alerts) {
    if (!a.enabled || firedThisSession.has(a.id)) continue;

    if (a.kind === 'price' && a.threshold != null) {
      const hit = a.condition === 'below' ? currentPrice < a.threshold : currentPrice > a.threshold;
      if (hit) {
        notify('WattWatch price alert', `${a.name} — the price is now €${currentPrice.toFixed(3)}/kWh.`);
        firedThisSession.add(a.id);
      }
    }

    if (a.kind === 'time' && a.start === hhmm) {
      notify('WattWatch reminder', a.name);
      firedThisSession.add(a.id);
    }
  }
}
