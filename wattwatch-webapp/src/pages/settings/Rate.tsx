import { useState } from 'react';
import { api } from '../../lib/api';

export function Rate() {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!stars) { setError('Please choose a rating first.'); return; }
    setBusy(true); setError(null);
    try {
      // Feedback is recorded as a ticket so the team actually sees it.
      await api.createTicket(`App rating: ${stars} star${stars > 1 ? 's' : ''}`,
        comment.trim() || '(no comment left)', 'Feedback');
      setSent(true);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  if (sent) {
    return (
      <>
        <div className="page-head"><h1>Rate the app</h1></div>
        <div className="card" style={{ maxWidth: 560, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🙏</div>
          <h3 style={{ marginBottom: 8 }}>Thank you</h3>
          <p className="muted">Your feedback has been sent to the team. It genuinely helps shape what we build next.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-head"><h1>Rate the app</h1><p>How are we doing? Your feedback goes straight to the team.</p></div>
      <div className="card" style={{ maxWidth: 560 }}>
        {error && <div className="error-msg">{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '10px 0 22px' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setStars(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
              style={{ background: 'transparent', fontSize: 38, lineHeight: 1,
                       color: n <= (hover || stars) ? '#F5B301' : 'var(--border)' }}>★</button>
          ))}
        </div>
        <div className="field">
          <label>Anything you'd like to tell us? (optional)</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What works well, what could be better…" />
        </div>
        <button className="btn block" disabled={busy} onClick={submit}>{busy ? 'Sending…' : 'Send feedback'}</button>
      </div>
    </>
  );
}
