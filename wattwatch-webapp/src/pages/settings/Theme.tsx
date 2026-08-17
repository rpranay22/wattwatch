import { useTheme } from '../../state/ThemeContext';
import { notificationSupport, requestPermission, notify, PermissionState } from '../../lib/notifications';
import { useEffect, useState } from 'react';

export function ThemeSettings() {
  const { mode, toggle } = useTheme();
  const [perm, setPerm] = useState<PermissionState>('default');
  useEffect(() => { setPerm(notificationSupport()); }, []);

  const enable = async () => {
    const p = await requestPermission();
    setPerm(p);
    if (p === 'granted') notify('Notifications are on', "We'll let you know when your alerts trigger.");
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
        {perm === 'unsupported' ? <p className="muted">Your browser does not support notifications.</p>
        : perm === 'granted' ? (
          <>
            <div className="list-row">
              <div><strong>Browser notifications</strong><div className="muted">On — your alerts will notify you</div></div>
              <span className="pill cheap">Enabled</span>
            </div>
            <button className="btn ghost" style={{ marginTop: 12 }}
              onClick={() => notify('Test notification', 'This is what an alert looks like.')}>Send a test</button>
          </>
        ) : perm === 'denied' ? (
          <p className="muted">Notifications are blocked. Enable them in your browser's settings for this site, then reload.</p>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: 12 }}>Turn on notifications so your alerts can reach you while WattWatch is open.</p>
            <button className="btn" onClick={enable}>Enable notifications</button>
          </>
        )}
      </div>
    </>
  );
}
