import { safeRouter } from '../safeRouter.js';
import { randomUUID } from 'crypto';
import { db } from '../db.js';
import { requireUser } from '../auth.js';
import { logActivity } from '../activity.js';
const router = safeRouter();
router.use(requireUser);

const parseDays = (d) => (typeof d === 'string' ? JSON.parse(d) : d);
const shape = (r) => ({ id: r.id, name: r.name, kind: r.kind, condition: r.condition_t,
  threshold: r.threshold === null ? null : Number(r.threshold), start: r.start_time,
  end: r.end_time, days: parseDays(r.days), enabled: !!r.enabled });

router.get('/', async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
  res.json(rows.map(shape));
});

router.post('/', async (req, res) => {
  const { name, kind, condition=null, threshold=null, start=null, end=null, days=[] } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Give the alert a name' });
  if (!['price','time'].includes(kind)) return res.status(400).json({ error: 'kind must be price or time' });
  if (kind === 'price' && (threshold === null || isNaN(Number(threshold)))) return res.status(400).json({ error: 'A price alert needs a threshold' });
  if (kind === 'time' && (!start || !end)) return res.status(400).json({ error: 'A time alert needs a start and end time' });
  const id = randomUUID();
  await db.execute(
    `INSERT INTO alerts (id, user_id, name, kind, condition_t, threshold, start_time, end_time, days, enabled)
     VALUES (?,?,?,?,?,?,?,?,?,TRUE)`,
    [id, req.userId, name.trim(), kind, kind==='price'?condition:null, kind==='price'?Number(threshold):null,
     kind==='time'?start:null, kind==='time'?end:null, JSON.stringify(days)]);
  await logActivity({ userId: req.userId, action: 'alert_create', detail: { id, kind } });
  const [rows] = await db.execute('SELECT * FROM alerts WHERE id = ?', [id]);
  res.status(201).json(shape(rows[0]));
});

router.put('/:id', async (req, res) => {
  const { enabled } = req.body || {};
  const [r] = await db.execute('UPDATE alerts SET enabled = ? WHERE id = ? AND user_id = ?',
    [!!enabled, req.params.id, req.userId]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Alert not found' });
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  const [r] = await db.execute('DELETE FROM alerts WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Alert not found' });
  res.json({ ok: true });
});
export default router;
