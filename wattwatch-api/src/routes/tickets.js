import { safeRouter } from '../safeRouter.js';
import { randomUUID } from 'crypto';
import { User, Profile, Ticket } from '../models/index.js';
import { requireUser } from '../auth.js';
import { logActivity } from '../activity.js';
import { syncTicketToCrm, syncTicketsFromCrm } from '../crmClient.js';
import {
  addTicketMessage,
  ensureTicketThread,
  listTicketMessages,
  markReadByCustomer,
  unreadCountForTicket,
  unreadSummaryForCustomer,
} from '../ticketMessages.js';

const router = safeRouter();
router.use(requireUser);

async function ownedTicket(userId, ticketId) {
  return Ticket.findOne({ where: { id: ticketId, user_id: userId } });
}

router.post('/', async (req, res) => {
  const { category = null, subject, body } = req.body || {};
  if (!subject || !body) return res.status(400).json({ error: 'Subject and message required' });

  const id = randomUUID();
  await Ticket.create({ id, user_id: req.userId, category, subject, body });
  await addTicketMessage({
    ticketId: id,
    senderRole: 'customer',
    senderName: 'You',
    body,
  });
  await logActivity({ userId: req.userId, action: 'ticket_create', detail: { id, category } });

  const user = await User.findByPk(req.userId, { attributes: ['email'] });
  const profile = await Profile.findByPk(req.userId);
  syncTicketToCrm({
    email: user?.email,
    profile: profile?.get({ plain: true }) ?? null,
    subject,
    body,
    category,
    wattwatchTicketId: id,
  })
    .then((crmId) => {
      if (crmId) logActivity({ userId: req.userId, action: 'ticket_crm_sync', detail: { id, crmId } });
    })
    .catch(() => {});

  res.status(201).json({ id, status: 'open' });
});

router.get('/unread', async (req, res) => {
  const summary = await unreadSummaryForCustomer(req.userId);
  res.json(summary);
});

router.get('/', async (req, res) => {
  const user = await User.findByPk(req.userId, { attributes: ['email'] });
  if (user?.email) {
    await syncTicketsFromCrm(req.userId, user.email);
  }

  const rows = await Ticket.findAll({
    where: { user_id: req.userId },
    attributes: [
      'id', 'category', 'subject', 'body', 'status', 'admin_reply',
      'created_at', 'updated_at', 'customer_last_read_at',
    ],
    order: [['created_at', 'DESC']],
  });

  const out = [];
  for (const row of rows) {
    await ensureTicketThread(row);
    const plain = row.get({ plain: true });
    plain.unread_count = await unreadCountForTicket(plain.id, 'customer');
    out.push(plain);
  }
  res.json(out);
});

router.get('/:id/messages', async (req, res) => {
  const ticket = await ownedTicket(req.userId, req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  await ensureTicketThread(ticket);
  await markReadByCustomer(ticket.id, req.userId);

  const messages = await listTicketMessages(ticket.id);
  res.json({
    ticket: {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      unread_count: 0,
    },
    messages: messages.map((m) => m.get({ plain: true })),
  });
});

router.post('/:id/messages', async (req, res) => {
  const { body } = req.body || {};
  if (!body || !String(body).trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const ticket = await ownedTicket(req.userId, req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (ticket.status === 'resolved') {
    await ticket.update({ status: 'open', updated_at: new Date() });
  }

  const message = await addTicketMessage({
    ticketId: ticket.id,
    senderRole: 'customer',
    senderName: 'You',
    body,
  });

  await logActivity({ userId: req.userId, action: 'ticket_message', detail: { id: ticket.id } });
  res.status(201).json(message.get({ plain: true }));
});

router.post('/:id/read', async (req, res) => {
  const ok = await markReadByCustomer(req.params.id, req.userId);
  if (!ok) return res.status(404).json({ error: 'Ticket not found' });
  res.json({ ok: true });
});

export default router;
