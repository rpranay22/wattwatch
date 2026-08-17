import { safeRouter } from '../safeRouter.js';
import { Onboarding } from '../models/index.js';
import { requireUser } from '../auth.js';
import { logActivity } from '../activity.js';

const router = safeRouter();
router.use(requireUser);

router.get('/', async (req, res) => {
  const r = await Onboarding.findByPk(req.userId);
  if (!r) return res.json(null);
  res.json({
    devices: typeof r.devices === 'string' ? JSON.parse(r.devices) : r.devices,
    householdSize: r.household_size,
    supplier: r.supplier,
  });
});

router.put('/', async (req, res) => {
  const { devices = [], householdSize = null, supplier = null } = req.body || {};
  await Onboarding.upsert({
    user_id: req.userId,
    devices,
    household_size: householdSize,
    supplier,
  });
  await logActivity({ userId: req.userId, action: 'onboarding_complete', detail: { devices, householdSize } });
  res.json({ ok: true });
});

export default router;
