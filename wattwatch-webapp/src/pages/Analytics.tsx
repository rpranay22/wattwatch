import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatPrice } from '../lib/pricing';
import { api } from '../lib/api';

const RANGES = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const;

interface AnalyticsData {
  range: string;
  title: string;
  unit: string;
  labels: string[];
  data: number[];
  source: string;
  summary: { min: number; max: number; avg: number; minLabel: string; maxLabel: string };
}

export function Analytics() {
  const [range, setRange] = useState<(typeof RANGES)[number]>('Daily');
  const [series, setSeries] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getPriceAnalytics(range.toLowerCase())
      .then(setSeries)
      .catch((e: Error) => { setSeries(null); setError(e.message); })
      .finally(() => setLoading(false));
  }, [range]);

  const chartData = series?.labels.map((label, i) => ({ label, price: series.data[i] })) ?? [];
  const { min = 0, max = 0, avg = 0, minLabel = '—', maxLabel = '—' } = series?.summary ?? {};
  const rangeWord = range === 'Daily' ? 'today' : range === 'Weekly' ? 'the last 7 days' : range === 'Monthly' ? 'this month' : 'the last 12 weeks';

  return (
    <>
      <div className="page-head">
        <h1>Analytics</h1>
        <p>ENTSO-E day-ahead prices — same data as the dashboard and calendar.</p>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div className="seg">
          {RANGES.map((r) => (
            <button key={r} className={r === range ? 'on' : ''} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <div className="card kpi">
          <div className="label">Average {rangeWord}</div>
          <div className="value">{loading ? '…' : formatPrice(avg)}</div>
          <div className="sub">per kWh</div>
        </div>
        <div className="card kpi">
          <div className="label">Cheapest</div>
          <div className="value" style={{ color: 'var(--cheap)' }}>{loading ? '…' : formatPrice(min)}</div>
          <div className="sub">at {minLabel}</div>
        </div>
        <div className="card kpi">
          <div className="label">Peak</div>
          <div className="value" style={{ color: 'var(--expensive)' }}>{loading ? '…' : formatPrice(max)}</div>
          <div className="sub">at {maxLabel}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>{series?.title ?? 'Loading…'}</h3>
        {loading ? (
          <p className="muted" style={{ padding: '80px 0', textAlign: 'center' }}>Loading ENTSO-E prices…</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
              <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
              <YAxis stroke="var(--muted)" fontSize={12} tickFormatter={(v) => `€${v.toFixed(2)}`} domain={['auto', 'auto']} />
              <Tooltip
                formatter={(v: number) => [formatPrice(v), 'Price']}
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--ink)' }}
              />
              <Line type="monotone" dataKey="price" stroke="var(--brand)" strokeWidth={3} dot={{ r: 3, fill: 'var(--brand)' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
        {series?.source && <p className="src-note">Price source: {series.source}</p>}
      </div>

      {!loading && min > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>What this means</h3>
          <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.6 }}>
            Across {rangeWord}, the dearest point ({maxLabel}) runs about {(max / min).toFixed(1)}× the cheapest ({minLabel}).
            Shifting heavy use toward cheaper periods keeps your bill down.
          </p>
        </div>
      )}
    </>
  );
}
