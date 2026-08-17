import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function Support() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.listTickets().then(setTickets).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!subject.trim() || !body.trim()) return;
    setBusy(true); setError(null); setMsg(null);
    try { await api.createTicket(subject, body, 'General'); setMsg('Ticket submitted. Our team will reply soon.'); setSubject(''); setBody(''); await load(); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="page-head"><h1>Support</h1><p>Raise a question and track its status.</p></div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 14 }}>New ticket</h3>
        {msg && <div className="ok-msg">{msg}</div>}
        {error && <div className="error-msg">{error}</div>}
        <div className="field"><label>Subject</label><input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
        <div className="field"><label>Message</label><textarea value={body} onChange={(e) => setBody(e.target.value)} /></div>
        <button className="btn" disabled={busy} onClick={submit}>{busy ? 'Sending…' : 'Submit ticket'}</button>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Your tickets</h3>
        {tickets.length === 0 && <p className="muted" style={{ padding: '16px 0' }}>No tickets yet.</p>}
        {tickets.map((t) => (
          <div className="list-row" key={t.id}>
            <div><strong>{t.subject}</strong><div className="muted">{t.admin_reply ? `Reply: ${t.admin_reply}` : 'Awaiting response'}</div></div>
            <span className={`pill ${t.status === 'resolved' ? 'cheap' : t.status === 'in_progress' ? 'moderate' : 'expensive'}`}>{String(t.status).replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </>
  );
}
