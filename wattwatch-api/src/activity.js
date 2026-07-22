import { db } from './db.js';
export async function logActivity({ userId = null, adminId = null, action, detail = null }) {
  try {
    await db.execute(
      'INSERT INTO activity_log (user_id, admin_id, action, detail) VALUES (?,?,?,?)',
      [userId, adminId, action, detail ? JSON.stringify(detail) : null]
    );
  } catch (e) { console.error('activity log failed:', e.message); }
}
