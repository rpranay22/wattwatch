import { getHalfHourlyPrices } from './entso.js';
import {
  dublinDayKey,
  statsFromPrices,
  offsetDublinDay,
  shortDayLabel,
  slotLabel,
} from './priceUtils.js';

function buildSummary(range, title, unit, labels, data, source) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  return {
    range,
    title,
    unit,
    labels,
    data,
    source,
    summary: {
      min: +min.toFixed(4),
      max: +max.toFixed(4),
      avg: +avg.toFixed(4),
      minLabel: labels[data.indexOf(min)],
      maxLabel: labels[data.indexOf(max)],
    },
  };
}

/** Real ENTSO-E price series for Analytics charts. */
export async function getPriceAnalytics(range) {
  const today = dublinDayKey();
  const key = String(range || 'daily').toLowerCase();

  if (key === 'daily') {
    const { prices, source, day } = await getHalfHourlyPrices(today);
    const labels = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
    const data = Array.from({ length: 24 }, (_, h) =>
      +(((prices[h * 2] + prices[h * 2 + 1]) / 2).toFixed(4)),
    );
    const stats = statsFromPrices(prices);
    return {
      range: 'Daily',
      title: 'Price through today (hourly average)',
      unit: '€/kWh',
      labels,
      data,
      source,
      day,
      summary: {
        min: +stats.min.toFixed(4),
        max: +stats.max.toFixed(4),
        avg: +stats.avg.toFixed(4),
        minLabel: slotLabel(stats.minSlot),
        maxLabel: slotLabel(stats.maxSlot),
      },
    };
  }

  if (key === 'weekly') {
    const labels = [];
    const data = [];
    let source = '';
    for (let i = 6; i >= 0; i--) {
      const dayISO = offsetDublinDay(today, -i);
      const { prices, source: s } = await getHalfHourlyPrices(dayISO);
      source = s;
      labels.push(shortDayLabel(dayISO));
      data.push(+statsFromPrices(prices).avg.toFixed(4));
    }
    return buildSummary('Weekly', 'Daily average — last 7 days', '€/kWh avg', labels, data, source);
  }

  if (key === 'monthly') {
    const [y, mo] = today.split('-').map(Number);
    const labels = [];
    const data = [];
    let source = '';
    const dayNum = parseInt(today.split('-')[2], 10);
    for (let d = 1; d <= dayNum; d++) {
      const dayISO = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const { prices, source: s } = await getHalfHourlyPrices(dayISO);
      source = s;
      labels.push(String(d));
      data.push(+statsFromPrices(prices).avg.toFixed(4));
    }
    return buildSummary('Monthly', 'Daily average — this month', '€/kWh avg', labels, data, source);
  }

  if (key === 'yearly') {
    const labels = [];
    const data = [];
    let source = '';
    for (let w = 11; w >= 0; w--) {
      const weekDays = [];
      for (let d = 0; d < 7; d++) weekDays.push(offsetDublinDay(today, -(w * 7 + d)));
      let sum = 0;
      for (const dayISO of weekDays) {
        const { prices, source: s } = await getHalfHourlyPrices(dayISO);
        source = s;
        sum += statsFromPrices(prices).avg;
      }
      labels.push(w === 0 ? 'This week' : `${w}w ago`);
      data.push(+(sum / 7).toFixed(4));
    }
    return buildSummary('Yearly', 'Weekly average — last 12 weeks', '€/kWh avg', labels, data, source);
  }

  throw new Error('range must be daily, weekly, monthly, or yearly');
}
