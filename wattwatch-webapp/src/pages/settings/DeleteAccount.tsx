import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../state/AuthContext';

export function DeleteAccount() {
  const { signOut } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const doDelete = async () => {
    setBusy(true); setError(null);
    try { await api.deleteAccount(password); signOut(); }
    catch (e: any) { setError(e.message); setBusy(false); }
  };

  return (
    <>
      <div className="page-head"><h1>Delete account</h1><p>Permanently remove your account and all its data.</p></div>

      <div className="card" style={{ maxWidth: 560, border: '1px solid var(--expensive)' }}>
        <h3 style={{ marginBottom: 10, color: 'var(--expensive)' }}>This cannot be undone</h3>
        <p className="muted" style={{ lineHeight: 1.65, marginBottom: 16 }}>
          Deleting your account permanently removes your profile, home details, alerts, support
          tickets and export requests. You will not be able to recover any of it.
        </p>
        <p className="muted" style={{ marginBottom: 18 }}>
          If you only want a copy of your information, use <strong style={{ color: 'var(--ink)' }}>Download data</strong> first.
        </p>

        {error && <div className="error-msg">{error}</div>}

        {!confirmOpen ? (
          <button className="btn danger" onClick={() => setConfirmOpen(true)}>Delete my account</button>
        ) : (
          <>
            <div className="field">
              <label>Enter your password to confirm</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn danger" disabled={busy || !password} onClick={doDelete}>
                {busy ? 'Deleting…' : 'Permanently delete'}
              </button>
              <button className="btn ghost" onClick={() => { setConfirmOpen(false); setPassword(''); setError(null); }}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
