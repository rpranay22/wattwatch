import { safeRouter } from '../safeRouter.js';
import { db } from '../db.js';
import { requireUser } from '../auth.js';
import { logActivity } from '../activity.js';
const router = safeRouter();
router.use(requireUser);

router.get('/', async (req, res) => {
  const [rows] = await db.execute(
    'SELECT p.*, u.email FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?', [req.userId]);
  res.json(rows[0] || null);
});

router.put('/', async (req, res) => {
  const { fullName=null, phone=null, mprn=null, address=null, city=null, eircode=null, supplier=null } = req.body || {};
  await db.execute(
    `INSERT INTO profiles (user_id, full_name, phone, mprn, address, city, eircode, supplier)
     VALUES (?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), phone=VALUES(phone), mprn=VALUES(mprn),
       address=VALUES(address), city=VALUES(city), eircode=VALUES(eircode), supplier=VALUES(supplier)`,
    [req.userId, fullName, phone, mprn, address, city, eircode, supplier]);
  await logActivity({ userId: req.userId, action: 'profile_update' });
  res.json({ ok: true });
});
export default router;
