import { safeRouter } from '../safeRouter.js';
import { AdminUser } from '../models/index.js';
import { verifyPassword, signAdminToken, requireAdmin } from '../auth.js';
import { logActivity } from '../activity.js';

const router = safeRouter();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const admin = await AdminUser.findOne({ where: { email: String(email).toLowerCase().trim() } });
  if (!admin || !(await verifyPassword(password, admin.password_hash)))
    return res.status(401).json({ error: 'Wrong email or password' });
  if (admin.status === 'disabled')
    return res.status(403).json({ error: 'This admin account is disabled' });

  await admin.update({ last_login_at: new Date() });
  await logActivity({ adminId: admin.id, action: 'admin_login' });
  res.json({
    token: signAdminToken(admin),
    admin: { id: admin.id, email: admin.email, fullName: admin.full_name, role: admin.role },
  });
});

router.get('/me', requireAdmin, async (req, res) => {
  const admin = await AdminUser.findByPk(req.adminId, { attributes: ['id', 'email', 'full_name', 'role'] });
  if (!admin) return res.status(401).json({ error: 'Admin no longer exists' });
  res.json({ admin: admin.get({ plain: true }) });
});

export default router;
