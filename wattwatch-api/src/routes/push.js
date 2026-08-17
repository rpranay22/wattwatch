import { safeRouter } from '../safeRouter.js';
import { requireUser } from '../auth.js';
import { PushToken } from '../models/index.js';

const router = safeRouter();
router.use(requireUser);

router.post('/register', async (req, res) => {
  const { token, platform = 'android', cheapWindow = true } = req.body || {};
  if (!token || String(token).length < 20) {
    return res.status(400).json({ error: 'A valid device token is required' });
  }
  if (!['android', 'ios', 'web'].includes(platform)) {
    return res.status(400).json({ error: 'platform must be android, ios, or web' });
  }

  const [row] = await PushToken.findOrCreate({
    where: { token: String(token) },
    defaults: {
      user_id: req.userId,
      platform,
      cheap_window: !!cheapWindow,
    },
  });

  if (row.user_id !== req.userId || row.platform !== platform || row.cheap_window !== !!cheapWindow) {
    await row.update({
      user_id: req.userId,
      platform,
      cheap_window: !!cheapWindow,
      updated_at: new Date(),
    });
  }

  res.json({ ok: true, cheapWindow: !!cheapWindow });
});

router.delete('/register', async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });

  await PushToken.destroy({ where: { token: String(token), user_id: req.userId } });
  res.json({ ok: true });
});

router.put('/preferences', async (req, res) => {
  const { cheapWindow } = req.body || {};
  if (typeof cheapWindow !== 'boolean') {
    return res.status(400).json({ error: 'cheapWindow must be true or false' });
  }

  await PushToken.update(
    { cheap_window: cheapWindow, updated_at: new Date() },
    { where: { user_id: req.userId } }
  );
  res.json({ ok: true, cheapWindow });
});

router.get('/status', async (req, res) => {
  const count = await PushToken.count({ where: { user_id: req.userId } });
  const enabled = await PushToken.count({ where: { user_id: req.userId, cheap_window: true } });
  res.json({ registered: count > 0, devices: count, cheapWindowEnabled: enabled > 0 });
});

export default router;
