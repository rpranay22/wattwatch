import { safeRouter } from '../safeRouter.js';
import { User, Onboarding, Ticket, Alert, Export, AdminUser, ActivityLog, Profile, sequelize } from '../models/index.js';
import { requireAdmin, requireWriteRole } from '../auth.js';
import { logActivity } from '../activity.js';
import {
  addTicketMessage,
  ensureTicketThread,
  listTicketMessages,
  markReadByStaff,
  unreadCountForTicket,
  unreadSummaryForStaff,
} from '../ticketMessages.js';

const router = safeRouter();
router.use(requireAdmin);

router.get('/stats', async (req, res) => {
  const [users, suspended, onboardingCompleted, openTickets, activeAlerts, exportsCount] = await Promise.all([
    User.count(),
    User.count({ where: { status: 'suspended' } }),
    Onboarding.count(),
    Ticket.count({ where: { status: 'open' } }),
    Alert.count({ where: { enabled: true } }),
    Export.count(),
  ]);
  res.json({
    users,
    suspended,
    onboardingCompleted,
    onboardingRate: users ? Math.round((onboardingCompleted / users) * 100) : 0,
    openTickets,
    activeAlerts,
    exports: exportsCount,
  });
});

router.get('/users', async (req, res) => {
  const rows = await User.findAll({
    attributes: ['id', 'email', 'status', 'created_at', 'last_login_at'],
    include: [
      { model: Profile, attributes: ['full_name', 'supplier'], required: false },
      { model: Onboarding, attributes: ['household_size', 'devices'], required: false },
    ],
    order: [['created_at', 'DESC']],
  });
  res.json(rows.map((r) => {
    const plain = r.get({ plain: true });
    const devices = plain.Onboarding?.devices;
    return {
      id: plain.id,
      email: plain.email,
      status: plain.status,
      created_at: plain.created_at,
      last_login_at: plain.last_login_at,
      full_name: plain.Profile?.full_name ?? null,
      supplier: plain.Profile?.supplier ?? null,
      household_size: plain.Onboarding?.household_size ?? null,
      devices: typeof devices === 'string' ? JSON.parse(devices) : devices,
    };
  }));
});

router.put('/users/:id/status', requireWriteRole, async (req, res) => {
  const { status } = req.body || {};
  if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'status must be active or suspended' });

  const [affected] = await User.update({ status }, { where: { id: req.params.id } });
  if (!affected) return res.status(404).json({ error: 'User not found' });

  await logActivity({ adminId: req.adminId, action: 'user_status_change', detail: { userId: req.params.id, status } });
  res.json({ ok: true });
});

router.get('/tickets', async (req, res) => {
  const { status } = req.query;
  const where = {};
  if (status && ['open', 'in_progress', 'resolved'].includes(status)) where.status = status;

  const rows = await Ticket.findAll({
    where,
    include: [
      { model: User, attributes: ['email'] },
      { model: AdminUser, as: 'replier', attributes: ['full_name'], required: false },
    ],
    order: [
      [sequelize.literal("FIELD(Ticket.status, 'open', 'in_progress', 'resolved')"), 'ASC'],
      ['created_at', 'DESC'],
    ],
  });
  res.json(rows.map((r) => {
    const plain = r.get({ plain: true });
    const { User: userRow, replier, ...ticket } = plain;
    return { ...ticket, email: userRow?.email, replied_by_name: replier?.full_name ?? null };
  }));
});

router.get('/tickets/unread', async (req, res) => {
  const summary = await unreadSummaryForStaff();
  res.json(summary);
});

router.get('/tickets/:id/messages', async (req, res) => {
  const ticket = await Ticket.findByPk(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  await ensureTicketThread(ticket);
  await markReadByStaff(ticket.id);

  const messages = await listTicketMessages(ticket.id);
  res.json({
    ticket: ticket.get({ plain: true }),
    messages: messages.map((m) => m.get({ plain: true })),
  });
});

router.post('/tickets/:id/messages', requireWriteRole, async (req, res) => {
  const { body, senderName = 'Support' } = req.body || {};
  if (!body || !String(body).trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const ticket = await Ticket.findByPk(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  if (ticket.status === 'open') {
    await ticket.update({ status: 'in_progress', updated_at: new Date() });
  }

  const message = await addTicketMessage({
    ticketId: ticket.id,
    senderRole: 'staff',
    senderName,
    body,
  });

  await ticket.update({
    admin_reply: String(body).trim(),
    replied_by: req.adminId,
    updated_at: new Date(),
  });

  await logActivity({ adminId: req.adminId, action: 'ticket_message', detail: { id: ticket.id } });
  res.status(201).json(message.get({ plain: true }));
});

router.put('/tickets/:id', requireWriteRole, async (req, res) => {
  const { status = 'in_progress', adminReply = null } = req.body || {};
  if (!['open', 'in_progress', 'resolved'].includes(status)) return res.status(400).json({ error: 'bad status' });

  const [affected] = await Ticket.update(
    { status, admin_reply: adminReply, replied_by: req.adminId },
    { where: { id: req.params.id } }
  );
  if (!affected) return res.status(404).json({ error: 'Ticket not found' });

  await logActivity({ adminId: req.adminId, action: 'ticket_reply', detail: { id: req.params.id, status } });
  res.json({ ok: true });
});

router.get('/onboarding-funnel', async (req, res) => {
  const [signed, done] = await Promise.all([User.count(), Onboarding.count()]);
  const devs = await Onboarding.findAll({ attributes: ['devices'] });
  const counts = { ev: 0, heatpump: 0, solar: 0, battery: 0, none: 0 };
  for (const row of devs) {
    const list = typeof row.devices === 'string' ? JSON.parse(row.devices) : row.devices;
    if (!list || !list.length) counts.none++;
    else for (const d of list) if (d in counts) counts[d]++;
  }
  res.json({
    steps: [
      { step: 'Signed up', count: signed },
      { step: 'Completed onboarding', count: done },
    ],
    completionRate: signed ? Math.round((done / signed) * 100) : 0,
    devices: counts,
  });
});

router.get('/activity', async (req, res) => {
  const rows = await ActivityLog.findAll({
    attributes: ['action', 'detail', 'created_at'],
    include: [
      { model: User, attributes: ['email'], required: false },
      { model: AdminUser, as: 'admin', attributes: ['full_name'], required: false },
    ],
    order: [['created_at', 'DESC']],
    limit: 100,
  });
  res.json(rows.map((r) => {
    const plain = r.get({ plain: true });
    return {
      action: plain.action,
      detail: plain.detail,
      created_at: plain.created_at,
      user_email: plain.User?.email ?? null,
      admin_name: plain.admin?.full_name ?? null,
    };
  }));
});

export default router;
