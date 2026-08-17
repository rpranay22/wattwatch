import { useState } from 'react';
import { api } from '../../lib/api';

export function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null); setError(null);
    if (next.length < 8) { setError('Your new password must be at least 8 characters.'); return; }
    if (next !== confirm) { setError('The two new passwords do not match.'); return; }
    setBusy(true);
    try {
      await api.changePassword(current, next);
      setMsg('Your password has been changed.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="page-head"><h1>Change password</h1><p>Use a password you don't use anywhere else.</p></div>
      <form className="card" style={{ maxWidth: 520 }} onSubmit={submit}>
        {msg && <div className="ok-msg">{msg}</div>}
        {error && <div className="error-msg">{error}</div>}
        <div className="field"><label>Current password</label>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></div>
        <div className="field"><label>New password</label>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
          <p className="muted" style={{ marginTop: 6 }}>At least 8 characters.</p></div>
        <div className="field"><label>Confirm new password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
        <button className="btn" disabled={busy}>{busy ? 'Changing…' : 'Change password'}</button>
      </form>
    </>
  );
}
