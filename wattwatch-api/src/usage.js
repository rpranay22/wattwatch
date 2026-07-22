import { db } from './db.js';

// Small seeded RNG so a given user+day always yields the same figures.
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Build one day's usage for a user. Realistic-ish Irish figures.
export function computeDay(userId, dayISO) {
  const r = seeded(userId + dayISO);
  const kwh = +(6 + r() * 16).toFixed(1);                 // 6-22 kWh
  const avg = +(0.17 + r() * 0.09).toFixed(3);            // 0.170-0.260
  const low = +(avg - (0.02 + r() * 0.03)).toFixed(3);
  const peak = +(avg + (0.04 + r() * 0.06)).toFixed(3);
  const cost = +(kwh * avg).toFixed(2);
  const startH = Math.floor(r() * 4);                      // best window midnight-4am
  const best = `${String(startH).padStart(2, '0')}:00-${String(startH + 3).padStart(2, '0')}:00`;
  return { kwh, cost, avg_price: avg, peak_price: peak, low_price: low, best_window: best };
}

// Return the month's usage for a user, generating+storing any missing days
// up to today. Never invents future days.
export async function getMonthUsage(userId, year, month) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const today = new Date();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const [existing] = await db.execute(
    'SELECT * FROM usage_daily WHERE user_id = ? AND day BETWEEN ? AND ?',
    [userId, `${year}-${String(month).padStart(2,'0')}-01`,
     `${year}-${String(month).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`]
  );
  const have = new Map(existing.map((r) => [r.day, r]));

  const out = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(year, month - 1, d));
    if (date > today) break; // no future data
    const iso = date.toISOString().slice(0, 10);
    if (have.has(iso)) { out.push(rowToJson(have.get(iso))); continue; }
    const g = computeDay(userId, iso);
    await db.execute(
      `INSERT IGNORE INTO usage_daily
       (user_id, day, kwh, cost, avg_price, peak_price, low_price, best_window)
       VALUES (?,?,?,?,?,?,?,?)`,
      [userId, iso, g.kwh, g.cost, g.avg_price, g.peak_price, g.low_price, g.best_window]
    );
    out.push({ day: iso, ...g });
  }
  return out;
}

function rowToJson(r) {
  return {
    day: r.day,
    kwh: Number(r.kwh), cost: Number(r.cost),
    avg_price: Number(r.avg_price), peak_price: Number(r.peak_price),
    low_price: Number(r.low_price), best_window: r.best_window,
  };
}
