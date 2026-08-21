// APP user auth. Login password is owned by CRM customers.passwordHash (shared DB).
import { logActivity } from '../activity.js';
import { hashPassword, requireUser, signUserToken, verifyPassword } from '../auth.js';
import { resolveLoginPasswordHash, syncPasswordToCrm, deleteCustomerFromCrm } from '../crmApiClient.js';
import { syncProfileFromCrm } from '../crmProfileSync.js';
import { Profile, User } from '../models/index.js';
import { safeRouter } from '../safeRouter.js';

const router = safeRouter();
const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

router.post('/signup', async (req, res) => {
  const { email, password, fullName = null } = req.body || {};
  if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const normalized = email.toLowerCase().trim();
  const passwordHash = await hashPassword(password);
  const synced = await syncPasswordToCrm(normalized, passwordHash);
  if (!synced) {
    return res.status(409).json({
      error: 'This email is not registered in our system. Sign up via the energy-switch form first.',
    });
  }

  let user = await User.findOne({ where: { email: normalized } });
  if (!user) {
    user = await User.create({ email: normalized, password_hash: passwordHash });
    await Profile.create({ user_id: user.id, full_name: fullName });
  } else {
    await user.update({ password_hash: passwordHash });
  }

  await logActivity({ userId: user.id, action: 'signup' });
  res.status(201).json({ token: signUserToken(user), user: { id: user.id, email: normalized } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const normalized = String(email).toLowerCase().trim();
  const passwordHash = await resolveLoginPasswordHash(normalized);
  if (!passwordHash || !(await verifyPassword(password, passwordHash)))
    return res.status(401).json({ error: 'Wrong email or password' });

  let user = await User.findOne({ where: { email: normalized } });
  if (!user) {
    user = await User.create({ email: normalized, password_hash: passwordHash });
    await Profile.create({ user_id: user.id, full_name: null });
  } else {
    await user.update({ password_hash: passwordHash, last_login_at: new Date() });
  }

  await syncProfileFromCrm(user.id, normalized).catch(() => {});

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

  const user = await User.findByPk(req.userId, { attributes: ['id', 'email', 'password_hash'] });
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });

  const hashForVerify = await resolveLoginPasswordHash(user.email) ?? user.password_hash;
  if (!(await verifyPassword(currentPassword, hashForVerify)))
    return res.status(400).json({ error: 'Your current password is not correct' });

  const newHash = await hashPassword(newPassword);
  const synced = await syncPasswordToCrm(user.email, newHash);
  if (!synced) {
    return res.status(502).json({
      error: 'Could not update your password in the account system. Please try again later.',
    });
  }

  await user.update({ password_hash: newHash });
  await logActivity({ userId: req.userId, action: 'password_change' });
  res.json({ ok: true });
});

router.delete('/account', requireUser, async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Enter your password to confirm deletion' });

  const user = await User.findByPk(req.userId, { attributes: ['id', 'email', 'password_hash'] });
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });

  const hashForVerify = await resolveLoginPasswordHash(user.email) ?? user.password_hash;
  if (!(await verifyPassword(password, hashForVerify)))
    return res.status(400).json({ error: 'That password is not correct' });

  const crmRemoved = await deleteCustomerFromCrm(user.email);
  if (!crmRemoved) {
    return res.status(502).json({
      error: 'Could not remove your account from our system. Please try again or contact support.',
    });
  }

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
    const { randomUUID } = await import('crypto');
    user = await User.create({ email, password_hash: await hashPassword(randomUUID()) });
    await Profile.create({ user_id: user.id, full_name: null });
    await logActivity({ userId: user.id, action: 'device_register' });
  }

  res.json({ token: signUserToken(user), user });
});

export default router;
