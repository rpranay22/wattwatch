// Server-side cheap-window watcher. Sends FCM push to all registered devices
// when ENTSO-E price enters the cheap tier — works even when the app is closed.

import { getHalfHourlyPrices } from './entso.js';
import { PushToken } from './models/index.js';
import { sendFcmToTokens, tierForPrice, cheapWindowMessage } from './pushService.js';

let lastTier = null;
let cheapWindowNotified = false;
let lastDay = null;

function currentSlot() {
  const now = new Date();
  return Math.floor((now.getHours() * 60 + now.getMinutes()) / 30);
}

async function tick() {
  const { prices, day } = await getHalfHourlyPrices();
  if (day !== lastDay) {
    lastDay = day;
    lastTier = null;
    cheapWindowNotified = false;
  }

  const price = prices[currentSlot()];
  const tier = tierForPrice(price);

  if (tier !== 'cheap') {
    lastTier = tier;
    cheapWindowNotified = false;
    return;
  }

  if (cheapWindowNotified) return;

  const entering = lastTier !== null && lastTier !== 'cheap';
  const { title, body } = cheapWindowMessage(price, entering);

  const rows = await PushToken.findAll({
    where: { cheap_window: true },
    attributes: ['token'],
  });
  const tokens = rows.map((r) => r.token);
  if (tokens.length) {
    const result = await sendFcmToTokens(tokens, {
      title,
      body,
      data: { type: 'cheap_window', price: String(price) },
    });
    console.log(`Cheap-window push: ${result.sent} sent to ${tokens.length} device(s)`);
  }

  cheapWindowNotified = true;
  lastTier = tier;
}

export function startCheapWindowWatcher() {
  if (process.env.NODE_ENV === 'test') return;
  if (process.env.DISABLE_PUSH_WATCHER === 'true') return;

  console.log('Cheap-window push watcher started (checks every 60s)');
  tick().catch((e) => console.warn('cheap-window tick:', e.message));
  setInterval(() => tick().catch((e) => console.warn('cheap-window tick:', e.message)), 60_000);
}
