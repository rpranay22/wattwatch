import { safeRouter } from '../safeRouter.js';
import { Profile, User } from '../models/index.js';
import { requireUser } from '../auth.js';
import { logActivity } from '../activity.js';
import { profileNeedsCrmSync, syncProfileFromCrm } from '../crmProfileSync.js';

const router = safeRouter();
router.use(requireUser);

router.get('/', async (req, res) => {
  let profile = await Profile.findOne({
    where: { user_id: req.userId },
    include: [{ model: User, attributes: ['email'] }],
  });

  const user = profile?.User ?? await User.findByPk(req.userId, { attributes: ['email'] });
  const email = user?.email;

  if (email && (!profile || profileNeedsCrmSync(profile))) {
    await syncProfileFromCrm(req.userId, email).catch(() => {});
    profile = await Profile.findOne({
      where: { user_id: req.userId },
      include: [{ model: User, attributes: ['email'] }],
    });
  }

  if (!profile) return res.json(null);
  const plain = profile.get({ plain: true });
  const { User: userRow, ...profileData } = plain;
  res.json({ ...profileData, email: userRow?.email });
});

/** Pull latest details from energy-switch / CRM signup (manual refresh). */
router.post('/sync', async (req, res) => {
  const user = await User.findByPk(req.userId, { attributes: ['email'] });
  if (!user?.email) return res.status(400).json({ error: 'No email on account' });

  const ok = await syncProfileFromCrm(req.userId, user.email, { overwrite: true });
  if (!ok) {
    return res.status(404).json({
      error: 'No signup record found for your email. Complete the form at energy-switch first.',
    });
  }

  const profile = await Profile.findOne({ where: { user_id: req.userId } });
  res.json({ ok: true, profile: profile?.get({ plain: true }) ?? null });
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
