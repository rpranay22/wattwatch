import { safeRouter } from '../safeRouter.js';
import { Profile, User } from '../models/index.js';
import { requireUser } from '../auth.js';
import { logActivity } from '../activity.js';

const router = safeRouter();
router.use(requireUser);

router.get('/', async (req, res) => {
  const profile = await Profile.findOne({
    where: { user_id: req.userId },
    include: [{ model: User, attributes: ['email'] }],
  });
  if (!profile) return res.json(null);
  const plain = profile.get({ plain: true });
  const { User: userRow, ...profileData } = plain;
  res.json({ ...profileData, email: userRow?.email });
});

router.put('/', async (req, res) => {
  const { fullName = null, phone = null, mprn = null, address = null, city = null, eircode = null, supplier = null } = req.body || {};
  await Profile.upsert({
    user_id: req.userId,
    full_name: fullName,
    phone,
    mprn,
    address,
    city,
    eircode,
    supplier,
  });
  await logActivity({ userId: req.userId, action: 'profile_update' });
  res.json({ ok: true });
});

export default router;
