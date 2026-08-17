// Public price endpoint. The app reads today's half-hourly prices from here.
// No auth needed — prices aren't user-specific. Returns the 48 values plus a
// clear "source" so the app can show whether prices are live or simulated.
import { safeRouter } from '../safeRouter.js';
import { getHalfHourlyPrices } from '../entso.js';

const router = safeRouter();

router.get('/', async (req, res) => {
  const { prices, source, day } = await getHalfHourlyPrices();
  res.json({ day, source, prices });
});

export default router;
