// Rule-based assistant. No external AI, no network. Given a user message it
// returns a reply and, when the message is an alert command, a proposed alert
// for the UI to preview and confirm. Everything here is pure and unit-tested.
import { cheapestWindow, slotFor, slotLabel, formatPrice, dayStats } from '../lib/pricing';

export interface ProposedAlert {
  name: string;
  kind: 'price' | 'time';
  condition?: 'below' | 'above';
  threshold?: number;
  start?: string;
  end?: string;
  days: string[];
}

export interface BotReply {
  text: string;
  proposal?: ProposedAlert; // when present, UI shows a preview + Confirm
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Pull a euro price out of text: "0.20", "20c", "20 cent", "€0.18"
function parsePrice(text: string): number | null {
  const euro = text.match(/(?:€|eur\s*)?(\d+(?:\.\d+)?)\s*(?:€|eur|\/kwh)?/i);
  const cent = text.match(/(\d+(?:\.\d+)?)\s*c(?:ent)?s?\b/i);
  if (cent) return +(parseFloat(cent[1]) / 100).toFixed(3);
  // only treat as a price if it looks like one (has a decimal or a currency mark)
  if (/€|eur|\/kwh/i.test(text) || /\d+\.\d+/.test(text)) {
    if (euro) return parseFloat(euro[1]);
  }
  return null;
}

// Pull a HH:MM time out of text: "18:30", "6pm", "6 pm", "18.30"
function parseTime(text: string): string | null {
  let m = text.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (m) {
    const h = Math.min(23, parseInt(m[1], 10));
    const min = Math.min(59, parseInt(m[2], 10));
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  m = text.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (m) {
    let h = parseInt(m[1], 10) % 12;
    if (/pm/i.test(m[2])) h += 12;
    return `${String(h).padStart(2, '0')}:00`;
  }
  return null;
}

export function respond(raw: string): BotReply {
  const text = (raw || '').trim();
  const low = text.toLowerCase();
  if (!text) return { text: "Ask me to set an alert, or about prices and how the app works." };

  // ---- greetings / help ----
  if (/^(hi|hey|hello|yo)\b/.test(low)) {
    return { text: "Hi! I can set price or time alerts for you, tell you the cheapest window today, or explain how WattWatch works. Try: \"alert me when the price is below 0.18\"." };
  }
  if (/\b(help|what can you do|commands)\b/.test(low)) {
    return { text: "I can:\n• Set a price alert — \"alert when price below 0.20\"\n• Set a time alert — \"remind me at 18:30\"\n• Tell you the cheapest window — \"when is cheapest today?\"\n• Explain features — \"how do alerts work?\"" };
  }

  // ---- cheapest window / best time ----
  if (/(cheap|best|lowest).*(time|window|hour|price|use|run)|when.*(cheap|use|run)/.test(low)) {
    const now = slotFor();
    const win = cheapestWindow(now, 6); // next best 3-hour window (6 half-hour slots)
    return { text: `The cheapest upcoming window is ${win.label}, averaging ${formatPrice(win.avg)}. Good time to run the dishwasher, washing machine or charge an EV.` };
  }

  // ---- current price ----
  if (/(price now|current price|what.*price|how much.*now)/.test(low)) {
    const now = slotFor();
    const { min, max } = dayStats();
    return { text: `Right now (${slotLabel(now)}) you're in today's range of ${formatPrice(min)}–${formatPrice(max)}. Ask "when is cheapest today?" to plan around the low points.` };
  }

  // ---- how things work ----
  if (/how.*(alert|work)|what.*alert/.test(low)) {
    return { text: "Alerts watch either a price or a time. A price alert fires when the half-hourly price crosses your threshold; a time alert reminds you at a set time. Tell me one in plain English and I'll set it up for you to confirm." };
  }
  if (/dark mode|theme/.test(low)) {
    return { text: "You can switch to dark mode in Profile → Settings → Theme. It's saved for next time too." };
  }

  // ---- ALERT COMMANDS ----
  const wantsAlert = /(alert|notify|remind|tell me|let me know|ping me)/.test(low);

  // price alert: needs below/above + a price
  const below = /\b(below|under|less than|drops? below|cheaper than)\b/.test(low);
  const above = /\b(above|over|more than|higher than|exceeds?)\b/.test(low);
  const price = parsePrice(low);

  if ((wantsAlert || below || above) && price !== null && (below || above)) {
    const condition = below ? 'below' : 'above';
    return {
      text: `Set a price alert to notify you when electricity goes ${condition} ${formatPrice(price)}? It'll check every day.`,
      proposal: {
        name: `Price ${condition} ${formatPrice(price)}`,
        kind: 'price', condition, threshold: price, days: ALL_DAYS,
      },
    };
  }

  // time alert: needs a time
  const time = parseTime(low);
  if ((wantsAlert || time) && time) {
    // a 30-min window starting at the given time
    const [h, m] = time.split(':').map(Number);
    const endH = m + 30 >= 60 ? (h + 1) % 24 : h;
    const endM = (m + 30) % 60;
    const end = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    return {
      text: `Set a daily reminder at ${time}? I'll notify you around then.`,
      proposal: {
        name: `Reminder at ${time}`,
        kind: 'time', start: time, end, days: ALL_DAYS,
      },
    };
  }

  // asked for an alert but we couldn't extract the specifics
  if (wantsAlert) {
    return { text: "I can set that up — just tell me a price or a time. For example: \"alert me when price is below 0.18\" or \"remind me at 18:30\"." };
  }

  // ---- fallback ----
  return { text: "I didn't quite get that. Try:\n• \"alert when price below 0.20\"\n• \"remind me at 7pm\"\n• \"when is cheapest today?\"\n• \"help\"" };
}
