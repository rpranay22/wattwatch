import {
  slotFor, slotLabel, tierLabel, formatPrice,
  cheapestWindow, dayStats, usageAdvice, isLiveEntsoSource,
} from '../lib/pricing';
import { useAppData } from '../state/AppData';

export function Dashboard() {
  const { priceSource } = useAppData();
  const now = slotFor();
  const advice = usageAdvice(now);
  const { min, max, avg } = dayStats();
  const win = cheapestWindow(now, 6);
  const live = isLiveEntsoSource(priceSource);

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
        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>How we decide</h3>
        <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>
          Prices come from {live ? 'ENTSO-E day-ahead auction data for Ireland (SEM)' : 'a realistic estimate curve'}.
          We split each day into 48 half-hour slots and label each as{' '}
          <span className="pill cheap" style={{ fontSize: 11 }}>CHEAP</span>{' '}
          under €0.20/kWh,{' '}
          <span className="pill moderate" style={{ fontSize: 11 }}>MODERATE</span>{' '}
          €0.20–€0.28, or{' '}
          <span className="pill expensive" style={{ fontSize: 11 }}>EXPENSIVE</span>{' '}
          above €0.28 — then compare your current slot to today's average.
        </p>
      </div>
    </>
  );
}
