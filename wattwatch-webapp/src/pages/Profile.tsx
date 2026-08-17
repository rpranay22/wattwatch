import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { SUPPLIERS } from '../lib/data';
import { useAuth } from '../state/AuthContext';

export function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    fullName: '', phone: '', mprn: '', address: '', city: '', eircode: '', supplier: '',
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getProfile().then((p: any) => {
      if (p) setForm({
        fullName: p.full_name ?? '', phone: p.phone ?? '', mprn: p.mprn ?? '',
        address: p.address ?? '', city: p.city ?? '', eircode: p.eircode ?? '',
        supplier: p.supplier ?? '',
      });
    }).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true); setMsg(null); setError(null);
    try { await api.saveProfile(form); setMsg('Your details have been saved.'); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="page-head"><h1>My details</h1><p>Keep your account and supply information up to date.</p></div>

      <div className="card" style={{ maxWidth: 720 }}>
        {msg && <div className="ok-msg">{msg}</div>}
        {error && <div className="error-msg">{error}</div>}

        <div className="field">
          <label>Email (sign-in address)</label>
          <input value={user?.email ?? ''} disabled style={{ opacity: .65 }} />
        </div>

        <div className="grid grid-2">
          <div className="field"><label>Full name</label><input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} /></div>
          <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
        </div>

        <div className="field"><label>Address</label><input value={form.address} onChange={(e) => set('address', e.target.value)} /></div>

        <div className="grid grid-2">
          <div className="field"><label>City / Town</label><input value={form.city} onChange={(e) => set('city', e.target.value)} /></div>
          <div className="field"><label>Eircode</label><input value={form.eircode} onChange={(e) => set('eircode', e.target.value)} /></div>
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label>MPRN <span className="muted" style={{ textTransform: 'none' }}>(on your bill)</span></label>
            <input value={form.mprn} onChange={(e) => set('mprn', e.target.value)} />
          </div>
          <div className="field">
            <label>Supplier</label>
            <select value={form.supplier} onChange={(e) => set('supplier', e.target.value)}>
              <option value="">Select a supplier</option>
              {SUPPLIERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <button className="btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save details'}</button>
      </div>
    </>
  );
}
