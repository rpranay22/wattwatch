import { useTheme } from '../../state/ThemeContext';
import {
  notificationSupport, requestPermission, notify, PermissionState,
  isCheapWindowNotifyEnabled, setCheapWindowNotifyEnabled, pushMode, isNativeApp,
} from '../../lib/notifications';
import { getDevicePushToken, initMobilePush } from '../../lib/push';
import { useEffect, useState } from 'react';

export function ThemeSettings() {
  const { mode, toggle } = useTheme();
  const [perm, setPerm] = useState<PermissionState>('default');
  const [cheapNotify, setCheapNotify] = useState(true);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const native = isNativeApp();

  useEffect(() => {
    setPerm(notificationSupport());
    setCheapNotify(isCheapWindowNotifyEnabled());
    if (native) {
      initMobilePush().then((p) => setPerm(p));
      const id = window.setInterval(() => setFcmToken(getDevicePushToken()), 800);
      return () => window.clearInterval(id);
    }
  }, [native]);

  const enable = async () => {
    const p = await requestPermission();
    setPerm(p);
    if (p === 'granted') {
      if (native) {
        notify('Push notifications on', 'We will notify you on this phone when electricity enters a cheap window.');
      } else {
        notify(
          'Notifications are on',
          "We'll notify you when electricity enters a cheap window while WattWatch is open.",
        );
      }
    }
  };

  const toggleCheap = async (on: boolean) => {
    setCheapNotify(on);
    await setCheapWindowNotifyEnabled(on);
  };

  return (
    <>
      <div className="page-head"><h1>Theme</h1><p>Choose how WattWatch looks, and how it reaches you.</p></div>

      <div className="card" style={{ marginBottom: 16, maxWidth: 720 }}>
        <h3 style={{ marginBottom: 14 }}>Appearance</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[['light', 'Light', 'Clean white with teal accents', '#FFFFFF'],
            ['dark', 'Dark', 'Deep teal, easier at night', '#06363D']].map(([id, name, desc, swatch]) => {
            const on = mode === id;
            return (
              <button key={id} onClick={() => { if (!on) toggle(); }}
                style={{ display: 'flex', gap: 13, alignItems: 'center', padding: 16, borderRadius: 14,
                  border: `2px solid ${on ? 'var(--brand)' : 'var(--border)'}`,
                  background: on ? 'var(--brand-tint)' : 'var(--card)', textAlign: 'left', color: 'var(--ink)' }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, background: swatch, border: '1px solid var(--border)', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  <strong style={{ display: 'block' }}>{name}</strong>
                  <span className="muted" style={{ fontSize: 13 }}>{desc}</span>
                </span>
                {on && <span style={{ color: 'var(--brand)', fontSize: 20 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ maxWidth: 720 }}>
        <h3 style={{ marginBottom: 12 }}>Notifications</h3>
        <p className="muted" style={{ marginBottom: 14, lineHeight: 1.5 }}>
          {native
            ? 'Mobile app mode — push alerts are sent from the server via Firebase, even when WattWatch is closed.'
            : 'Web mode — browser alerts work while this tab is open. Build the APK for background phone notifications.'}
          {' '}(Mode: {pushMode()})
        </p>

        {perm === 'unsupported' && !native ? <p className="muted">Your browser does not support notifications.</p>
        : perm === 'granted' ? (
          <>
            <div className="list-row">
              <div>
                <strong>Cheap window alerts</strong>
                <div className="muted">When price drops under €0.20/kWh (ENTSO-E live data)</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={cheapNotify} onChange={(e) => toggleCheap(e.target.checked)} />
                <span>{cheapNotify ? 'On' : 'Off'}</span>
              </label>
            </div>
            {!native && (
              <div className="list-row">
                <div><strong>Custom alerts</strong><div className="muted">While tab is open</div></div>
                <span className="pill cheap">Enabled</span>
              </div>
            )}
            {!native && (
              <button className="btn ghost" style={{ marginTop: 12 }}
                onClick={() => notify('Test notification', 'This is what a cheap-window alert looks like.', 'wattwatch-test')}>
                Send a test
              </button>
            )}
            {native && fcmToken && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--divider)' }}>
                <strong style={{ display: 'block', marginBottom: 6 }}>FCM token (for Firebase test)</strong>
                <p className="muted" style={{ marginBottom: 10, fontSize: 13, lineHeight: 1.5 }}>
                  Paste this into Firebase Console → Messaging → Test on device.
                </p>
                <code style={{ display: 'block', wordBreak: 'break-all', fontSize: 11, lineHeight: 1.45, padding: 10, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  {fcmToken}
                </code>
                <button
                  className="btn ghost"
                  style={{ marginTop: 10 }}
                  onClick={async () => {
                    await navigator.clipboard.writeText(fcmToken);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? 'Copied!' : 'Copy token'}
                </button>
              </div>
            )}
          </>
        ) : perm === 'denied' ? (
          <p className="muted">
            Notifications are blocked. {native ? 'Enable them in Android Settings → Apps → WattWatch → Notifications.' : 'Enable them in your browser settings for this site, then reload.'}
          </p>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: 12 }}>
              {native
                ? 'Allow notifications so we can alert you on your phone when electricity is cheap — no need to keep the app open.'
                : 'Turn on notifications for cheap-window alerts while WattWatch is open in your browser.'}
            </p>
            <button className="btn" onClick={enable}>Enable notifications</button>
          </>
        )}
      </div>
    </>
  );
}
