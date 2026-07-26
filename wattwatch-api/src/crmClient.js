import { CrmCustomer, CrmTicket, sequelize } from './models/index.js';
import { buildCrmCustomerPayload, buildCrmTicketPayload } from './crmMapping.js';

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

export async function syncTicketToCrm({ email, profile, subject, body, category }) {
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
    return ticket.id;
  } catch (e) {
    console.warn('CRM ticket sync failed (ticket still saved in WattWatch):', e.message);
    return null;
  }
}
