// ADMIN auth. Writes to the admin_users table only. No public signup:
// admins are created with the create-admin script.
import { safeRouter } from '../safeRouter.js';
import { db } from '../db.js';
import { verifyPassword, signAdminToken, requireAdmin } from '../auth.js';
import { logActivity } from '../activity.js';

const router = safeRouter();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const [rows] = await db.execute('SELECT * FROM admin_users WHERE email = ?', [String(email).toLowerCase().trim()]);
  const admin = rows[0];
  if (!admin || !(await verifyPassword(password, admin.password_hash)))
    return res.status(401).json({ error: 'Wrong email or password' });
  if (admin.status === 'disabled')
    return res.status(403).json({ error: 'This admin account is disabled' });

  await db.execute('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?', [admin.id]);
  await logActivity({ adminId: admin.id, action: 'admin_login' });
  res.json({
    token: signAdminToken(admin),
    admin: { id: admin.id, email: admin.email, fullName: admin.full_name, role: admin.role },
  });
});

router.get('/me', requireAdmin, async (req, res) => {
  const [rows] = await db.execute(
    'SELECT id, email, full_name, role FROM admin_users WHERE id = ?', [req.adminId]);
  if (!rows.length) return res.status(401).json({ error: 'Admin no longer exists' });
  res.json({ admin: rows[0] });
});

export default router;
