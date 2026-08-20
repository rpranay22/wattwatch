import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DEVICE_OPTIONS, DeviceKey, HOUSEHOLD_SIZES, SUPPLIERS, normalizeSupplier } from '../lib/data';

// Two-step onboarding: a welcome/explainer, then setup questions.
// Supplier is pre-filled from energy-switch signup (profile sync) when available.
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [devices, setDevices] = useState<DeviceKey[]>([]);
  const [size, setSize] = useState<string | null>(null);
  const [supplier, setSupplier] = useState<string | null>(null);
  const [supplierFromSignup, setSupplierFromSignup] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getProfile().then((p: any) => {
      const fromSignup = normalizeSupplier(p?.supplier);
      if (fromSignup) {
        setSupplier(fromSignup);
        setSupplierFromSignup(fromSignup);
      }
    }).catch(() => {});
  }, []);

  const toggleDevice = (k: DeviceKey) =>
    setDevices((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));

  const finish = async () => {
    setBusy(true); setError(null);
    try {
      await api.saveOnboarding({ devices, householdSize: size, supplier });
      onDone();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  if (step === 0) {
    return (
      <div className="auth-wrap">
        <div className="auth-card" style={{ width: 520 }}>
          <div className="brand-row"><div className="bolt">⚡</div><h1>Welcome to WattWatch</h1></div>
          <p className="subtitle">Before we start, here's why this matters.</p>

          <div style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
            {[
              ['⏱️', 'Prices change every half hour', 'From mid-2026 the five largest Irish suppliers must offer dynamic pricing. The cost of electricity moves throughout the day.'],
              ['💶', 'The gap is bigger than you think', 'The evening peak can cost more than double the overnight low. Shifting a few appliances captures most of that difference.'],
              ['🔔', 'We watch it so you do not have to', 'Set an alert once and we will tell you when it is cheap. No need to check the app.'],
            ].map(([icon, title, body]) => (
              <div key={title} style={{ display: 'flex', gap: 14 }}>
                <div style={{ fontSize: 26 }}>{icon}</div>
                <div>
                  <strong style={{ display: 'block', marginBottom: 3 }}>{title}</strong>
                  <span className="muted" style={{ lineHeight: 1.5 }}>{body}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
            Next we'll ask a couple of quick questions so the advice fits your home. We only use this to
            tailor recommendations.
          </p>
          <button className="btn block" onClick={() => setStep(1)}>Get started</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ width: 520 }}>
        <div className="brand-row"><div className="bolt">⚡</div><h1>Tell us about your home</h1></div>
        <p className="subtitle">
          {supplierFromSignup
            ? 'Two quick questions — your supplier is already saved from signup.'
            : 'Three quick questions. You can change these later in Settings.'}
        </p>
        {error && <div className="error-msg">{error}</div>}

        <div className="field">
          <label>Which of these do you have? (optional)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {DEVICE_OPTIONS.map((d) => {
              const on = devices.includes(d.key);
              return (
                <button key={d.key} onClick={() => toggleDevice(d.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px',
                    borderRadius: 12, border: `1.5px solid ${on ? 'var(--brand)' : 'var(--border)'}`,
                    background: on ? 'var(--brand-tint)' : 'var(--card)',
                    color: 'var(--ink)', fontSize: 14, textAlign: 'left',
                  }}>
                  <span style={{ fontSize: 20 }}>{d.icon}</span>{d.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label>How many people live there?</label>
          <div className="seg" style={{ width: '100%' }}>
            {HOUSEHOLD_SIZES.map((s) => (
              <button key={s} className={size === s ? 'on' : ''} style={{ flex: 1 }} onClick={() => setSize(s)}>{s}</button>
            ))}
          </div>
        </div>

        {supplierFromSignup ? (
          <div className="field">
            <label>Electricity supplier</label>
            <div
              style={{
                padding: '13px 14px',
                borderRadius: 12,
                border: '1.5px solid var(--border)',
                background: 'var(--brand-tint)',
                fontSize: 14,
              }}
            >
              <strong>{supplierFromSignup}</strong>
              <span className="muted" style={{ display: 'block', marginTop: 4, fontSize: 13 }}>
                Imported from your energy-switch signup. Change it anytime under My details.
              </span>
            </div>
          </div>
        ) : (
          <div className="field">
            <label>Who is your electricity supplier?</label>
            <select value={supplier ?? ''} onChange={(e) => setSupplier(e.target.value || null)}>
              <option value="">Select a supplier</option>
              {SUPPLIERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <button className="btn block" disabled={busy || !size} onClick={finish}>
          {busy ? 'Saving…' : 'Finish setup'}
        </button>
        <p className="auth-switch"><a onClick={finish} style={{ cursor: 'pointer' }}>Skip for now</a></p>
      </div>
    </div>
  );
}
