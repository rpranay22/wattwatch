import { DEVICES } from '../lib/data';

export function Devices() {
  const totalKwh = DEVICES.reduce((a, d) => a + d.kwh, 0);
  const saved = DEVICES.filter((d) => d.cost < 0).reduce((a, d) => a + Math.abs(d.cost), 0);
  const spent = DEVICES.filter((d) => d.cost > 0).reduce((a, d) => a + d.cost, 0);

  return (
    <>
      <div className="page-head">
        <h1>Devices</h1>
        <p>What's using electricity in your home today.</p>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <div className="card kpi"><div className="label">Used today</div><div className="value">{totalKwh.toFixed(1)}</div><div className="sub">kWh across all devices</div></div>
        <div className="card kpi"><div className="label">Saved by shifting</div><div className="value" style={{ color: 'var(--cheap)' }}>€{saved.toFixed(2)}</div><div className="sub">vs running at peak</div></div>
        <div className="card kpi"><div className="label">Spent today</div><div className="value">€{spent.toFixed(2)}</div><div className="sub">on active devices</div></div>
      </div>

      <div className="grid grid-2">
        {DEVICES.map((d) => {
          const color = d.tone === 'cheap' ? 'var(--cheap)' : d.tone === 'moderate' ? 'var(--moderate)' : 'var(--expensive)';
          const tint = d.tone === 'cheap' ? 'var(--cheap-tint)' : d.tone === 'moderate' ? 'var(--moderate-tint)' : 'var(--expensive-tint)';
          return (
            <div className="card" key={d.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: tint, display: 'grid', placeItems: 'center', fontSize: 22 }}>{d.icon}</div>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block' }}>{d.name}</strong>
                  <span className="muted">{d.brand}</span>
                </div>
                <span className={`pill ${d.tone}`}>{d.status}</span>
              </div>
              <div style={{ height: 7, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${d.progress * 100}%`, background: color, borderRadius: 4 }} />
              </div>
              <p className="muted" style={{ marginBottom: 10 }}>{d.detail}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span className="muted">{d.kwh} kWh today</span>
                <strong style={{ color: d.cost < 0 ? 'var(--cheap)' : 'var(--ink)' }}>
                  {d.cost < 0 ? `Saved €${Math.abs(d.cost).toFixed(2)}` : `€${d.cost.toFixed(2)}`}
                </strong>
              </div>
            </div>
          );
        })}
      </div>

      <p className="src-note">
        Device figures are illustrative. Connecting real smart-plug or meter data would replace these with live readings.
      </p>
    </>
  );
}
