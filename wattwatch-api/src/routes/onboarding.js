import { safeRouter } from '../safeRouter.js';
import { db } from '../db.js';
import { requireUser } from '../auth.js';
import { logActivity } from '../activity.js';
const router = safeRouter();
router.use(requireUser);

router.get('/', async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM onboarding WHERE user_id = ?', [req.userId]);
  const r = rows[0];
  if (!r) return res.json(null);
  res.json({ devices: typeof r.devices === 'string' ? JSON.parse(r.devices) : r.devices,
             householdSize: r.household_size, supplier: r.supplier });
});

router.put('/', async (req, res) => {
  const { devices = [], householdSize = null, supplier = null } = req.body || {};
  await db.execute(
    `INSERT INTO onboarding (user_id, devices, household_size, supplier) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE devices=VALUES(devices), household_size=VALUES(household_size), supplier=VALUES(supplier)`,
    [req.userId, JSON.stringify(devices), householdSize, supplier]);
  await logActivity({ userId: req.userId, action: 'onboarding_complete', detail: { devices, householdSize } });
  res.json({ ok: true });
});
export default router;
