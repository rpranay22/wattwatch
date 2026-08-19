import { DataTypes } from 'sequelize';
import { sequelize, Ticket } from './models/index.js';

function isCrmTicketsTable(cols) {
  return cols.customerId && cols.description && !cols.user_id && !cols.body;
}

/** Drop CRM-shaped `tickets` table and recreate WattWatch schema (crm_tickets is separate). */
async function repairTicketsTable() {
  const qi = sequelize.getQueryInterface();
  let tickets;
  try {
    tickets = await qi.describeTable('tickets');
  } catch {
    return;
  }

  if (!isCrmTicketsTable(tickets)) return;

  const [[{ c: rowCount }]] = await sequelize.query('SELECT COUNT(*) AS c FROM tickets');
  if (Number(rowCount) > 0) {
    console.warn(
      `Schema migrate: tickets table has CRM columns and ${rowCount} row(s) — cannot auto-repair. See DATABASE_REPAIR.md`
    );
    return;
  }

  console.warn('Schema migrate: tickets table is CRM-shaped (customerId/description) — recreating for WattWatch');
  await qi.dropTable('tickets');
  await Ticket.sync();
  console.log('Schema migrate: tickets table recreated (user_id, body, admin_reply, …)');
}

/** Add columns that pre-Sequelize tables may be missing on a valid WattWatch tickets table. */
async function patchTicketsColumns() {
  const qi = sequelize.getQueryInterface();
  let tickets;
  try {
    tickets = await qi.describeTable('tickets');
  } catch {
    return;
  }

  if (isCrmTicketsTable(tickets)) return;

  const ticketAdds = {
    category: { type: DataTypes.STRING(40), allowNull: true },
    replied_by: { type: DataTypes.CHAR(36), allowNull: true },
    crm_id: { type: DataTypes.STRING(80), allowNull: true },
    updated_at: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    admin_reply: { type: DataTypes.TEXT, allowNull: true },
  };

  for (const [col, def] of Object.entries(ticketAdds)) {
    if (!tickets[col]) {
      await qi.addColumn('tickets', col, def);
      console.log(`Schema migrate: added tickets.${col}`);
    }
  }
}

export async function migrateKnownSchemaGaps() {
  await repairTicketsTable();
  await patchTicketsColumns();
}
