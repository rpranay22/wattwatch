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

/** Map legacy tab names from older app builds. */
function normalizeRange(range) {
  const key = String(range || 'hourly').toLowerCase();
  if (key === 'daily') return 'hourly';
  if (key === 'weekly') return 'daily';
  if (key === 'yearly') return 'weekly';
  return key;
}

async function dailyAverageForDay(dayISO) {
  const { prices, source } = await getHalfHourlyPrices(dayISO);
  return { avg: statsFromPrices(prices).avg, source };
}

/** Real ENTSO-E price series for Analytics charts. */
export async function getPriceAnalytics(range) {
  const today = dublinDayKey();
  const key = normalizeRange(range);

  // Hourly: today's 48 half-hour ENTSO slots
  if (key === 'hourly') {
    const { prices, source, day } = await getHalfHourlyPrices(today);
    const labels = Array.from({ length: 48 }, (_, i) => slotLabel(i));
    const data = prices.slice(0, 48).map((p) => +Number(p).toFixed(4));
    const stats = statsFromPrices(prices);
    return {
      range: 'Hourly',
      title: 'Half-hourly price — today',
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

  // Daily: one average per day for the last 7 days
  if (key === 'daily') {
    const labels = [];
    const data = [];
    let source = '';
    for (let i = 6; i >= 0; i--) {
      const dayISO = offsetDublinDay(today, -i);
      const { avg, source: s } = await dailyAverageForDay(dayISO);
      source = s;
      labels.push(shortDayLabel(dayISO));
      data.push(+avg.toFixed(4));
    }
    return buildSummary(
      'Daily',
      'Daily average — last 7 days',
      '€/kWh avg',
      labels,
      data,
      source,
    );
  }

  // Weekly: one average per week for the last 8 weeks
  if (key === 'weekly') {
    const labels = [];
    const data = [];
    let source = '';
    for (let w = 7; w >= 0; w--) {
      let sum = 0;
      for (let d = 0; d < 7; d++) {
        const dayISO = offsetDublinDay(today, -(w * 7 + d));
        const { avg, source: s } = await dailyAverageForDay(dayISO);
        source = s;
        sum += avg;
      }
      labels.push(w === 0 ? 'This week' : `${w}w ago`);
      data.push(+(sum / 7).toFixed(4));
    }
    return buildSummary(
      'Weekly',
      'Weekly average — last 8 weeks',
      '€/kWh avg',
      labels,
      data,
      source,
    );
  }

  // Monthly: one average per calendar month for the last 12 months
  if (key === 'monthly') {
    const labels = [];
    const data = [];
    let source = '';
    const [todayY, todayMo] = today.split('-').map(Number);

    for (let i = 11; i >= 0; i--) {
      let mo = todayMo - i;
      let y = todayY;
      while (mo < 1) {
        mo += 12;
        y -= 1;
      }
      const daysInMonth = new Date(y, mo, 0).getDate();
      const isCurrentMonth = y === todayY && mo === todayMo;
      const lastDay = isCurrentMonth ? parseInt(today.split('-')[2], 10) : daysInMonth;

      let sum = 0;
      let count = 0;
      for (let d = 1; d <= lastDay; d++) {
        const dayISO = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (dayISO > today) break;
        const { avg, source: s } = await dailyAverageForDay(dayISO);
        source = s;
        sum += avg;
        count += 1;
      }

      const monthLabel = new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-IE', {
        month: 'short',
        year: y === todayY ? undefined : '2-digit',
        timeZone: 'UTC',
      });
      labels.push(monthLabel);
      data.push(count ? +(sum / count).toFixed(4) : 0);
    }
    return buildSummary(
      'Monthly',
      'Monthly average — last 12 months',
      '€/kWh avg',
      labels,
      data,
      source,
    );
  }

  throw new Error('range must be hourly, daily, weekly, or monthly');
}
