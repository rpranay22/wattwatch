import { safeRouter } from '../safeRouter.js';
import { randomUUID } from 'crypto';
import { db } from '../db.js';
import { requireUser } from '../auth.js';
import { logActivity } from '../activity.js';
const router = safeRouter();
router.use(requireUser);

router.post('/', async (req, res) => {
  const { format, period = null } = req.body || {};
  if (!['pdf','csv','json'].includes(format)) return res.status(400).json({ error: 'format must be pdf, csv or json' });
  const id = randomUUID();
  await db.execute('INSERT INTO exports (id, user_id, format, period, status) VALUES (?,?,?,?,?)',
    [id, req.userId, format, period, 'queued']);
  await logActivity({ userId: req.userId, action: 'export_request', detail: { format } });
  res.status(201).json({ id, format, period, status: 'queued' });
});

router.get('/', async (req, res) => {
  const [rows] = await db.execute(
    'SELECT id, format, period, status, created_at FROM exports WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
  res.json(rows);
});
export default router;
