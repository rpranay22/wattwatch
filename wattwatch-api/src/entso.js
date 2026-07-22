// ENTSO-E day-ahead price integration for the Irish SEM bidding zone.
//
// How it works:
//   - If ENTSO_E_TOKEN is set in the environment, we fetch today's day-ahead
//     prices from the ENTSO-E Transparency Platform, convert them to the
//     app's 48 half-hourly €/kWh slots, and cache them for the day.
//   - If the token is NOT set, or the fetch fails, we fall back to a fixed
//     realistic curve so the app keeps working. The response says which
//     source was used, so nothing is ever silently wrong.
//
// Getting a token: register free at https://transparency.entsoe.eu, then
// email transparency@entsoe.eu asking for API access. They reply with a
// token. Put it in the API's environment as ENTSO_E_TOKEN and restart.

const SEM_DOMAIN = '10Y1001A1001A59C'; // ENTSO-E EIC code for Ireland (SEM)

// Fixed fallback curve: 48 half-hourly values, €/kWh. Overnight cheap,
// evening peak — matches the app's original simulated shape.
const FALLBACK = [
  0.150,0.145,0.143,0.143,0.144,0.146,0.150,0.150,0.152,0.155,0.158,0.160,
  0.165,0.170,0.178,0.185,0.190,0.195,0.198,0.200,0.205,0.210,0.215,0.220,
  0.225,0.230,0.235,0.240,0.250,0.262,0.300,0.320,0.326,0.320,0.300,0.280,
  0.260,0.245,0.230,0.215,0.205,0.195,0.185,0.178,0.170,0.162,0.158,0.154,
];

let cache = { day: null, prices: null, source: null };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ENTSO-E returns hourly €/MWh. Convert to 48 half-hourly €/kWh by dividing
// by 1000 and duplicating each hour into its two half-hour slots.
function hourlyMwhToHalfHourlyKwh(hourly) {
  const out = [];
  for (let h = 0; h < 24; h++) {
    const kwh = (hourly[h] ?? hourly[hourly.length - 1]) / 1000;
    out.push(+kwh.toFixed(3), +kwh.toFixed(3));
  }
  return out;
}

// Minimal XML pull of <price.amount> values from the ENTSO-E A44 document.
function parsePrices(xml) {
  const matches = [...xml.matchAll(/<price\.amount>([\d.]+)<\/price\.amount>/g)];
  return matches.map((m) => parseFloat(m[1]));
}

export async function getHalfHourlyPrices() {
  const day = todayKey();
  if (cache.day === day && cache.prices) return { prices: cache.prices, source: cache.source, day };

  const token = process.env.ENTSO_E_TOKEN;
  if (!token) {
    cache = { day, prices: FALLBACK, source: 'simulated (no ENTSO_E_TOKEN set)' };
    return { ...cache };
  }

  try {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    const periodStart = `${y}${m}${d}0000`;
    const periodEnd = `${y}${m}${d}2300`;

    const url = `https://web-api.tp.entsoe.eu/api?securityToken=${token}` +
      `&documentType=A44&in_Domain=${SEM_DOMAIN}&out_Domain=${SEM_DOMAIN}` +
      `&periodStart=${periodStart}&periodEnd=${periodEnd}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`ENTSO-E HTTP ${res.status}`);
    const xml = await res.text();
    const hourly = parsePrices(xml);
    if (hourly.length < 20) throw new Error('ENTSO-E returned too few prices');

    const prices = hourlyMwhToHalfHourlyKwh(hourly);
    cache = { day, prices, source: 'ENTSO-E day-ahead (live)' };
    return { ...cache };
  } catch (e) {
    console.warn('ENTSO-E fetch failed, using fallback:', e.message);
    cache = { day, prices: FALLBACK, source: `simulated (ENTSO-E error: ${e.message})` };
    return { ...cache };
  }
}
