import assert from 'node:assert/strict';
import { getPriceAnalytics } from '../src/priceAnalytics.js';

let n = 0;
function ok(msg) { n++; console.log(`  ok  ${msg}`); }

const hourly = await getPriceAnalytics('hourly');
assert.strictEqual(hourly.range, 'Hourly');
assert.strictEqual(hourly.data.length, 24);
ok('hourly: 24 hourly points for today');

const daily = await getPriceAnalytics('daily');
assert.strictEqual(daily.range, 'Daily');
assert.strictEqual(daily.data.length, 7);
ok('daily: 7 daily averages');

const weekly = await getPriceAnalytics('weekly');
assert.strictEqual(weekly.range, 'Weekly');
assert.strictEqual(weekly.data.length, 8);
ok('weekly: 8 weekly averages');

const monthly = await getPriceAnalytics('monthly');
assert.strictEqual(monthly.range, 'Monthly');
assert.strictEqual(monthly.data.length, 12);
ok('monthly: 12 monthly averages');

console.log(`\n${n} checks passed.`);
