import { useState } from 'react';
import { FAQS } from '../lib/data';

export function Help() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      <div className="page-head"><h1>Help centre</h1><p>Answers to the questions we get most often.</p></div>

      <div className="card" style={{ marginBottom: 16 }}>
        {FAQS.map((f, i) => (
          <div key={f.q} style={{ borderBottom: i < FAQS.length - 1 ? '1px solid var(--divider)' : 'none' }}>
            <button onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                       padding: '16px 0', background: 'transparent', color: 'var(--ink)', fontSize: 15, fontWeight: 600, textAlign: 'left' }}>
              {f.q}
              <span className="muted" style={{ fontSize: 20 }}>{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <p className="muted" style={{ paddingBottom: 16, lineHeight: 1.6, fontSize: 14.5 }}>{f.a}</p>}
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Still stuck?</h3>
        <p className="muted" style={{ marginBottom: 14 }}>
          Raise a ticket on the Support page and our team will get back to you. You can also ask the
          assistant (bottom-right) — it can explain features and set alerts for you.
        </p>
      </div>
    </>
  );
}
