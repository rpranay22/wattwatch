import { safeRouter } from '../safeRouter.js';
import { randomUUID } from 'crypto';
import { Alert } from '../models/index.js';
import { requireUser } from '../auth.js';
import { logActivity } from '../activity.js';

const router = safeRouter();
router.use(requireUser);

const parseDays = (d) => (typeof d === 'string' ? JSON.parse(d) : d);
const shape = (r) => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  condition: r.condition_t,
  threshold: r.threshold === null ? null : Number(r.threshold),
  start: r.start_time,
  end: r.end_time,
  days: parseDays(r.days),
  enabled: !!r.enabled,
});

router.get('/', async (req, res) => {
  const rows = await Alert.findAll({
    where: { user_id: req.userId },
    order: [['created_at', 'DESC']],
  });
  res.json(rows.map((r) => shape(r.get({ plain: true }))));
});

router.post('/', async (req, res) => {
  const { name, kind, condition = null, threshold = null, start = null, end = null, days = [] } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Give the alert a name' });
  if (!['price', 'time'].includes(kind)) return res.status(400).json({ error: 'kind must be price or time' });
  if (kind === 'price' && (threshold === null || isNaN(Number(threshold)))) return res.status(400).json({ error: 'A price alert needs a threshold' });
  if (kind === 'time' && (!start || !end)) return res.status(400).json({ error: 'A time alert needs a start and end time' });

  const id = randomUUID();
  await Alert.create({
    id,
    user_id: req.userId,
    name: name.trim(),
    kind,
    condition_t: kind === 'price' ? condition : null,
    threshold: kind === 'price' ? Number(threshold) : null,
    start_time: kind === 'time' ? start : null,
    end_time: kind === 'time' ? end : null,
    days,
    enabled: true,
  });
  await logActivity({ userId: req.userId, action: 'alert_create', detail: { id, kind } });

  const row = await Alert.findByPk(id);
  res.status(201).json(shape(row.get({ plain: true })));
});

router.put('/:id', async (req, res) => {
  const { enabled } = req.body || {};
  const [affected] = await Alert.update(
    { enabled: !!enabled },
    { where: { id: req.params.id, user_id: req.userId } }
  );
  if (!affected) return res.status(404).json({ error: 'Alert not found' });
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  const affected = await Alert.destroy({ where: { id: req.params.id, user_id: req.userId } });
  if (!affected) return res.status(404).json({ error: 'Alert not found' });
  res.json({ ok: true });
});

export default router;
