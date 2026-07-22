// Writes into the CRM's own tables (customers, crm_tickets) over the SAME
// mysql2 pool WattWatch already uses — no HTTP call to the CRM backend, no
// Sequelize dependency here. The CRM's Sequelize models own table creation
// (via sequelize.sync on the CRM's own startup); this file only ever
// SELECTs / INSERTs into tables that already exist, matching Sequelize's
// exact camelCase column names.
//
// Every function here is best-effort: if the CRM tables are not reachable
// (CRM backend never started, wrong DB, etc.) a warning is logged and the
// caller's own flow continues uninterrupted. A user raising a ticket in the
// app must never fail because a separate, optional system is down.
import { db } from './db.js';
import { buildCrmCustomerPayload, buildCrmTicketPayload } from './crmMapping.js';

async function crmTablesExist() {
  const [rows] = await db.execute(
    `SELECT COUNT(*) n FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name IN ('customers','crm_tickets')`
  );
  return rows[0].n === 2;
}

// Find the CRM customer row for this email, or create one from the
// WattWatch profile. Returns the CRM customers.id (INTEGER), or null if the
// CRM tables are not present yet.
async function ensureCrmCustomer(profile, email) {
  if (!(await crmTablesExist())) {
    console.warn('CRM tables not found (has the CRM backend been started against this database?) — skipping CRM sync');
    return null;
  }

  const [existing] = await db.execute('SELECT id FROM customers WHERE email = ?', [email]);
  if (existing.length) return existing[0].id;

  const c = buildCrmCustomerPayload(profile, email);
  const now = new Date();
  const [result] = await db.execute(
    `INSERT INTO customers
       (firstName, lastName, email, phone, eircode, address, provider, mprn,
        status, mustChangePassword, createdAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [c.firstName, c.lastName, c.email, c.phone, c.eircode, c.address,
     c.provider, c.mprn, c.status, false, now, now]
  );
  return result.insertId;
}

// Mirrors a WattWatch ticket into the CRM's crm_tickets table.
// Returns the CRM ticket id, or null if it could not be synced.
export async function syncTicketToCrm({ email, profile, subject, body, category }) {
  try {
    const customerId = await ensureCrmCustomer(profile, email);
    if (!customerId) return null;

    const t = buildCrmTicketPayload({ customerId, subject, body, category });
    const now = new Date();
    const [result] = await db.execute(
      `INSERT INTO crm_tickets
         (customerId, subject, description, priority, status, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?)`,
      [t.customerId, t.subject, t.description, t.priority, t.status, now, now]
    );
    return result.insertId;
  } catch (e) {
    console.warn('CRM ticket sync failed (ticket still saved in WattWatch):', e.message);
    return null;
  }
}
