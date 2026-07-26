import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { initDatabase, pingDb } from './db.js';
import authRoutes from './routes/authRoutes.js';
import adminAuthRoutes from './routes/adminAuth.js';
import onboardingRoutes from './routes/onboarding.js';
import profileRoutes from './routes/profile.js';
import ticketRoutes from './routes/tickets.js';
import alertRoutes from './routes/alerts.js';
import exportRoutes from './routes/exports.js';
import usageRoutes from './routes/usage.js';
import priceRoutes from './routes/prices.js';
import adminRoutes from './routes/admin.js';

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION (server stayed up):', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION (server stayed up):', err);
});

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  let dbOk = false;
  try { dbOk = await pingDb(); } catch { dbOk = false; }
  res.json({ api: 'ok', db: dbOk ? 'connected' : 'unreachable', version: '0.3.0' });
});

app.use('/auth', authRoutes);
app.use('/onboarding', onboardingRoutes);
app.use('/profile', profileRoutes);
app.use('/tickets', ticketRoutes);
app.use('/alerts', alertRoutes);
app.use('/exports', exportRoutes);
app.use('/usage', usageRoutes);
app.use('/prices', priceRoutes);

app.use('/admin/auth', adminAuthRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => res.status(404).json({ error: 'No such endpoint' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });

const PORT = Number(process.env.PORT || 4000);
if (process.env.NODE_ENV !== 'test') {
  await initDatabase();
  app.listen(PORT, () => console.log(`WattWatch API v0.3 on http://localhost:${PORT}`));
}
export default app;
