// ENTSO-E day-ahead price integration for the Irish SEM bidding zone.
//
// Fetches half-hourly €/kWh curves aligned to Europe/Dublin calendar days.
// Set ENTSO_E_TOKEN on Render for live data; otherwise a fixed fallback curve is used.

import {
  dublinDayKey,
  dublinSlot,
  entsoPeriodForDublinDay,
  statsFromPrices,
  cheapestWindowFromPrices,
} from './priceUtils.js';

export { dublinDayKey, dublinSlot, statsFromPrices, cheapestWindowFromPrices } from './priceUtils.js';

const SEM_DOMAIN = '10Y1001A1001A59C';

// Must match wattwatch-webapp/src/lib/pricing.ts HALF_HOURLY_PRICES when no token is set.
export const FALLBACK = [
  0.150, 0.145, 0.143, 0.143, 0.144, 0.146, 0.150, 0.150, 0.152, 0.155, 0.158, 0.160,
  0.165, 0.170, 0.178, 0.185, 0.190, 0.195, 0.198, 0.200, 0.205, 0.210, 0.215, 0.220,
  0.225, 0.230, 0.235, 0.240, 0.250, 0.262, 0.300, 0.320, 0.326, 0.320, 0.300, 0.280,
  0.260, 0.245, 0.230, 0.215, 0.205, 0.195, 0.185, 0.178, 0.170, 0.162, 0.158, 0.154,
];

const MWH_DIVISOR = Number(process.env.PRICE_EUR_PER_MWH_DIVISOR || 1000);
const RETAIL_MULTIPLIER = Number(process.env.PRICE_RETAIL_MULTIPLIER || 1);

/** @type {Map<string, { prices: number[], source: string }>} */
const cache = new Map();

function mwhToKwh(mwh) {
  return +((mwh / MWH_DIVISOR) * RETAIL_MULTIPLIER).toFixed(4);
}

function pad48(values) {
  const out = values.slice(0, 48).map((v) => mwhToKwh(v));
  while (out.length < 48) out.push(out[out.length - 1] ?? mwhToKwh(100));
  return out.slice(0, 48);
}

function hourlyToHalfHourly(hourly) {
  const out = [];
  for (let h = 0; h < 24; h++) {
    const kwh = mwhToKwh(hourly[h] ?? hourly[hourly.length - 1]);
    out.push(kwh, kwh);
  }
  return out.slice(0, 48);
}

/** Parse ENTSO-E A44 XML into resolution + ordered €/MWh values. */
export function parseEntsoXml(xml) {
  const blocks = xml.split(/<TimeSeries>/i).slice(1);
  let best = null;

  for (const block of blocks) {
    const resMatch = block.match(/<resolution>PT(\d+)M<\/resolution>/i);
    const minutes = resMatch ? parseInt(resMatch[1], 10) : 60;
    const points = [...block.matchAll(/<position>(\d+)<\/position>\s*<price\.amount>([\d.]+)<\/price\.amount>/gi)]
      .map((m) => ({ pos: parseInt(m[1], 10), val: parseFloat(m[2]) }))
      .sort((a, b) => a.pos - b.pos);

    if (!points.length) continue;
    const values = points.map((p) => p.val);
    if (!best || values.length > best.values.length) best = { minutes, values };
  }

  if (best) return best;

  const flat = [...xml.matchAll(/<price\.amount>([\d.]+)<\/price\.amount>/g)].map((m) => parseFloat(m[1]));
  if (!flat.length) throw new Error('No prices in ENTSO-E response');
  return { minutes: flat.length >= 40 ? 30 : 60, values: flat };
}

export function entsoValuesToHalfHourly({ minutes, values }) {
  if (minutes <= 30 && values.length >= 48) return pad48(values);
  if (minutes === 60 || values.length <= 25) return hourlyToHalfHourly(values);
  // Finer resolution — average into half-hour buckets
  const slotsPerHalfHour = Math.max(1, 30 / minutes);
  const out = [];
  for (let i = 0; i < 48; i++) {
    const start = Math.floor(i * slotsPerHalfHour);
    const end = Math.floor((i + 1) * slotsPerHalfHour);
    const slice = values.slice(start, end);
    const avg = slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : values[values.length - 1];
    out.push(mwhToKwh(avg));
  }
  return out.slice(0, 48);
}

function simulated(dayISO, reason) {
  return { prices: [...FALLBACK], source: reason, day: dayISO };
}

async function fetchEntsoForDay(dayISO) {
  const token = process.env.ENTSO_E_TOKEN;
  if (!token) return simulated(dayISO, 'simulated (no ENTSO_E_TOKEN set)');

  try {
    const { periodStart, periodEnd } = entsoPeriodForDublinDay(dayISO);
    const url = `https://web-api.tp.entsoe.eu/api?securityToken=${token}` +
      `&documentType=A44&in_Domain=${SEM_DOMAIN}&out_Domain=${SEM_DOMAIN}` +
      `&periodStart=${periodStart}&periodEnd=${periodEnd}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`ENTSO-E HTTP ${res.status}`);
    const xml = await res.text();
    const parsed = parseEntsoXml(xml);
    if (parsed.values.length < 20) throw new Error('ENTSO-E returned too few prices');

    const prices = entsoValuesToHalfHourly(parsed);
    return { prices, source: 'ENTSO-E day-ahead (live)', day: dayISO };
  } catch (e) {
    console.warn(`ENTSO-E fetch failed for ${dayISO}, using fallback:`, e.message);
    return simulated(dayISO, `simulated (ENTSO-E error: ${e.message})`);
  }
}

/**
 * 48 half-hourly €/kWh values for an Irish calendar day (default: today in Dublin).
 */
export async function getHalfHourlyPrices(dayISO = dublinDayKey()) {
  const cached = cache.get(dayISO);
  if (cached) return { day: dayISO, ...cached };

  const result = await fetchEntsoForDay(dayISO);
  cache.set(dayISO, { prices: result.prices, source: result.source });

  // Keep cache bounded
  if (cache.size > 90) {
    const oldest = [...cache.keys()].sort()[0];
    cache.delete(oldest);
  }

  return result;
}

/** Invalidate cache for a day (e.g. after midnight rollover). */
export function clearPriceCache(dayISO) {
  if (dayISO) cache.delete(dayISO);
  else cache.clear();
}
