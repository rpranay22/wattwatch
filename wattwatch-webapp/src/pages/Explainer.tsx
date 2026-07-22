import { hourlyAverages, formatPrice, dayStats, cheapestWindow, slotFor } from '../lib/pricing';

export function Explainer() {
  const { min, max, avg } = dayStats();
  const win = cheapestWindow(slotFor(), 6);
  const hours = hourlyAverages();
  const peakHour = hours.indexOf(Math.max(...hours));
  const lowHour = hours.indexOf(Math.min(...hours));

  return (
    <>
      <div className="page-head"><h1>How dynamic pricing works</h1><p>The short version, and what to do about it.</p></div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 10 }}>The basic idea</h3>
        <p className="muted" style={{ lineHeight: 1.65, fontSize: 14.5 }}>
          With a flat tariff you pay the same rate whatever time you use electricity. With dynamic
          pricing the rate changes every half hour, following the wholesale market. When wind
          generation is high and demand is low — usually in the small hours — electricity is cheap.
          During the evening, when everyone gets home and switches things on, it costs considerably more.
        </p>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <div className="card kpi"><div className="label">Today's cheapest</div><div className="value" style={{ color: 'var(--cheap)' }}>{formatPrice(min)}</div><div className="sub">around {String(lowHour).padStart(2, '0')}:00</div></div>
        <div className="card kpi"><div className="label">Today's peak</div><div className="value" style={{ color: 'var(--expensive)' }}>{formatPrice(max)}</div><div className="sub">around {String(peakHour).padStart(2, '0')}:00</div></div>
        <div className="card kpi"><div className="label">The gap</div><div className="value">{(max / min).toFixed(1)}×</div><div className="sub">peak vs cheapest</div></div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>What to shift, and when</h3>
        {[
          ['🚗', 'EV charging', 'The single biggest win. An overnight charge instead of an evening one can save several euro a session.'],
          ['🧺', 'Washing machine', 'Most machines have a delay timer. Set it for the cheap window before you go to bed.'],
          ['🍽️', 'Dishwasher', 'Same idea — load it after dinner but let it run overnight.'],
          ['🌡️', 'Heating and hot water', 'If you have a heat pump or immersion, pre-heating during the cheap window costs less than heating on demand at peak.'],
        ].map(([icon, title, body]) => (
          <div className="list-row" key={title}>
            <div style={{ display: 'flex', gap: 13 }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <div><strong>{title}</strong><div className="muted" style={{ lineHeight: 1.5 }}>{body}</div></div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Right now</h3>
        <p className="muted" style={{ lineHeight: 1.65, fontSize: 14.5 }}>
          Today's average is {formatPrice(avg)} per kWh. The cheapest upcoming window is{' '}
          <strong style={{ color: 'var(--cheap)' }}>{win.label}</strong>, averaging {formatPrice(win.avg)}.
          If you have anything flexible to run, that's the moment. Set an alert on the Alerts page
          and we'll remind you — or just ask the assistant.
        </p>
      </div>
    </>
  );
}
