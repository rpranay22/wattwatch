// APP user auth. Writes to the users table only.
import { randomUUID } from 'crypto';
import { logActivity } from '../activity.js';
import { hashPassword, requireUser, signUserToken, verifyPassword } from '../auth.js';
import { lookupCrmCustomer } from '../crmApiClient.js';
import { Profile, User } from '../models/index.js';
import { safeRouter } from '../safeRouter.js';

const router = safeRouter();
const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

router.post('/signup', async (req, res) => {
  const { email, password, fullName = null } = req.body || {};
  if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const normalized = email.toLowerCase().trim();
  const dupe = await User.findOne({ where: { email: normalized } });
  if (dupe) return res.status(409).json({ error: 'That email is already registered' });

  const id = randomUUID();
  await User.create({ id, email: normalized, password_hash: await hashPassword(password) });
  await Profile.create({ user_id: id, full_name: fullName });
  await logActivity({ userId: id, action: 'signup' });

  const user = { id, email: normalized };
  res.status(201).json({ token: signUserToken(user), user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const normalized = String(email).toLowerCase().trim();
  const crmCustomer = await lookupCrmCustomer(normalized);
  const passwordHash = crmCustomer?.data;
  if (!passwordHash || !(await verifyPassword(password, passwordHash)))
    return res.status(401).json({ error: 'Wrong email or password' });

  if (crmCustomer.status === 'suspended' || crmCustomer.status === 'SUSPENDED')
    return res.status(403).json({ error: 'This account has been suspended. Contact support.' });

  let user = await User.findOne({ where: { email: normalized } });
  if (!user) {
    const id = randomUUID();
    user = await User.create({ id, email: normalized, password_hash: passwordHash });
    await Profile.create({ user_id: id, full_name: null });
  } else {
    await user.update({ password_hash: passwordHash, last_login_at: new Date() });
  }

  res.json({ token: signUserToken(user), user: { id: user.id, email: user.email } });
});

router.get('/me', requireUser, async (req, res) => {
  const user = await User.findByPk(req.userId, { attributes: ['id', 'email'] });
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });
  res.json({ user: user.get({ plain: true }) });
});

router.put('/password', requireUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Current and new password are both required' });
  if (newPassword.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters' });

  const user = await User.findByPk(req.userId, { attributes: ['password_hash'] });
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });

  if (!(await verifyPassword(currentPassword, user.password_hash)))
    return res.status(400).json({ error: 'Your current password is not correct' });

  await user.update({ password_hash: await hashPassword(newPassword) });
  await logActivity({ userId: req.userId, action: 'password_change' });
  res.json({ ok: true });
});

router.delete('/account', requireUser, async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Enter your password to confirm deletion' });

  const user = await User.findByPk(req.userId, { attributes: ['password_hash'] });
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });
  if (!(await verifyPassword(password, user.password_hash)))
    return res.status(400).json({ error: 'That password is not correct' });

  await logActivity({ userId: req.userId, action: 'account_delete' });
  await user.destroy();
  res.json({ ok: true });
});

router.post('/device', async (req, res) => {
  const { deviceId } = req.body || {};
  if (!deviceId || String(deviceId).length < 8)
    return res.status(400).json({ error: 'A valid deviceId is required' });

  const email = `device_${String(deviceId).toLowerCase()}@device.wattwatch`;
  let user = await User.findOne({ where: { email }, attributes: ['id', 'email'] });

  if (user) {
    await user.update({ last_login_at: new Date() });
  } else {
    const id = randomUUID();
    await User.create({ id, email, password_hash: await hashPassword(randomUUID()) });
    await Profile.create({ user_id: id, full_name: null });
    await logActivity({ userId: id, action: 'device_register' });
    user = { id, email };
  }

  res.json({ token: signUserToken(user), user });
});

export default router;
