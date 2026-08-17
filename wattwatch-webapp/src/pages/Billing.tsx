import { useState } from 'react';
import { PLANS, INVOICES } from '../lib/data';

const TABS = ['Plan', 'Payments', 'Invoices'] as const;

export function Billing() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Plan');
  const [current, setCurrent] = useState('standard');
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <>
      <div className="page-head"><h1>Billing</h1><p>Your plan, payment methods and invoice history.</p></div>

      <div className="seg" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {msg && <div className="ok-msg">{msg}</div>}

      {tab === 'Plan' && (
        <div className="grid grid-3">
          {PLANS.map((p) => {
            const isCurrent = p.id === current;
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
                <button className={`btn block ${isCurrent ? 'ghost' : ''}`} disabled={isCurrent}
                  onClick={() => { setCurrent(p.id); setMsg(`You've switched to the ${p.name} plan.`); }}>
                  {isCurrent ? 'Current plan' : `Switch to ${p.name}`}
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
                <div style={{ width: 48, height: 32, borderRadius: 6, background: 'var(--brand-deep)', color: '#fff',
                              display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>VISA</div>
                <div>
                  <strong>Visa ending 4242</strong>
                  <div className="muted">Expires 09 / 2028</div>
                </div>
              </div>
              <span className="pill cheap">Default</span>
            </div>
            <button className="btn ghost" style={{ marginTop: 14 }}
              onClick={() => setMsg('Adding a payment method is not enabled in this prototype.')}>
              Add payment method
            </button>
          </div>

          <div className="card" style={{ maxWidth: 760 }}>
            <h3 style={{ marginBottom: 14 }}>Next payment</h3>
            <div className="list-row"><span className="muted">Amount</span><strong>€9.99</strong></div>
            <div className="list-row"><span className="muted">Date</span><strong>01 August 2026</strong></div>
            <div className="list-row"><span className="muted">Method</span><strong>Visa ending 4242</strong></div>
            <p className="src-note">Payments are illustrative in this prototype. No card is charged and no card details are stored.</p>
          </div>
        </>
      )}

      {tab === 'Invoices' && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Invoice history</h3>
          <table>
            <thead><tr><th>Invoice</th><th>Period</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {INVOICES.map((i) => (
                <tr key={i.id}>
                  <td>{i.id}</td><td>{i.period}</td><td>{i.date}</td><td>{i.amount}</td>
                  <td><span className="pill cheap">{i.status}</span></td>
                  <td><button className="btn ghost" onClick={() => setMsg(`Downloading ${i.id} is not enabled in this prototype.`)}>Download</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="src-note">Invoice history is illustrative for the prototype.</p>
        </div>
      )}
    </>
  );
}
