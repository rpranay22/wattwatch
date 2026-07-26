import { safeRouter } from '../safeRouter.js';
import { randomUUID } from 'crypto';
import { User, Profile, Ticket } from '../models/index.js';
import { requireUser } from '../auth.js';
import { logActivity } from '../activity.js';
import { syncTicketToCrm } from '../crmClient.js';

const router = safeRouter();
router.use(requireUser);

router.post('/', async (req, res) => {
  const { category = null, subject, body } = req.body || {};
  if (!subject || !body) return res.status(400).json({ error: 'Subject and message required' });

  const id = randomUUID();
  await Ticket.create({ id, user_id: req.userId, category, subject, body });
  await logActivity({ userId: req.userId, action: 'ticket_create', detail: { id, category } });

  const user = await User.findByPk(req.userId, { attributes: ['email'] });
  const profile = await Profile.findByPk(req.userId);
  syncTicketToCrm({ email: user?.email, profile: profile?.get({ plain: true }) ?? null, subject, body, category })
    .then((crmId) => { if (crmId) logActivity({ userId: req.userId, action: 'ticket_crm_sync', detail: { id, crmId } }); })
    .catch(() => {});

  res.status(201).json({ id, status: 'open' });
});

router.get('/', async (req, res) => {
  const rows = await Ticket.findAll({
    where: { user_id: req.userId },
    attributes: ['id', 'category', 'subject', 'body', 'status', 'admin_reply', 'created_at', 'updated_at'],
    order: [['created_at', 'DESC']],
  });
  res.json(rows.map((r) => r.get({ plain: true })));
});

export default router;
