// Web color tokens (replaces the React Native theme import).
const colors = {
  cheap: '#17B978', moderate: '#F59E0B', expensive: '#EF4444',
  cheapTint: '#E6F7EF', moderateTint: '#FEF3E2', expensiveTint: '#FDECEC',
};

/**
 * Half-hourly retail price in EUR/kWh, index 0 = 00:00, index 47 = 23:30.
 *
 * Shape mirrors a typical Irish dynamic tariff day and must stay consistent
 * with the copy shown to users on the onboarding Explainer screen:
 *   - overnight trough  (00:00-06:30) cheap, minimum around 03:00
 *   - morning bump      (08:00-08:30) moderate
 *   - midday solar dip  (13:00-14:00) moderate
 *   - evening peak      (17:00-20:00) expensive, maximum around 18:30
 * Replaced by the live SEMOpx feed in v0.2. See docs/BUILD_AND_RELEASE.md.
 */
export const HALF_HOURLY_PRICES: number[] = [
  0.168, 0.162, 0.157, 0.152, 0.148, 0.145, // 00:00 - 02:30
  0.143, 0.144, 0.147, 0.152, 0.158, 0.166, // 03:00 - 05:30
  0.178, 0.192, 0.213, 0.234, 0.248, 0.252, // 06:00 - 08:30
  0.246, 0.236, 0.227, 0.220, 0.214, 0.208, // 09:00 - 11:30
  0.208, 0.204, 0.203, 0.203, 0.205, 0.209, // 12:00 - 14:30
  0.216, 0.224, 0.238, 0.257, 0.284, 0.301, // 15:00 - 17:30
  0.318, 0.326, 0.321, 0.305, 0.281, 0.252, // 18:00 - 20:30
  0.236, 0.219, 0.204, 0.192, 0.182, 0.174, // 21:00 - 23:30
];

export const CHEAP_MAX = 0.2;
export const MODERATE_MAX = 0.28;

// Live prices, when the app has fetched them from the API's /prices endpoint
// (which serves ENTSO-E data when a token is configured, otherwise a
// simulated curve). Until then, priceAt() uses HALF_HOURLY_PRICES above.
let LIVE_PRICES: number[] | null = null;
let PRICE_SOURCE = 'built-in (not yet fetched)';

export function setLivePrices(prices: number[], source: string) {
  if (Array.isArray(prices) && prices.length === 48) {
    LIVE_PRICES = prices;
    PRICE_SOURCE = source;
  }
}
export function priceSource(): string { return PRICE_SOURCE; }
export function activePrices(): number[] { return LIVE_PRICES ?? HALF_HOURLY_PRICES; }

export type Tier = 'cheap' | 'moderate' | 'expensive';

export function tierFor(price: number): Tier {
  if (price < CHEAP_MAX) return 'cheap';
  if (price < MODERATE_MAX) return 'moderate';
  return 'expensive';
}

export function tierLabel(tier: Tier): string {
  return { cheap: 'CHEAP', moderate: 'MODERATE', expensive: 'EXPENSIVE' }[tier];
}

export function tierColor(tier: Tier): string {
  return { cheap: colors.cheap, moderate: colors.moderate, expensive: colors.expensive }[tier];
}

export function tierTint(tier: Tier): string {
  return { cheap: colors.cheapTint, moderate: colors.moderateTint, expensive: colors.expensiveTint }[tier];
}

/** Index 0-47 of the half-hour slot containing `date`. */
export function slotFor(date: Date = new Date()): number {
  return Math.floor((date.getHours() * 60 + date.getMinutes()) / 30);
}

export function priceAt(slot: number): number {
  const arr = LIVE_PRICES ?? HALF_HOURLY_PRICES;
  return arr[((slot % 48) + 48) % 48];
}

/** "17:30" for slot 35. */
export function slotLabel(slot: number): string {
  const s = ((slot % 48) + 48) % 48;
  const h = Math.floor(s / 2);
  const m = s % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}

export function formatPrice(price: number, decimals = 3): string {
  return `\u20ac${price.toFixed(decimals)}`;
}

/** The next `count` slots starting at `from`, wrapping past midnight. */
export function upcomingSlots(from: number, count: number): { slot: number; price: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const slot = (from + i) % 48;
    return { slot, price: priceAt(slot) };
  });
}

/**
 * Cheapest contiguous run of `lengthSlots` within the next 24h.
 * Used for "best EV charging window" style tips.
 */
export function cheapestWindow(from: number, lengthSlots: number) {
  let best = { start: from, avg: Infinity };
  for (let i = 0; i < 48; i++) {
    const start = (from + i) % 48;
    let sum = 0;
    for (let j = 0; j < lengthSlots; j++) sum += priceAt(start + j);
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

/** Next slot after `from` whose tier differs, i.e. when the advice changes. */
export function nextTierChange(from: number): { slot: number; tier: Tier } | null {
  const current = tierFor(priceAt(from));
  for (let i = 1; i < 48; i++) {
    const slot = (from + i) % 48;
    const t = tierFor(priceAt(slot));
    if (t !== current) return { slot, tier: t };
  }
  return null;
}

/** One plain-English line telling the user what to do right now. */
export function recommendationFor(slot: number): string {
  const tier = tierFor(priceAt(slot));
  const change = nextTierChange(slot);

  if (tier === 'cheap') return 'Good time to run appliances or charge your EV.';
  if (tier === 'moderate') {
    return change && change.tier === 'cheap'
      ? `Average rate. It gets cheaper from ${slotLabel(change.slot)}.`
      : 'Average rate. Non-urgent use is fine.';
  }
  return change
    ? `Peak rate. Hold off if you can \u2014 it eases at ${slotLabel(change.slot)}.`
    : 'Peak rate. Delay heavy appliances if you can.';
}

export type UsageVerdict = 'good' | 'ok' | 'wait';

export interface UsageAdvice {
  verdict: UsageVerdict;
  verdictLabel: string;
  tier: Tier;
  price: number;
  headline: string;
  action: string;
  basis: string;
  comparedToAvg: 'below' | 'near' | 'above';
  dayAvg: number;
  nextChange: { slot: number; tier: Tier; label: string } | null;
}

/**
 * Should the customer use electricity right now?
 *
 * Basis (same thresholds as alerts and the Explainer page):
 *   - GOOD  (< €0.20/kWh): cheap tier — bottom of today's curve; run washers, EV, etc.
 *   - OK    (€0.20–€0.28): moderate — fine for lights/TV; delay heavy loads if flexible
 *   - WAIT  (≥ €0.28/kWh): expensive — peak slot; wait for a cheaper window if you can
 *
 * We also compare to today's average so the message reflects where this slot sits
 * relative to the full ENTSO-E day-ahead curve.
 */
export function usageAdvice(slot: number): UsageAdvice {
  const price = priceAt(slot);
  const tier = tierFor(price);
  const { avg } = dayStats();
  const change = nextTierChange(slot);

  const verdict: UsageVerdict = tier === 'cheap' ? 'good' : tier === 'moderate' ? 'ok' : 'wait';
  const verdictLabel = {
    good: 'Good time to use',
    ok: 'OK to use',
    wait: 'Wait if you can',
  }[verdict];

  const comparedToAvg: UsageAdvice['comparedToAvg'] =
    price < avg * 0.98 ? 'below' : price > avg * 1.02 ? 'above' : 'near';

  const avgPhrase =
    comparedToAvg === 'below'
      ? `${formatPrice(Math.abs(price - avg))} below today's average`
      : comparedToAvg === 'above'
        ? `${formatPrice(Math.abs(price - avg))} above today's average`
        : `in line with today's average of ${formatPrice(avg)}`;

  let basis: string;
  if (tier === 'cheap') {
    basis = `Under €${CHEAP_MAX.toFixed(2)}/kWh (cheap tier) and ${avgPhrase}.`;
  } else if (tier === 'moderate') {
    basis = `Between €${CHEAP_MAX.toFixed(2)} and €${MODERATE_MAX.toFixed(2)}/kWh — ${avgPhrase}.`;
  } else {
    basis = `Above €${MODERATE_MAX.toFixed(2)}/kWh (peak tier) and ${avgPhrase}.`;
  }

  const headline = {
    good: 'Yes — good time to use electricity',
    ok: 'OK for normal use; delay heavy loads if you can',
    wait: 'Not ideal — wait if you can',
  }[verdict];

  return {
    verdict,
    verdictLabel,
    tier,
    price,
    headline,
    action: recommendationFor(slot),
    basis,
    comparedToAvg,
    dayAvg: avg,
    nextChange: change ? { ...change, label: slotLabel(change.slot) } : null,
  };
}

export function isLiveEntsoSource(source: string): boolean {
  return source.includes('ENTSO-E day-ahead (live)');
}

/** Aggregate the 48 half-hourly values into 24 hourly averages, for the line chart. */
export function hourlyAverages(): number[] {
  const arr = LIVE_PRICES ?? HALF_HOURLY_PRICES;
  return Array.from({ length: 24 }, (_, h) => (arr[h * 2] + arr[h * 2 + 1]) / 2);
}

export function dayStats() {
  const prices = LIVE_PRICES ?? HALF_HOURLY_PRICES;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  return { min, max, avg, minSlot: prices.indexOf(min), maxSlot: prices.indexOf(max) };
}

// ---------------------------------------------------------------------------
// Range-aware series for the Analytics chart. Each returns { labels, data }.
// Values are derived deterministically from the real half-hourly curve so the
// weekly / monthly / yearly views are self-consistent and stable across
// reloads (no random flicker). When a live price/usage feed is connected,
// these are the functions to swap.
// ---------------------------------------------------------------------------

const dayAvg = () => { const a = LIVE_PRICES ?? HALF_HOURLY_PRICES; return a.reduce((x, y) => x + y, 0) / a.length; };

// small deterministic wobble around a base, seeded by an index
function wobble(base: number, i: number, spread: number): number {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  const frac = s - Math.floor(s); // 0..1 deterministic
  return +(base * (1 + (frac - 0.5) * spread)).toFixed(3);
}

export interface RangeSeries { labels: string[]; data: number[]; unit: string; title: string; }

export function seriesForRange(range: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly'): RangeSeries {
  const base = dayAvg();
  if (range === 'Daily') {
    return {
      labels: ['00', '04', '08', '12', '16', '20'],
      data: hourlyAverages().filter((_, i) => i % 4 === 0),
      unit: '€/kWh', title: 'Price through the day',
    };
  }
  if (range === 'Weekly') {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // weekend days trend slightly cheaper
    return {
      labels: days,
      data: days.map((d, i) => wobble(base * (i >= 5 ? 0.92 : 1.0), i + 1, 0.18)),
      unit: '€/kWh avg', title: 'Average price by day',
    };
  }
  if (range === 'Monthly') {
    return {
      labels: ['W1', 'W2', 'W3', 'W4'],
      data: [1, 2, 3, 4].map((w) => wobble(base, w * 7, 0.14)),
      unit: '€/kWh avg', title: 'Average price by week',
    };
  }
  // Yearly — seasonal shape: winter dearer, summer cheaper
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const seasonal = [1.18, 1.15, 1.05, 0.98, 0.9, 0.85, 0.83, 0.85, 0.92, 1.0, 1.1, 1.16];
  return {
    labels: months,
    data: months.map((m, i) => wobble(base * seasonal[i], i + 1, 0.06)),
    unit: '€/kWh avg', title: 'Average price by month',
  };
}

export function rangeStats(series: RangeSeries) {
  const min = Math.min(...series.data);
  const max = Math.max(...series.data);
  const avg = series.data.reduce((a, b) => a + b, 0) / series.data.length;
  return {
    min, max, avg,
    minLabel: series.labels[series.data.indexOf(min)],
    maxLabel: series.labels[series.data.indexOf(max)],
  };
}
