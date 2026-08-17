import { Op } from 'sequelize';
import { UsageDaily } from './models/index.js';

function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function computeDay(userId, dayISO) {
  const r = seeded(userId + dayISO);
  const kwh = +(6 + r() * 16).toFixed(1);
  const avg = +(0.17 + r() * 0.09).toFixed(3);
  const low = +(avg - (0.02 + r() * 0.03)).toFixed(3);
  const peak = +(avg + (0.04 + r() * 0.06)).toFixed(3);
  const cost = +(kwh * avg).toFixed(2);
  const startH = Math.floor(r() * 4);
  const best = `${String(startH).padStart(2, '0')}:00-${String(startH + 3).padStart(2, '0')}:00`;
  return { kwh, cost, avg_price: avg, peak_price: peak, low_price: low, best_window: best };
}

export async function getMonthUsage(userId, year, month) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const today = new Date();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const existing = await UsageDaily.findAll({
    where: { user_id: userId, day: { [Op.between]: [monthStart, monthEnd] } },
  });
  const have = new Map(existing.map((r) => [r.day, r]));

  const out = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(year, month - 1, d));
    if (date > today) break;
    const iso = date.toISOString().slice(0, 10);
    if (have.has(iso)) { out.push(rowToJson(have.get(iso))); continue; }

    const g = computeDay(userId, iso);
    await UsageDaily.findOrCreate({
      where: { user_id: userId, day: iso },
      defaults: { ...g },
    });
    out.push({ day: iso, ...g });
  }
  return out;
}

function rowToJson(r) {
  const plain = r.get ? r.get({ plain: true }) : r;
  return {
    day: plain.day,
    kwh: Number(plain.kwh),
    cost: Number(plain.cost),
    avg_price: Number(plain.avg_price),
    peak_price: Number(plain.peak_price),
    low_price: Number(plain.low_price),
    best_window: plain.best_window,
  };
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

  const todayISO = now.toISOString().slice(0, 10);
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  const weekStartISO = weekStart.toISOString().slice(0, 10);

  // Also pull days from previous month if week spans month boundary
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
    basis: 'Savings = what you would have paid at peak rate minus what you actually paid, by shifting use to cheaper windows.',
  };
}
