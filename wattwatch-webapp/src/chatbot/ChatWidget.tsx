import { useRef, useState, useEffect } from 'react';
import { respond, ProposedAlert } from './brain';
import { api } from '../lib/api';
import { useAppData } from '../state/AppData';

interface Msg { from: 'bot' | 'user'; text: string; proposal?: ProposedAlert }

export function ChatWidget() {
  const { refreshAlerts } = useAppData();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: 'bot', text: "Hi! I'm your WattWatch assistant. Try \"alert me when price is below 0.18\", or ask \"when is cheapest today?\"." },
  ]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => { threadRef.current?.scrollTo(0, threadRef.current.scrollHeight); }, [msgs, open]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const reply = respond(text);
    setMsgs((m) => [...m, { from: 'user', text }, { from: 'bot', text: reply.text, proposal: reply.proposal }]);
    setInput('');
  };

  const confirm = async (p: ProposedAlert, idx: number) => {
    try {
      await api.createAlert({ name: p.name, kind: p.kind, condition: p.condition, threshold: p.threshold, start: p.start, end: p.end, days: p.days });
      await refreshAlerts();
      setMsgs((m) => m.map((msg, i) => i === idx ? { from: 'bot', text: `Done — "${p.name}" is now active. See it on the Alerts page.` } : msg));
    } catch {
      setMsgs((m) => [...m, { from: 'bot', text: "I couldn't save that alert. Please try again." }]);
    }
  };
  const cancel = (idx: number) => setMsgs((m) => m.map((msg, i) => i === idx ? { from: 'bot', text: "No problem, I didn't set that one." } : msg));

  return (
    <>
      {!open && <button className="fab" onClick={() => setOpen(true)} title="Assistant">💬</button>}
      {open && (
        <div className="chat-panel">
          <div className="chat-head">
            <strong>⚡ WattWatch Assistant</strong>
            <button onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="chat-thread" ref={threadRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`bubble ${m.from}`}>
                {m.text}
                {m.proposal && (
                  <div className="chat-actions">
                    <button className="btn" onClick={() => confirm(m.proposal!, i)}>Confirm</button>
                    <button className="btn ghost" onClick={() => cancel(i)}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything…"
              onKeyDown={(e) => e.key === 'Enter' && send()} />
            <button onClick={send}>↑</button>
          </div>
        </div>
      )}
    </>
  );
}
