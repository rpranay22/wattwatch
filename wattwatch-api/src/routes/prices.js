// Public price endpoint. The app reads today's half-hourly prices from here.
// No auth needed — prices aren't user-specific. Returns the 48 values plus a
// clear "source" so the app can show whether prices are live or simulated.
import { safeRouter } from '../safeRouter.js';
import { getHalfHourlyPrices } from '../entso.js';
import { getPriceAnalytics } from '../priceAnalytics.js';

const router = safeRouter();

router.get('/analytics', async (req, res) => {
  try {
    const range = String(req.query.range || 'daily');
    res.json(await getPriceAnalytics(range));
  } catch (e) {
    res.status(400).json({ error: e.message || 'Invalid analytics range' });
  }
});

router.get('/', async (req, res) => {
  const day = typeof req.query.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.day)
    ? req.query.day
    : undefined;
  const { prices, source, day: resolvedDay } = await getHalfHourlyPrices(day);
  res.json({ day: resolvedDay, source, prices });
});

export default router;
