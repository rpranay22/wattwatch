// Pure, DB-free transformations between WattWatch's data shape and the CRM's
// Sequelize models (customers / crm_tickets). Kept separate from crmClient.js
// so every edge case can be unit tested without a database.

// The CRM requires phone/eircode/provider/mprn as NOT NULL, but a WattWatch
// profile is often incomplete (a user can raise a ticket before finishing
// My Details). These fallbacks mean a missing field never blocks ticket
// creation; it just shows up honestly as "Not provided" in the CRM.
const FALLBACK = {
  phone: 'Not provided',
  eircode: 'N/A',
  provider: 'Not provided',
  mprn: 'N/A',
};

// "Jey Murphy" -> { firstName: "Jey", lastName: "Murphy" }
// Handles the gaps a real name field always has: empty, single word,
// extra whitespace, multiple middle names.
function splitName(fullName, fallbackFromEmail) {
  const cleaned = (fullName || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    const local = (fallbackFromEmail || '').split('@')[0] || 'WattWatch';
    return { firstName: local, lastName: 'User' };
  }
  const parts = cleaned.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: 'User' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

// profile row (from WattWatch's `profiles` table, may have null fields) +
// the user's email -> a payload matching the CRM's Customer model exactly.
function buildCrmCustomerPayload(profile, email) {
  const { firstName, lastName } = splitName(profile?.full_name, email);
  return {
    firstName,
    lastName,
    email,
    phone: profile?.phone || FALLBACK.phone,
    eircode: profile?.eircode || FALLBACK.eircode,
    address: profile?.address || null,
    provider: profile?.supplier || FALLBACK.provider,
    mprn: profile?.mprn || FALLBACK.mprn,
    // These app users already have a real login in the WattWatch app; they
    // are not an unconverted lead waiting on a CRM agent. Marking them
    // CUSTOMER directly keeps the Leads page showing only genuine
    // onboarding-form leads, not every app user who happened to raise a
    // ticket. passwordHash stays null: they never use the CRM's separate
    // customer-login, only the WattWatch app's own login.
    status: 'CUSTOMER',
  };
}

const VALID_PRIORITY = new Set(['LOW', 'MEDIUM', 'HIGH']);

// WattWatch tickets carry a free-text `category` (Account/Billing/...);
// the CRM has no such field, only `priority`. Rather than lose the
// category, fold it into the description so a CRM agent still sees it.
function buildCrmTicketPayload({ customerId, subject, body, category, priority }) {
  const pri = VALID_PRIORITY.has(String(priority).toUpperCase())
    ? String(priority).toUpperCase()
    : 'MEDIUM';
  const description = category
    ? `[Category: ${category}]\n\n${body}`
    : body;
  return {
    customerId,
    subject: String(subject).slice(0, 180), // matches STRING(180) column
    description,
    priority: pri,
    status: 'OPEN',
  };
}

/** CRM status (OPEN / IN_PROGRESS / RESOLVED) → WattWatch tickets.status */
function mapCrmStatusToWattWatch(crmStatus) {
  const s = String(crmStatus || '').toUpperCase();
  if (s === 'RESOLVED') return 'resolved';
  if (s === 'IN_PROGRESS') return 'in_progress';
  return 'open';
}

export { splitName, buildCrmCustomerPayload, buildCrmTicketPayload, mapCrmStatusToWattWatch, FALLBACK };
