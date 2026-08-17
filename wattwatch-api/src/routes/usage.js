// Powers the Calendar screen. GET /usage?month=YYYY-MM
import { safeRouter } from '../safeRouter.js';
import { requireUser } from '../auth.js';
import { getMonthUsage, getSavingsSummary } from '../usage.js';
const router = safeRouter();
router.use(requireUser);

router.get('/savings', async (req, res) => {
  res.json(await getSavingsSummary(req.userId));
});

router.get('/', async (req, res) => {
  const m = String(req.query.month || '');
  const match = m.match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) : now.getMonth() + 1;
  if (month < 1 || month > 12) return res.status(400).json({ error: 'month must be YYYY-MM' });
  const days = await getMonthUsage(req.userId, year, month);
  res.json({ month: `${year}-${String(month).padStart(2,'0')}`, days });
});
export default router;
