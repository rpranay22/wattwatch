import { useCallback, useEffect, useRef, useState } from 'react';
import { api, TicketMessageRow, TicketRow } from '../lib/api';

function statusPill(status: string) {
  if (status === 'resolved') return 'cheap';
  if (status === 'in_progress') return 'moderate';
  return 'expensive';
}

function TicketChatPanel({
  ticket,
  onClose,
  onUpdate,
}: {
  ticket: TicketRow;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [messages, setMessages] = useState<TicketMessageRow[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getTicketMessages(ticket.id);
      setMessages(data.messages);
      onUpdate();
    } catch (e: any) {
      setError(e.message);
    }
  }, [ticket.id, onUpdate]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 15000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    threadRef.current?.scrollTo(0, threadRef.current.scrollHeight);
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.sendTicketMessage(ticket.id, text);
      setDraft('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ticket-chat-panel">
      <div className="ticket-chat-head">
        <div>
          <strong>{ticket.subject}</strong>
          <div className="muted" style={{ fontSize: 12 }}>
            {String(ticket.status).replace(/_/g, ' ')}
          </div>
        </div>
        <button type="button" className="ticket-chat-close" onClick={onClose} aria-label="Close chat">✕</button>
      </div>

      <div className="ticket-chat-thread" ref={threadRef}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`ticket-chat-bubble ${m.sender_role === 'customer' ? 'mine' : 'theirs'}`}
          >
            <div className="ticket-chat-meta">
              {m.sender_name || (m.sender_role === 'customer' ? 'You' : 'Support')}
              {' · '}
              {new Date(m.created_at).toLocaleString('en-IE', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </div>
            <div>{m.body}</div>
          </div>
        ))}
        {!messages.length && <p className="muted">No messages yet.</p>}
      </div>

      {error && <div className="error-msg" style={{ margin: '0 12px 8px' }}>{error}</div>}

      <div className="ticket-chat-input">
        <textarea
          rows={2}
          placeholder="Type your message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button type="button" className="btn" disabled={busy || !draft.trim()} onClick={send}>
          {busy ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export function Support() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, unread] = await Promise.all([
        api.listTickets(),
        api.getTicketUnread(),
      ]);
      setTickets(list);
      setUnreadTotal(unread.total);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 20000);
    return () => window.clearInterval(id);
  }, [load]);

  const submit = async () => {
    if (!subject.trim() || !body.trim()) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const created = await api.createTicket(subject, body, 'General');
      setMsg('Ticket submitted. Our team will reply in the chat below.');
      setSubject('');
      setBody('');
      await load();
      setActiveId(created.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const active = tickets.find((t) => t.id === activeId) ?? null;

  return (
    <>
      <div className="page-head">
        <h1>Support</h1>
        <p>Raise a ticket and chat with our team — one thread per ticket.</p>
      </div>

      {unreadTotal > 0 && (
        <div className="ticket-unread-banner" role="status">
          <strong>{unreadTotal} unread message{unreadTotal === 1 ? '' : 's'}</strong>
          <span className="muted"> from support — open a ticket below to read and reply.</span>
        </div>
      )}

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
          <div className="list-row ticket-list-row" key={t.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{t.subject}</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                {t.unread_count
                  ? `${t.unread_count} new message${t.unread_count === 1 ? '' : 's'} from support`
                  : 'Tap Chat to view the conversation'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {t.unread_count ? (
                <span className="ticket-unread-badge">{t.unread_count}</span>
              ) : null}
              <span className={`pill ${statusPill(t.status)}`}>{String(t.status).replace(/_/g, ' ')}</span>
              <button type="button" className="btn ghost" onClick={() => setActiveId(t.id)}>Chat</button>
            </div>
          </div>
        ))}
      </div>

      {active && (
        <TicketChatPanel
          ticket={active}
          onClose={() => setActiveId(null)}
          onUpdate={load}
        />
      )}
    </>
  );
}
