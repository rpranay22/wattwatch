import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function DownloadData() {
  const [exports, setExports] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.listExports().then(setExports).catch(() => {});
  useEffect(() => { load(); }, []);

  const request = async (format: 'pdf' | 'csv' | 'json') => {
    setMsg(null); setError(null);
    try {
      await api.requestExport(format, 'all');
      setMsg(`Your ${format.toUpperCase()} export has been requested. It will appear below.`);
      load();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <>
      <div className="page-head"><h1>Download data</h1><p>Request a copy of everything WattWatch holds about you.</p></div>

      <div className="card" style={{ marginBottom: 16, maxWidth: 760 }}>
        <h3 style={{ marginBottom: 8 }}>Request an export</h3>
        <p className="muted" style={{ marginBottom: 16 }}>
          Includes your profile, home details, alerts, support tickets and usage history.
        </p>
        {msg && <div className="ok-msg">{msg}</div>}
        {error && <div className="error-msg">{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost" onClick={() => request('pdf')}>📄 PDF</button>
          <button className="btn ghost" onClick={() => request('csv')}>📊 CSV</button>
          <button className="btn ghost" onClick={() => request('json')}>{'{ }'} JSON</button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 760 }}>
        <h3 style={{ marginBottom: 12 }}>Your requests</h3>
        {exports.length === 0 ? <p className="muted">No exports requested yet.</p> : (
          <table>
            <thead><tr><th>Format</th><th>Requested</th><th>Status</th></tr></thead>
            <tbody>
              {exports.map((e) => (
                <tr key={e.id}>
                  <td>{String(e.format).toUpperCase()}</td>
                  <td>{new Date(e.created_at).toLocaleString('en-IE')}</td>
                  <td><span className={`pill ${e.status === 'ready' ? 'cheap' : 'moderate'}`}>{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="src-note">Requests are recorded now; file generation is planned for a later release.</p>
      </div>
    </>
  );
}
