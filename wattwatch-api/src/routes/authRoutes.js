// APP user auth. Writes to the users table only.
import { safeRouter } from '../safeRouter.js';
import { randomUUID } from 'crypto';
import { db } from '../db.js';
import { hashPassword, verifyPassword, signUserToken, requireUser } from '../auth.js';
import { logActivity } from '../activity.js';

const router = safeRouter();
const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

router.post('/signup', async (req, res) => {
  const { email, password, fullName = null } = req.body || {};
  if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const [dupe] = await db.execute('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (dupe.length) return res.status(409).json({ error: 'That email is already registered' });

  const id = randomUUID();
  await db.execute('INSERT INTO users (id, email, password_hash) VALUES (?,?,?)',
    [id, email.toLowerCase().trim(), await hashPassword(password)]);
  await db.execute('INSERT INTO profiles (user_id, full_name) VALUES (?,?)', [id, fullName]);
  await logActivity({ userId: id, action: 'signup' });

  const user = { id, email: email.toLowerCase().trim() };
  res.status(201).json({ token: signUserToken(user), user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase().trim()]);
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash)))
    return res.status(401).json({ error: 'Wrong email or password' });
  if (user.status === 'suspended')
    return res.status(403).json({ error: 'This account has been suspended. Contact support.' });

  await db.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
  await logActivity({ userId: user.id, action: 'login' });
  res.json({ token: signUserToken(user), user: { id: user.id, email: user.email } });
});

router.get('/me', requireUser, async (req, res) => {
  const [rows] = await db.execute('SELECT id, email FROM users WHERE id = ?', [req.userId]);
  if (!rows.length) return res.status(401).json({ error: 'Account no longer exists' });
  res.json({ user: rows[0] });
});

// Change password. Requires the current password, so a stolen session alone
// cannot lock the real owner out of their account.
router.put('/password', requireUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Current and new password are both required' });
  if (newPassword.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters' });

  const [rows] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [req.userId]);
  if (!rows.length) return res.status(401).json({ error: 'Account no longer exists' });

  if (!(await verifyPassword(currentPassword, rows[0].password_hash)))
    return res.status(400).json({ error: 'Your current password is not correct' });

  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?',
    [await hashPassword(newPassword), req.userId]);
  await logActivity({ userId: req.userId, action: 'password_change' });
  res.json({ ok: true });
});

// Delete account. Requires the password so it can't be triggered accidentally
// or by someone else on a shared machine. Cascades remove all related rows.
router.delete('/account', requireUser, async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Enter your password to confirm deletion' });

  const [rows] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [req.userId]);
  if (!rows.length) return res.status(401).json({ error: 'Account no longer exists' });
  if (!(await verifyPassword(password, rows[0].password_hash)))
    return res.status(400).json({ error: 'That password is not correct' });

  await logActivity({ userId: req.userId, action: 'account_delete' });
  await db.execute('DELETE FROM users WHERE id = ?', [req.userId]);
  res.json({ ok: true });
});

// Anonymous, device-based identity. The app sends a stable deviceId it
// generated and stored locally; we find-or-create a user row for it and hand
// back a token. No email, no password, no login screen — but every piece of
// data the app saves still attaches to a real users row, so all the existing
// tables and foreign keys work unchanged.
router.post('/device', async (req, res) => {
  const { deviceId } = req.body || {};
  if (!deviceId || String(deviceId).length < 8)
    return res.status(400).json({ error: 'A valid deviceId is required' });

  const email = `device_${String(deviceId).toLowerCase()}@device.wattwatch`;
  const [existing] = await db.execute('SELECT id, email FROM users WHERE email = ?', [email]);

  let user;
  if (existing.length) {
    user = existing[0];
    await db.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
  } else {
    const id = randomUUID();
    // password_hash is NOT NULL; store a random unusable value since this
    // account is never logged into with a password.
    await db.execute('INSERT INTO users (id, email, password_hash) VALUES (?,?,?)',
      [id, email, await hashPassword(randomUUID())]);
    await db.execute('INSERT INTO profiles (user_id, full_name) VALUES (?,?)', [id, null]);
    await logActivity({ userId: id, action: 'device_register' });
    user = { id, email };
  }

  res.json({ token: signUserToken(user), user });
});

export default router;
