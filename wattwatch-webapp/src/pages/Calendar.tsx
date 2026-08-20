import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatPrice, priceBandCss } from '../lib/pricing';

interface DayUsage { day: string; kwh: number; cost: number; avg_price: number; peak_price: number; low_price: number; best_window: string; }
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

export function Calendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<DayUsage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getUsage(`${year}-${String(month).padStart(2, '0')}`)
      .then((res: any) => { setDays(res.days ?? []); const last = res.days?.[res.days.length - 1]; setSelected(last?.day ?? null); })
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  }, [year, month]);

  const byDay = new Map(days.map((d) => [d.day, d]));
  const sel = selected ? byDay.get(selected) : undefined;
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const iso = (d: number) => `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const changeMonth = (delta: number) => { let m = month + delta, y = year; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } setMonth(m); setYear(y); };

  return (
    <>
      <div className="page-head"><h1>Usage Calendar</h1><p>Daily usage with ENTSO-E day-ahead prices — same source as the dashboard.</p></div>
      <div className="grid grid-2">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <button className="btn ghost" onClick={() => changeMonth(-1)}>‹</button>
            <strong>{MONTHS[month - 1]} {year}</strong>
            <button className="btn ghost" onClick={() => changeMonth(1)}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, textAlign: 'center' }}>
            {WEEKDAYS.map((w) => <div key={w} className="muted" style={{ fontSize: 12, padding: 4 }}>{w}</div>)}
            {loading ? <div style={{ gridColumn: '1/8', padding: 30 }} className="muted">Loading…</div> :
              cells.map((d, i) => {
                if (d === null) return <div key={`b${i}`} />;
                const u = byDay.get(iso(d));
                const on = selected === iso(d);
                return (
                  <button key={d} onClick={() => u && setSelected(iso(d))} disabled={!u}
                    style={{ aspectRatio: '1', borderRadius: 10, background: on ? 'var(--brand-tint)' : 'transparent', display: 'grid', placeItems: 'center', gap: 3, cursor: u ? 'pointer' : 'default' }}>
                    <span style={{ fontSize: 13, color: u ? 'var(--ink)' : 'var(--border)' }}>{d}</span>
                    {u && <span style={{ width: 6, height: 6, borderRadius: 3, background: priceBandCss(u.avg_price) }} />}
                  </button>
                );
              })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 16 }}>
            {[['Low', 'var(--cheap)'], ['Mid', 'var(--moderate)'], ['High', 'var(--expensive)']].map(([l, c]) => (
              <span key={l} className="muted" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: c }} /> {l}
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          {sel ? (
            <>
              <h3 style={{ marginBottom: 14 }}>{new Date(sel.day).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              {[['Consumed', `${sel.kwh} kWh`], ['Total cost', `€${sel.cost.toFixed(2)}`], ['Average price', formatPrice(sel.avg_price)], ['Peak price', formatPrice(sel.peak_price)], ['Lowest price', formatPrice(sel.low_price)], ['Best window', sel.best_window]].map(([k, v]) => (
                <div className="list-row" key={k}><span className="muted">{k}</span><strong>{v}</strong></div>
              ))}
            </>
          ) : <p className="muted" style={{ padding: '20px 0' }}>Select a highlighted day to see its breakdown.</p>}
        </div>
      </div>
    </>
  );
}
