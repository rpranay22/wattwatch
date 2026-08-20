// Public price endpoint. The app reads today's half-hourly prices from here.
// No auth needed — prices aren't user-specific. Returns the 48 values plus a
// clear "source" so the app can show whether prices are live or simulated.
import { safeRouter } from '../safeRouter.js';
import { getHalfHourlyPrices } from '../entso.js';

const router = safeRouter();

router.get('/', async (req, res) => {
  const day = typeof req.query.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.day)
    ? req.query.day
    : undefined;
  const { prices, source, day: resolvedDay } = await getHalfHourlyPrices(day);
  res.json({ day: resolvedDay, source, prices });
});

export default router;
