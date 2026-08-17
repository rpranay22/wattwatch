import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

export function Signup() {
  const { signUp } = useAuth();
  const nav = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setBusy(true);
    try { await signUp(email.trim(), password, fullName.trim() || undefined); nav('/'); }
    catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand-row">
          <div className="bolt">⚡</div>
          <h1>WattWatch</h1>
        </div>
        <p className="subtitle">Create your account to start saving on electricity.</p>
        {error && <div className="error-msg">{error}</div>}
        <div className="field">
          <label>Full name (optional)</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <p className="muted" style={{ marginTop: 6 }}>At least 8 characters.</p>
        </div>
        <button className="btn block" disabled={busy || !email || !password}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
