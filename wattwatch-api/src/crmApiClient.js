// CRM backend base URL for server-to-server calls (login lookup, etc.).
// Set CRM_API_URL in Render/your host — do NOT use localhost in production.
import { CrmCustomer, User, sequelize } from './models/index.js';

const CRM_API_URL = (
  process.env.CRM_API_URL ||
  'https://crm-backend-bj1l.onrender.com'
).replace(/\/$/, '');

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

/** Extract bcrypt hash from CRM lookup JSON ({ data: hash } or nested customer). */
export function extractPasswordHash(lookupResult) {
  if (!lookupResult) return null;
  if (typeof lookupResult === 'string') return lookupResult;
  if (typeof lookupResult.data === 'string') return lookupResult.data;
  if (typeof lookupResult.passwordHash === 'string') return lookupResult.passwordHash;
  if (lookupResult.customer?.passwordHash) return lookupResult.customer.passwordHash;
  return null;
}

/** Look up a CRM customer by email. Returns null if not found or CRM unreachable. */
export async function lookupCrmCustomer(email) {
  const normalized = normalizeEmail(email);
  const url = `${CRM_API_URL}/api/customers/lookup?email=${encodeURIComponent(normalized)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || data.error) return null;
    return data.customer ?? data;
  } catch (e) {
    console.warn(`CRM customer lookup failed (${CRM_API_URL}):`, e.message);
    return null;
  }
}

async function fetchPasswordHashFromDb(email) {
  const normalized = normalizeEmail(email);
  try {
    const tables = await sequelize.getQueryInterface().showAllTables();
    if (!tables.includes('customers')) return null;

    const row = await CrmCustomer.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('email')),
        normalized,
      ),
      attributes: ['passwordHash'],
    });
    return row?.passwordHash ?? null;
  } catch (e) {
    console.warn('CRM password DB read failed:', e.message);
    return null;
  }
}

/** Resolve login hash: CRM API → customers table → local users row. */
export async function resolveLoginPasswordHash(email) {
  const normalized = normalizeEmail(email);
  const fromApi = extractPasswordHash(await lookupCrmCustomer(normalized));
  if (fromApi) return fromApi;

  const fromCustomers = await fetchPasswordHashFromDb(normalized);
  if (fromCustomers) return fromCustomers;

  const user = await User.findOne({
    where: { email: normalized },
    attributes: ['password_hash'],
  });
  return user?.password_hash ?? null;
}

async function updateSharedUsersPassword(email, passwordHash) {
  const normalized = normalizeEmail(email);
  try {
    const tables = await sequelize.getQueryInterface().showAllTables();
    if (!tables.includes('users')) return false;

    const [count] = await User.update(
      { password_hash: passwordHash },
      {
        where: sequelize.where(
          sequelize.fn('LOWER', sequelize.col('email')),
          normalized,
        ),
      },
    );
    return count > 0;
  } catch (e) {
    console.warn('users password sync failed:', e.message);
    return false;
  }
}

async function updateCrmCustomerPasswordViaApi(email, passwordHash) {
  const url = `${CRM_API_URL}/api/customers/password`;
  try {
    const headers = { 'Content-Type': 'application/json' };
    const secret = process.env.CRM_SYNC_SECRET || process.env.WATTWATCH_SYNC_SECRET;
    if (secret) headers['x-sync-secret'] = secret;

    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        email: normalizeEmail(email),
        passwordHash,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('CRM password API update failed:', err.error || res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('CRM password API update failed:', e.message);
    return false;
  }
}

async function updateCrmCustomerPasswordInDb(email, passwordHash) {
  try {
    const normalized = normalizeEmail(email);
    const tables = await sequelize.getQueryInterface().showAllTables();
    if (!tables.includes('customers')) return false;

    const [count] = await CrmCustomer.update(
      { passwordHash },
      {
        where: sequelize.where(
          sequelize.fn('LOWER', sequelize.col('email')),
          normalized,
        ),
      },
    );
    return count > 0;
  } catch (e) {
    console.warn('CRM password DB update failed:', e.message);
    return false;
  }
}

/** Push bcrypt hash to customers + users (CRM API, then shared DB fallbacks). */
export async function syncPasswordToCrm(email, passwordHash) {
  const normalized = normalizeEmail(email);
  let ok = false;

  if (await updateCrmCustomerPasswordViaApi(normalized, passwordHash)) ok = true;
  if (await updateCrmCustomerPasswordInDb(normalized, passwordHash)) ok = true;
  if (await updateSharedUsersPassword(normalized, passwordHash)) ok = true;

  return ok;
}

export { CRM_API_URL };
