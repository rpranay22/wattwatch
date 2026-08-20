// Shared price helpers — Dublin timezone, stats, and window search.
// Used by entso.js, usage.js, and cheapWindowWatcher.js.

export const CHEAP_MAX = 0.2;
export const MODERATE_MAX = 0.28;

const DUBLIN = 'Europe/Dublin';

export function dublinParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-IE', {
    timeZone: DUBLIN,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  return parts;
}

/** YYYY-MM-DD in Irish local time. */
export function dublinDayKey(date = new Date()) {
  const p = dublinParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Half-hour slot 0–47 in Irish local time (00:00 = 0, 23:30 = 47). */
export function dublinSlot(date = new Date()) {
  const p = dublinParts(date);
  const h = parseInt(p.hour, 10) % 24;
  const m = parseInt(p.minute, 10);
  return Math.min(47, Math.floor((h * 60 + m) / 30));
}

function findUtcForDublinLocal(dayISO, hour, minute) {
  const [y, mo, d] = dayISO.split('-').map(Number);
  const base = Date.UTC(y, mo - 1, d, 12, 0, 0);
  for (let offset = -48 * 60 * 60 * 1000; offset <= 48 * 60 * 60 * 1000; offset += 60 * 1000) {
    const candidate = new Date(base + offset);
    const p = dublinParts(candidate);
    const key = `${p.year}-${p.month}-${p.day}`;
    if (key === dayISO && parseInt(p.hour, 10) % 24 === hour && parseInt(p.minute, 10) === minute) {
      return candidate;
    }
  }
  throw new Error(`Cannot resolve Dublin local ${dayISO} ${hour}:${minute}`);
}

function utcEntsoStamp(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}${m}${d}${h}${min}`;
}

/** ENTSO-E periodStart/periodEnd for one Irish calendar day. */
export function entsoPeriodForDublinDay(dayISO) {
  const startUtc = findUtcForDublinLocal(dayISO, 0, 0);
  const [y, mo, d] = dayISO.split('-').map(Number);
  const next = new Date(Date.UTC(y, mo - 1, d + 1));
  const nextISO = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
  const endUtc = findUtcForDublinLocal(nextISO, 0, 0);
  return { periodStart: utcEntsoStamp(startUtc), periodEnd: utcEntsoStamp(endUtc) };
}

export function slotLabel(slot) {
  const s = ((slot % 48) + 48) % 48;
  const h = Math.floor(s / 2);
  const m = s % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}

export function statsFromPrices(prices) {
  const arr = prices.slice(0, 48);
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    min,
    max,
    avg,
    minSlot: arr.indexOf(min),
    maxSlot: arr.indexOf(max),
  };
}

/** Cheapest contiguous run of `lengthSlots` half-hours on a 48-slot day curve. */
export function cheapestWindowFromPrices(prices, lengthSlots, fromSlot = 0) {
  let best = { start: fromSlot, avg: Infinity };
  for (let i = 0; i < 48; i++) {
    const start = (fromSlot + i) % 48;
    let sum = 0;
    for (let j = 0; j < lengthSlots; j++) sum += prices[(start + j) % 48];
    const avg = sum / lengthSlots;
    if (avg < best.avg) best = { start, avg };
  }
  return {
    start: best.start,
    end: (best.start + lengthSlots) % 48,
    avg: best.avg,
    label: `${slotLabel(best.start)}\u2013${slotLabel(best.start + lengthSlots)}`,
  };
}

export function tierForPrice(price) {
  if (price < CHEAP_MAX) return 'cheap';
  if (price < MODERATE_MAX) return 'moderate';
  return 'expensive';
}

/** Add days to a Dublin calendar date (YYYY-MM-DD). */
export function offsetDublinDay(dayISO, deltaDays) {
  const noon = findUtcForDublinLocal(dayISO, 12, 0);
  noon.setUTCDate(noon.getUTCDate() + deltaDays);
  return dublinDayKey(noon);
}

/** Short label e.g. "Mon 21" for chart axes. */
export function shortDayLabel(dayISO) {
  const noon = findUtcForDublinLocal(dayISO, 12, 0);
  return noon.toLocaleDateString('en-IE', {
    weekday: 'short',
    day: 'numeric',
    timeZone: DUBLIN,
  });
}
