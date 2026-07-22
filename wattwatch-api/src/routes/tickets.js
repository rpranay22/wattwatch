// The app-user side of tickets. Admin side lives in admin.js.
// Also mirrors every new ticket into the separate CRM's own tables
// (customers / crm_tickets), so the CRM portal's Tickets page shows them.
// The WattWatch admin portal is untouched: it keeps reading WattWatch's own
// `tickets` table exactly as before, since that insert still happens first.
import { safeRouter } from '../safeRouter.js';
import { randomUUID } from 'crypto';
import { db } from '../db.js';
import { requireUser } from '../auth.js';
import { logActivity } from '../activity.js';
import { syncTicketToCrm } from '../crmClient.js';

const router = safeRouter();
router.use(requireUser);

router.post('/', async (req, res) => {
  const { category = null, subject, body } = req.body || {};
  if (!subject || !body) return res.status(400).json({ error: 'Subject and message required' });
  const id = randomUUID();
  await db.execute('INSERT INTO tickets (id, user_id, category, subject, body) VALUES (?,?,?,?,?)',
    [id, req.userId, category, subject, body]);
  await logActivity({ userId: req.userId, action: 'ticket_create', detail: { id, category } });

  // Best-effort CRM mirror. Never blocks or fails the user's request: if the
  // CRM tables are unreachable, the WattWatch ticket above is already saved.
  const [[user]] = await db.execute('SELECT email FROM users WHERE id = ?', [req.userId]);
  const [profileRows] = await db.execute('SELECT * FROM profiles WHERE user_id = ?', [req.userId]);
  const profile = profileRows[0] ?? null;
  syncTicketToCrm({ email: user?.email, profile, subject, body, category })
    .then((crmId) => { if (crmId) logActivity({ userId: req.userId, action: 'ticket_crm_sync', detail: { id, crmId } }); })
    .catch(() => {}); // syncTicketToCrm already logs its own warning; never throw here

  res.status(201).json({ id, status: 'open' });
});

router.get('/', async (req, res) => {
  const [rows] = await db.execute(
    `SELECT id, category, subject, body, status, admin_reply, created_at, updated_at
       FROM tickets WHERE user_id = ? ORDER BY created_at DESC`, [req.userId]);
  res.json(rows);
});

export default router;
