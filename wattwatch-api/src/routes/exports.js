import { safeRouter } from '../safeRouter.js';
import { randomUUID } from 'crypto';
import { Export } from '../models/index.js';
import { requireUser } from '../auth.js';
import { logActivity } from '../activity.js';

const router = safeRouter();
router.use(requireUser);

router.post('/', async (req, res) => {
  const { format, period = null } = req.body || {};
  if (!['pdf', 'csv', 'json'].includes(format)) return res.status(400).json({ error: 'format must be pdf, csv or json' });

  const id = randomUUID();
  await Export.create({ id, user_id: req.userId, format, period, status: 'queued' });
  await logActivity({ userId: req.userId, action: 'export_request', detail: { format } });
  res.status(201).json({ id, format, period, status: 'queued' });
});

router.get('/', async (req, res) => {
  const rows = await Export.findAll({
    where: { user_id: req.userId },
    attributes: ['id', 'format', 'period', 'status', 'created_at'],
    order: [['created_at', 'DESC']],
  });
  res.json(rows.map((r) => r.get({ plain: true })));
});

export default router;
