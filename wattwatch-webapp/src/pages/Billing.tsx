import { useEffect, useState } from 'react';
import {
  PLANS, loadBillingState, saveBillingState, BillingInvoice, BillingState,
} from '../lib/data';

const TABS = ['Plan', 'Payments', 'Invoices'] as const;

function currentMonthKey() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

export function Billing() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Plan');
  const [billing, setBilling] = useState<BillingState>(() => loadBillingState());
  const [msg, setMsg] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    saveBillingState(billing);
  }, [billing]);

  const plan = PLANS.find((p) => p.id === billing.planId) ?? PLANS[1];
  const paidThisMonth = billing.paidMonth === currentMonthKey();
  const isFree = billing.planId === 'free';

  const switchPlan = (planId: string) => {
    setBilling((b) => ({
      ...b,
      planId,
      paidMonth: planId === 'free' ? b.paidMonth : null,
    }));
    const name = PLANS.find((p) => p.id === planId)?.name ?? planId;
    setMsg(planId === 'free'
      ? `You're on the ${name} plan.`
      : `${name} plan selected. Go to the Payments tab to pay for this month.`);
  };

  const payNow = () => {
    if (isFree) {
      setMsg('The Free plan has no charge.');
      return;
    }
    if (paidThisMonth) {
      setMsg('This month is already paid.');
      return;
    }

    setPaying(true);
    const now = new Date();
    const monthLabel = now.toLocaleDateString('en-IE', { month: 'long', year: 'numeric' });
    const invoice: BillingInvoice = {
      id: `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getTime()).slice(-4)}`,
      period: `${plan.name} — ${monthLabel}`,
      amount: plan.price,
      status: 'Paid',
      date: now.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' }),
      planName: plan.name,
    };

    setTimeout(() => {
      setBilling((b) => ({
        ...b,
        paidMonth: currentMonthKey(),
        invoices: [invoice, ...b.invoices],
      }));
      setPaying(false);
      setMsg(`Payment successful. Invoice ${invoice.id} has been generated.`);
      setTab('Invoices');
    }, 600);
  };

  return (
    <>
      <div className="page-head"><h1>Billing</h1><p>Your plan, payments and invoice history.</p></div>

      <div className="seg" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => { setTab(t); setMsg(null); }}>{t}</button>
        ))}
      </div>

      {msg && <div className="ok-msg">{msg}</div>}

      {tab === 'Plan' && (
        <div className="grid grid-3">
          {PLANS.map((p) => {
            const isCurrent = p.id === billing.planId;
            return (
              <div className="card" key={p.id} style={isCurrent ? { border: '2px solid var(--brand)' } : undefined}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3>{p.name}</h3>
                  {isCurrent && <span className="pill cheap">Your plan</span>}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 30, fontWeight: 800 }}>{p.price}</span>
                  <span className="muted"> /month</span>
                </div>
                <div style={{ marginBottom: 18 }}>
                  {p.features.map((f) => (
                    <div key={f.label} style={{ display: 'flex', gap: 9, padding: '5px 0', fontSize: 13.5 }}>
                      <span style={{ color: f.included ? 'var(--cheap)' : 'var(--border)' }}>{f.included ? '✓' : '✕'}</span>
                      <span style={{ color: f.included ? 'var(--ink)' : 'var(--muted)' }}>{f.label}</span>
                    </div>
                  ))}
                </div>
                <button
                  className={`btn block ${isCurrent ? 'ghost' : ''}`}
                  disabled={isCurrent}
                  onClick={() => switchPlan(p.id)}
                >
                  {isCurrent ? 'Current plan' : `Select ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'Payments' && (
        <>
          <div className="card" style={{ marginBottom: 16, maxWidth: 760 }}>
            <h3 style={{ marginBottom: 14 }}>Payment method</h3>
            <div className="list-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 48, height: 32, borderRadius: 6, background: 'var(--brand-deep)', color: '#fff',
                  display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700,
                }}>VISA</div>
                <div>
                  <strong>Visa ending 4242</strong>
                  <div className="muted">Expires 09 / 2028</div>
                </div>
              </div>
              <span className="pill cheap">Default</span>
            </div>
          </div>

          <div className="card" style={{ maxWidth: 760 }}>
            <h3 style={{ marginBottom: 14 }}>Pay for your plan</h3>
            <div className="list-row"><span className="muted">Plan</span><strong>{plan.name}</strong></div>
            <div className="list-row"><span className="muted">Amount</span><strong>{plan.price}{isFree ? '' : ' / month'}</strong></div>
            <div className="list-row">
              <span className="muted">Status</span>
              {isFree ? (
                <span className="pill cheap">No payment needed</span>
              ) : paidThisMonth ? (
                <span className="pill cheap">Paid this month</span>
              ) : (
                <span className="pill moderate">Payment due</span>
              )}
            </div>

            {!isFree && (
              <button
                className="btn"
                style={{ marginTop: 16 }}
                disabled={paying || paidThisMonth}
                onClick={payNow}
              >
                {paying ? 'Processing…' : paidThisMonth ? 'Paid' : `Pay ${plan.price}`}
              </button>
            )}

            <p className="src-note" style={{ marginTop: 14 }}>
              Demo only — no card is charged. Paying generates a fake invoice in the Invoices tab.
            </p>
          </div>
        </>
      )}

      {tab === 'Invoices' && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Invoice history</h3>
          {billing.invoices.length === 0 ? (
            <p className="muted">No invoices yet. Pay for your plan in the Payments tab.</p>
          ) : (
            <table>
              <thead><tr><th>Invoice</th><th>Period</th><th>Plan</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {billing.invoices.map((i) => (
                  <tr key={i.id}>
                    <td>{i.id}</td>
                    <td>{i.period}</td>
                    <td>{i.planName}</td>
                    <td>{i.date}</td>
                    <td>{i.amount}</td>
                    <td><span className={`pill ${i.status === 'Paid' ? 'cheap' : 'moderate'}`}>{i.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
