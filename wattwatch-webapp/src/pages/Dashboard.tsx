import { useEffect, useMemo, useState } from 'react';
import {
  slotFor, slotLabel, tierLabel, formatPrice, formatEuro,
  cheapestWindow, dayStats, usageAdvice, isLiveEntsoSource,
} from '../lib/pricing';
import { useAppData } from '../state/AppData';
import { api, SavingsPeriod } from '../lib/api';

function SavingsCard({ label, period }: { label: string; period: SavingsPeriod | null }) {
  if (!period) {
    return (
      <div className="card kpi savings-card">
        <div className="label">{label}</div>
        <div className="value muted">—</div>
        <div className="sub">Loading…</div>
      </div>
    );
  }
  return (
    <div className="card kpi savings-card">
      <div className="label">{label}</div>
      <div className="value savings-amt">{formatEuro(period.saved)}</div>
      <div className="sub">
        {period.pct > 0 ? `${period.pct}% vs peak rate` : 'Shift loads to cheap windows to save'}
      </div>
      <div className="savings-detail muted">
        Paid {formatEuro(period.actualCost)} · would be {formatEuro(period.baselineCost)} at peak
      </div>
    </div>
  );
}

export function Dashboard() {
  const { priceSource, priceTick } = useAppData();
  const [minuteTick, setMinuteTick] = useState(0);
  const now = useMemo(() => slotFor(), [minuteTick]);
  const advice = useMemo(() => usageAdvice(now), [now, priceTick]);
  const { min, max, avg } = useMemo(() => dayStats(), [now, priceTick]);
  const win = useMemo(() => cheapestWindow(now, 6), [now, priceTick]);
  const live = isLiveEntsoSource(priceSource);

  const [savings, setSavings] = useState<{
    today: SavingsPeriod;
    week: SavingsPeriod;
    month: SavingsPeriod;
    basis: string;
  } | null>(null);

  useEffect(() => {
    api.getSavings().then(setSavings).catch(() => {});
  }, [priceTick]);

  useEffect(() => {
    const id = setInterval(() => setMinuteTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const ringColor = advice.tier === 'cheap' ? 'var(--cheap)' : advice.tier === 'moderate' ? 'var(--moderate)' : 'var(--expensive)';
  const tint = advice.tier === 'cheap' ? 'var(--cheap-tint)' : advice.tier === 'moderate' ? 'var(--moderate-tint)' : 'var(--expensive-tint)';

  return (
    <>
      <div className="page-head">
        <h1>Good to see you</h1>
        <p>Live electricity prices for Ireland — updated from today's day-ahead market.</p>
      </div>

      {live ? (
        <div className="live-banner" role="status">
          <span className="live-dot" aria-hidden />
          <div>
            <strong>Live market data</strong>
            <span>Price source: ENTSO-E day-ahead (live)</span>
          </div>
        </div>
      ) : (
        <div className="live-banner simulated" role="status">
          <div>
            <strong>Estimated prices</strong>
            <span>{priceSource} — connect ENTSO_E_TOKEN on the API for live ENTSO-E data</span>
          </div>
        </div>
      )}

      <div className="card usage-card" style={{ marginBottom: 16 }}>
        <div className="usage-verdict-row">
          <span className={`pill ${advice.tier}`}>{advice.verdictLabel}</span>
          <span className="usage-time">Now · {slotLabel(now)}</span>
        </div>

        <div className="price-hero" style={{ marginTop: 14 }}>
          <div className="price-ring" style={{ background: tint }}>
            <div style={{ textAlign: 'center' }}>
              <div className="amt" style={{ color: ringColor }}>{formatPrice(advice.price)}</div>
              <div className="muted">per kWh now</div>
            </div>
          </div>
          <div className="usage-copy">
            <h2 className="usage-headline">{advice.headline}</h2>
            <p className="usage-action">{advice.action}</p>
            <p className="usage-basis">
              <strong>Why?</strong> {advice.basis}
              {advice.nextChange && advice.verdict !== 'good' && (
                <> Cheaper tier from {advice.nextChange.label}.</>
              )}
            </p>
          </div>
        </div>
      </div>

      <h2 className="section-title">Your savings with WattWatch</h2>
      <p className="section-sub muted">By using cheaper windows instead of peak-rate times.</p>
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <SavingsCard label="Today" period={savings?.today ?? null} />
        <SavingsCard label="This week" period={savings?.week ?? null} />
        <SavingsCard label="This month" period={savings?.month ?? null} />
      </div>

      <div className="grid grid-3">
        <div className="card kpi">
          <div className="label">Today's average</div>
          <div className="value">{formatPrice(avg)}</div>
          <div className="sub">across all half-hours</div>
        </div>
        <div className="card kpi">
          <div className="label">Cheapest window</div>
          <div className="value" style={{ color: 'var(--cheap)', fontSize: 22 }}>{win.label}</div>
          <div className="sub">averaging {formatPrice(win.avg)}</div>
        </div>
        <div className="card kpi">
          <div className="label">Today's range</div>
          <div className="value" style={{ fontSize: 22 }}>{formatPrice(min)}–{formatPrice(max)}</div>
          <div className="sub">low to peak · {tierLabel(advice.tier)} now</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>How savings are calculated</h3>
        <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>
          {savings?.basis ?? 'We compare what you actually paid to what the same usage would cost at the day\'s peak rate.'}
          {' '}Each day we use your kWh from the calendar, your real cost, and that day's peak price from ENTSO-E.
          The difference is money saved by timing dishwasher, EV, and heating toward cheap windows.
        </p>
      </div>
    </>
  );
}
