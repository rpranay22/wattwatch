import { slotFor, slotLabel, priceAt, tierFor, tierLabel, formatPrice, cheapestWindow, dayStats } from '../lib/pricing';
import { useAppData } from '../state/AppData';

export function Dashboard() {
  const { priceSource } = useAppData();
  const now = slotFor();
  const price = priceAt(now);
  const tier = tierFor(price);
  const { min, max, avg } = dayStats();
  const win = cheapestWindow(now, 6);

  const ringColor = tier === 'cheap' ? 'var(--cheap)' : tier === 'moderate' ? 'var(--moderate)' : 'var(--expensive)';
  const tint = tier === 'cheap' ? 'var(--cheap-tint)' : tier === 'moderate' ? 'var(--moderate-tint)' : 'var(--expensive-tint)';

  return (
    <>
      <div className="page-head">
        <h1>Good to see you</h1>
        <p>Here's the electricity price picture right now.</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="price-hero">
          <div className="price-ring" style={{ background: tint }}>
            <div style={{ textAlign: 'center' }}>
              <div className="amt" style={{ color: ringColor }}>{formatPrice(price)}</div>
              <div className="muted">per kWh</div>
            </div>
          </div>
          <div>
            <span className={`pill ${tier}`}>{tierLabel(tier)} right now</span>
            <h2 style={{ margin: '10px 0 4px', fontSize: 22 }}>
              {tier === 'cheap' ? 'Great time to use electricity' : tier === 'moderate' ? 'Average pricing right now' : 'Hold off if you can'}
            </h2>
            <p className="muted">It's currently {slotLabel(now)}. {tier === 'expensive' ? `Cheapest window coming up: ${win.label}.` : `You're paying below today's peak of ${formatPrice(max)}.`}</p>
          </div>
        </div>
        <p className="src-note">Price source: {priceSource}</p>
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
          <div className="sub">low to peak</div>
        </div>
      </div>
    </>
  );
}
