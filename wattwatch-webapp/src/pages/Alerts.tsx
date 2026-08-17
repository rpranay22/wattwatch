import { useState } from 'react';
import { api } from '../lib/api';
import { useAppData } from '../state/AppData';
import { formatPrice } from '../lib/pricing';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function Alerts() {
  const { alerts, refreshAlerts } = useAppData();
  const [kind, setKind] = useState<'price' | 'time'>('price');
  const [condition, setCondition] = useState<'below' | 'above'>('below');
  const [threshold, setThreshold] = useState('0.20');
  const [start, setStart] = useState('18:00');
  const [end, setEnd] = useState('18:30');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true); setError(null);
    try {
      const payload = kind === 'price'
        ? { name: `Price ${condition} ${formatPrice(parseFloat(threshold))}`, kind, condition, threshold: parseFloat(threshold), days: DAYS }
        : { name: `Reminder at ${start}`, kind, start, end, days: DAYS };
      await api.createAlert(payload);
      await refreshAlerts();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const toggle = async (id: string, enabled: boolean) => { await api.toggleAlert(id, !enabled); await refreshAlerts(); };
  const remove = async (id: string) => { await api.deleteAlert(id); await refreshAlerts(); };

  return (
    <>
      <div className="page-head"><h1>Alerts</h1><p>Get notified when prices are right — or ask the assistant to set one for you.</p></div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 14 }}>Create an alert</h3>
        {error && <div className="error-msg">{error}</div>}
        <div className="seg" style={{ marginBottom: 16 }}>
          <button className={kind === 'price' ? 'on' : ''} onClick={() => setKind('price')}>Price alert</button>
          <button className={kind === 'time' ? 'on' : ''} onClick={() => setKind('time')}>Time alert</button>
        </div>
        {kind === 'price' ? (
          <div className="grid grid-2">
            <div className="field">
              <label>Condition</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value as any)}>
                <option value="below">Price drops below</option>
                <option value="above">Price rises above</option>
              </select>
            </div>
            <div className="field">
              <label>Threshold (€/kWh)</label>
              <input type="number" step="0.01" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="grid grid-2">
            <div className="field"><label>Start</label><input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="field"><label>End</label><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
        )}
        <button className="btn" disabled={busy} onClick={create}>{busy ? 'Saving…' : 'Create alert'}</button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Your alerts</h3>
        {alerts.length === 0 && <p className="muted" style={{ padding: '16px 0' }}>No alerts yet. Create one above, or ask the assistant.</p>}
        {alerts.map((a) => (
          <div className="list-row" key={a.id}>
            <div>
              <strong>{a.name}</strong>
              <div className="muted">{a.kind === 'price' ? `When price is ${a.condition} ${formatPrice(a.threshold!)}` : `Daily at ${a.start}`}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost" onClick={() => toggle(a.id, a.enabled)}>{a.enabled ? 'Pause' : 'Resume'}</button>
              <button className="btn danger" onClick={() => remove(a.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
