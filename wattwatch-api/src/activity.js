import { ActivityLog } from './models/index.js';

export async function logActivity({ userId = null, adminId = null, action, detail = null }) {
  try {
    await ActivityLog.create({ user_id: userId, admin_id: adminId, action, detail });
  } catch (e) { console.error('activity log failed:', e.message); }
}
