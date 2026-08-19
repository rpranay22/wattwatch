import { CrmCustomer, CrmTicket, Ticket, sequelize } from './models/index.js';
import { buildCrmCustomerPayload, buildCrmTicketPayload, mapCrmStatusToWattWatch } from './crmMapping.js';

async function crmTablesExist() {
  const tables = await sequelize.getQueryInterface().showAllTables();
  return tables.includes('customers') && tables.includes('crm_tickets');
}

async function ensureCrmCustomer(profile, email) {
  if (!(await crmTablesExist())) {
    console.warn('CRM tables not found — skipping CRM sync');
    return null;
  }

  const existing = await CrmCustomer.findOne({ where: { email } });
  if (existing) return existing.id;

  const c = buildCrmCustomerPayload(profile, email);
  const customer = await CrmCustomer.create({
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    eircode: c.eircode,
    address: c.address,
    provider: c.provider,
    mprn: c.mprn,
    status: c.status,
    mustChangePassword: false,
  });
  return customer.id;
}

export async function syncTicketToCrm({ email, profile, subject, body, category, wattwatchTicketId }) {
  try {
    const customerId = await ensureCrmCustomer(profile, email);
    if (!customerId) return null;

    const t = buildCrmTicketPayload({ customerId, subject, body, category });
    const ticket = await CrmTicket.create({
      customerId: t.customerId,
      subject: t.subject,
      description: t.description,
      priority: t.priority,
      status: t.status,
    });

    if (wattwatchTicketId) {
      await Ticket.update(
        { crm_id: String(ticket.id), updated_at: new Date() },
        { where: { id: wattwatchTicketId } },
      );
    }

    return ticket.id;
  } catch (e) {
    console.warn('CRM ticket sync failed (ticket still saved in WattWatch):', e.message);
    return null;
  }
}

/** Pull status (and link crm_id) from crm_tickets into WattWatch tickets for this user. */
export async function syncTicketsFromCrm(userId, email) {
  try {
    if (!(await crmTablesExist())) return;

    const customer = await CrmCustomer.findOne({ where: { email } });
    if (!customer) return;

    const [wwTickets, crmTickets] = await Promise.all([
      Ticket.findAll({ where: { user_id: userId } }),
      CrmTicket.findAll({ where: { customerId: customer.id } }),
    ]);

    const crmById = new Map(crmTickets.map((t) => [String(t.id), t]));

    for (const ww of wwTickets) {
      let crm = ww.crm_id ? crmById.get(String(ww.crm_id)) : null;
      if (!crm) {
        crm = crmTickets.find((t) => t.subject === ww.subject) ?? null;
      }
      if (!crm) continue;

      const status = mapCrmStatusToWattWatch(crm.status);
      const updates = {};
      if (status !== ww.status) updates.status = status;
      if (!ww.crm_id) updates.crm_id = String(crm.id);
      if (Object.keys(updates).length) {
        updates.updated_at = new Date();
        await ww.update(updates);
      }
    }
  } catch (e) {
    console.warn('CRM ticket status sync failed:', e.message);
  }
}
