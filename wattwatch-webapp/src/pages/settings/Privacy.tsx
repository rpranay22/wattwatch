import { useEffect, useState } from 'react';

export function Privacy() {
  const [privacy, setPrivacy] = useState({ analytics: true, marketing: false, personalisation: true });
  useEffect(() => {
    const saved = localStorage.getItem('ww_privacy');
    if (saved) { try { setPrivacy(JSON.parse(saved)); } catch {} }
  }, []);
  const set = (k: string, v: boolean) => {
    const next = { ...privacy, [k]: v };
    setPrivacy(next); localStorage.setItem('ww_privacy', JSON.stringify(next));
  };

  return (
    <>
      <div className="page-head"><h1>Privacy & data</h1><p>What we collect and what you can control.</p></div>

      <div className="card" style={{ marginBottom: 16, maxWidth: 760 }}>
        <h3 style={{ marginBottom: 12 }}>Your choices</h3>
        {[
          ['analytics', 'Usage analytics', 'Share anonymous usage data to help improve WattWatch.'],
          ['personalisation', 'Personalised advice', 'Use your home details to tailor recommendations.'],
          ['marketing', 'Product updates', 'Occasional emails about new features. Off by default.'],
        ].map(([key, title, desc]) => (
          <div className="list-row" key={key}>
            <div><strong>{title}</strong><div className="muted">{desc}</div></div>
            <button className={`btn ${(privacy as any)[key] ? '' : 'ghost'}`} onClick={() => set(key, !(privacy as any)[key])}>
              {(privacy as any)[key] ? 'On' : 'Off'}
            </button>
          </div>
        ))}
      </div>

      <div className="card" style={{ maxWidth: 760 }}>
        <h3 style={{ marginBottom: 10 }}>What we store</h3>
        <div className="muted" style={{ lineHeight: 1.7, fontSize: 14.5 }}>
          <p style={{ marginBottom: 10 }}><strong style={{ color: 'var(--ink)' }}>Account:</strong> your email address and a securely hashed password. We never store your password in readable form.</p>
          <p style={{ marginBottom: 10 }}><strong style={{ color: 'var(--ink)' }}>Home details:</strong> the information you enter under My details — name, phone, address, Eircode, MPRN and supplier. Used to tailor advice and to help support answer your questions.</p>
          <p style={{ marginBottom: 10 }}><strong style={{ color: 'var(--ink)' }}>Activity:</strong> your alerts, support tickets and export requests.</p>
          <p><strong style={{ color: 'var(--ink)' }}>Your rights:</strong> you can download everything we hold from Download data, and permanently remove it from Delete account.</p>
        </div>
      </div>
    </>
  );
}
