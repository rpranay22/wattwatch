// The portal API. All routes require an admin token. Writes require a
// non-read-only role.
import { safeRouter } from '../safeRouter.js';
import { db } from '../db.js';
import { requireAdmin, requireWriteRole } from '../auth.js';
import { logActivity } from '../activity.js';

const router = safeRouter();
router.use(requireAdmin);

// ---- dashboard ----
router.get('/stats', async (req, res) => {
  const [[u]]  = await db.execute('SELECT COUNT(*) n FROM users');
  const [[su]] = await db.execute("SELECT COUNT(*) n FROM users WHERE status='suspended'");
  const [[o]]  = await db.execute('SELECT COUNT(*) n FROM onboarding');
  const [[t]]  = await db.execute("SELECT COUNT(*) n FROM tickets WHERE status='open'");
  const [[a]]  = await db.execute('SELECT COUNT(*) n FROM alerts WHERE enabled=TRUE');
  const [[e]]  = await db.execute('SELECT COUNT(*) n FROM exports');
  res.json({
    users: u.n, suspended: su.n, onboardingCompleted: o.n,
    onboardingRate: u.n ? Math.round((o.n / u.n) * 100) : 0,
    openTickets: t.n, activeAlerts: a.n, exports: e.n,
  });
});

// ---- users ----
router.get('/users', async (req, res) => {
  const [rows] = await db.execute(
    `SELECT u.id, u.email, u.status, u.created_at, u.last_login_at,
            p.full_name, p.supplier, o.household_size, o.devices
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN onboarding o ON o.user_id = u.id
      ORDER BY u.created_at DESC`);
  res.json(rows.map((r) => ({ ...r, devices: typeof r.devices === 'string' ? JSON.parse(r.devices) : r.devices })));
});

router.put('/users/:id/status', requireWriteRole, async (req, res) => {
  const { status } = req.body || {};
  if (!['active','suspended'].includes(status)) return res.status(400).json({ error: 'status must be active or suspended' });
  const [r] = await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'User not found' });
  await logActivity({ adminId: req.adminId, action: 'user_status_change', detail: { userId: req.params.id, status } });
  res.json({ ok: true });
});

// ---- tickets (admin side) ----
router.get('/tickets', async (req, res) => {
  const { status } = req.query;
  const params = [];
  let sql = `SELECT t.*, u.email, a.full_name AS replied_by_name
               FROM tickets t
               JOIN users u ON u.id = t.user_id
               LEFT JOIN admin_users a ON a.id = t.replied_by`;
  if (status && ['open','in_progress','resolved'].includes(status)) { sql += ' WHERE t.status = ?'; params.push(status); }
  sql += " ORDER BY FIELD(t.status,'open','in_progress','resolved'), t.created_at DESC";
  const [rows] = await db.execute(sql, params);
  res.json(rows);
});

router.put('/tickets/:id', requireWriteRole, async (req, res) => {
  const { status = 'in_progress', adminReply = null } = req.body || {};
  if (!['open','in_progress','resolved'].includes(status)) return res.status(400).json({ error: 'bad status' });
  const [r] = await db.execute(
    'UPDATE tickets SET status = ?, admin_reply = ?, replied_by = ? WHERE id = ?',
    [status, adminReply, req.adminId, req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Ticket not found' });
  await logActivity({ adminId: req.adminId, action: 'ticket_reply', detail: { id: req.params.id, status } });
  res.json({ ok: true });
});

// ---- onboarding funnel ----
router.get('/onboarding-funnel', async (req, res) => {
  const [[signed]] = await db.execute('SELECT COUNT(*) n FROM users');
  const [[done]]   = await db.execute('SELECT COUNT(*) n FROM onboarding');
  const [devs] = await db.execute('SELECT devices FROM onboarding');
  const counts = { ev: 0, heatpump: 0, solar: 0, battery: 0, none: 0 };
  for (const row of devs) {
    const list = typeof row.devices === 'string' ? JSON.parse(row.devices) : row.devices;
    if (!list || !list.length) counts.none++;
    else for (const d of list) if (d in counts) counts[d]++;
  }
  res.json({
    steps: [
      { step: 'Signed up', count: signed.n },
      { step: 'Completed onboarding', count: done.n },
    ],
    completionRate: signed.n ? Math.round((done.n / signed.n) * 100) : 0,
    devices: counts,
  });
});

// ---- activity log ----
router.get('/activity', async (req, res) => {
  const [rows] = await db.execute(
    `SELECT al.action, al.detail, al.created_at, u.email AS user_email, ad.full_name AS admin_name
       FROM activity_log al
       LEFT JOIN users u ON u.id = al.user_id
       LEFT JOIN admin_users ad ON ad.id = al.admin_id
      ORDER BY al.created_at DESC LIMIT 100`);
  res.json(rows);
});

export default router;
