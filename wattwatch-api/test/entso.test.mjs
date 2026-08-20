import assert from 'node:assert/strict';
import {
  parseEntsoXml,
  entsoValuesToHalfHourly,
  FALLBACK,
} from '../src/entso.js';
import {
  statsFromPrices,
  cheapestWindowFromPrices,
  dublinSlot,
  tierForPrice,
  CHEAP_MAX,
  MODERATE_MAX,
} from '../src/priceUtils.js';

let n = 0;
function ok(msg) { n++; console.log(`  ok  ${msg}`); }

const hourlyXml = `<?xml version="1.0"?>
<Publication_MarketDocument>
  <TimeSeries>
    <period>
      <resolution>PT60M</resolution>
      <Point><position>1</position><price.amount>100</price.amount></Point>
      <Point><position>2</position><price.amount>200</price.amount></Point>
    </period>
  </TimeSeries>
</Publication_MarketDocument>`;

const parsedHourly = parseEntsoXml(hourlyXml);
assert.strictEqual(parsedHourly.minutes, 60);
assert.strictEqual(parsedHourly.values.length, 2);
ok('parseEntsoXml: reads hourly TimeSeries');

const halfHourly = entsoValuesToHalfHourly({ minutes: 60, values: Array.from({ length: 24 }, (_, i) => 100 + i * 10) });
assert.strictEqual(halfHourly.length, 48);
assert.strictEqual(halfHourly[0], halfHourly[1]);
ok('entsoValuesToHalfHourly: expands 24 hourly points to 48 slots');

const stats = statsFromPrices(FALLBACK);
assert.ok(Math.abs(stats.avg - FALLBACK.reduce((a, b) => a + b, 0) / 48) < 0.0001);
assert.strictEqual(stats.min, Math.min(...FALLBACK));
assert.strictEqual(stats.max, Math.max(...FALLBACK));
ok('statsFromPrices: avg/min/max match the 48-slot curve');

const win = cheapestWindowFromPrices(FALLBACK, 6);
assert.ok(win.avg <= stats.avg);
assert.match(win.label, /\d{2}:\d{2}/);
ok('cheapestWindowFromPrices: finds a window label');

assert.ok(dublinSlot() >= 0 && dublinSlot() <= 47);
ok('dublinSlot: returns valid slot index');

assert.strictEqual(tierForPrice(CHEAP_MAX - 0.01), 'cheap');
assert.strictEqual(tierForPrice(CHEAP_MAX + 0.01), 'moderate');
assert.strictEqual(tierForPrice(MODERATE_MAX + 0.01), 'expensive');
ok('tierForPrice: uses shared cheap/moderate thresholds');

console.log(`\n${n} checks passed.`);
