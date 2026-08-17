import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { seriesForRange, rangeStats, formatPrice } from '../lib/pricing';
import { useAppData } from '../state/AppData';

const RANGES = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const;

export function Analytics() {
  const { priceSource } = useAppData();
  const [range, setRange] = useState<(typeof RANGES)[number]>('Daily');
  const series = seriesForRange(range);
  const { min, max, avg, minLabel, maxLabel } = rangeStats(series);

  const data = series.labels.map((label, i) => ({ label, price: series.data[i] }));
  const rangeWord = range === 'Daily' ? 'today' : range === 'Weekly' ? 'this week' : range === 'Monthly' ? 'this month' : 'this year';

  return (
    <>
      <div className="page-head">
        <h1>Analytics</h1>
        <p>How electricity prices move across time.</p>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div className="seg">
          {RANGES.map((r) => (
            <button key={r} className={r === range ? 'on' : ''} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <div className="card kpi"><div className="label">Average {rangeWord}</div><div className="value">{formatPrice(avg)}</div><div className="sub">per kWh</div></div>
        <div className="card kpi"><div className="label">Cheapest</div><div className="value" style={{ color: 'var(--cheap)' }}>{formatPrice(min)}</div><div className="sub">at {minLabel}</div></div>
        <div className="card kpi"><div className="label">Peak</div><div className="value" style={{ color: 'var(--expensive)' }}>{formatPrice(max)}</div><div className="sub">at {maxLabel}</div></div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>{series.title}</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
            <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
            <YAxis stroke="var(--muted)" fontSize={12} tickFormatter={(v) => `€${v.toFixed(2)}`} />
            <Tooltip formatter={(v: number) => [formatPrice(v), 'Price']} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--ink)' }} />
            <Line type="monotone" dataKey="price" stroke="var(--brand)" strokeWidth={3} dot={{ r: 3, fill: 'var(--brand)' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
        <p className="src-note">Price source: {priceSource}</p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>What this means</h3>
        <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.6 }}>
          Across {rangeWord}, the dearest point ({maxLabel}) runs about {(max / min).toFixed(1)}× the cheapest ({minLabel}).
          Shifting heavy use — dishwasher, washing machine, EV charging — toward the cheaper points keeps your bill down.
        </p>
      </div>
    </>
  );
}
