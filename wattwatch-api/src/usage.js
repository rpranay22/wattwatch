import { Op } from 'sequelize';
import { UsageDaily } from './models/index.js';
import {
  dublinDayKey,
  getHalfHourlyPrices,
  statsFromPrices,
  cheapestWindowFromPrices,
} from './entso.js';

function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Build one calendar day: kWh is simulated; prices come from ENTSO-E for that day. */
export async function computeDay(userId, dayISO) {
  const { prices } = await getHalfHourlyPrices(dayISO);
  const stats = statsFromPrices(prices);
  const win = cheapestWindowFromPrices(prices, 6);

  const r = seeded(userId + dayISO);
  const kwh = +(6 + r() * 16).toFixed(1);
  const cost = +(kwh * stats.avg).toFixed(2);

  return {
    kwh,
    cost,
    avg_price: +stats.avg.toFixed(4),
    peak_price: +stats.max.toFixed(4),
    low_price: +stats.min.toFixed(4),
    best_window: win.label,
  };
}

export async function getMonthUsage(userId, year, month) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  const todayKey = dublinDayKey();

  const existing = await UsageDaily.findAll({
    where: { user_id: userId, day: { [Op.between]: [monthStart, monthEnd] } },
  });
  const have = new Map(existing.map((r) => [r.day, r]));

  const out = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (iso > todayKey) break;

    const row = have.get(iso);
    const kwh = row ? Number(row.kwh) : null;
    const g = await computeDay(userId, iso);

    // Keep stable simulated kWh; always refresh ENTSO-derived price fields.
    const data = kwh != null ? { ...g, kwh, cost: +(kwh * g.avg_price).toFixed(2) } : g;

    await UsageDaily.upsert({
      user_id: userId,
      day: iso,
      ...data,
    });
    out.push({ day: iso, ...data });
  }
  return out;
}

/** Savings vs running the same kWh entirely at that day's peak rate. */
export function savingsForDay(row) {
  const kwh = Number(row.kwh);
  const cost = Number(row.cost);
  const peak = Number(row.peak_price);
  const baselineCost = +(kwh * peak).toFixed(2);
  const saved = +(Math.max(0, baselineCost - cost)).toFixed(2);
  return { kwh, actualCost: cost, baselineCost, saved };
}

function roundSavings(o) {
  return {
    saved: +o.saved.toFixed(2),
    actualCost: +o.actualCost.toFixed(2),
    baselineCost: +o.baselineCost.toFixed(2),
    kwh: +o.kwh.toFixed(1),
    pct: o.baselineCost > 0 ? Math.round((o.saved / o.baselineCost) * 100) : 0,
  };
}

/** Today, rolling 7 days, and current calendar month. */
export async function getSavingsSummary(userId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const days = await getMonthUsage(userId, year, month);

  const todayISO = dublinDayKey(now);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartISO = dublinDayKey(weekStart);

  let weekDays = days.filter((d) => d.day >= weekStartISO);
  if (weekStartISO < `${year}-${String(month).padStart(2, '0')}-01`) {
    const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
    const prevDays = await getMonthUsage(userId, prev.y, prev.m);
    weekDays = [...prevDays.filter((d) => d.day >= weekStartISO && d.day < todayISO), ...weekDays];
  }

  let today = { saved: 0, actualCost: 0, baselineCost: 0, kwh: 0 };
  let week = { saved: 0, actualCost: 0, baselineCost: 0, kwh: 0 };
  let monthTotals = { saved: 0, actualCost: 0, baselineCost: 0, kwh: 0 };

  for (const d of days) {
    const s = savingsForDay(d);
    monthTotals.saved += s.saved;
    monthTotals.actualCost += s.actualCost;
    monthTotals.baselineCost += s.baselineCost;
    monthTotals.kwh += s.kwh;
    if (d.day === todayISO) today = { ...s };
  }

  for (const d of weekDays) {
    const s = savingsForDay(d);
    week.saved += s.saved;
    week.actualCost += s.actualCost;
    week.baselineCost += s.baselineCost;
    week.kwh += s.kwh;
  }

  return {
    today: roundSavings(today),
    week: roundSavings(week),
    month: roundSavings(monthTotals),
    basis: 'Savings = what you would have paid at peak rate minus what you actually paid, using ENTSO-E day-ahead prices for each day.',
  };
}
