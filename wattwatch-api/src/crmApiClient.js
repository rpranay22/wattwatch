// CRM backend base URL for server-to-server calls (login lookup, etc.).
// Set CRM_API_URL in Render/your host — do NOT use localhost in production.
// Falls back to the deployed CRM on Render if the env var is missing.
import { CrmCustomer, sequelize } from './models/index.js';

const CRM_API_URL = (
  process.env.CRM_API_URL ||
  'https://crm-backend-bj1l.onrender.com'
).replace(/\/$/, '');

/** Look up a CRM customer by email. Returns null if not found or CRM unreachable. */
export async function lookupCrmCustomer(email) {
  const url = `${CRM_API_URL}/api/customers/lookup?email=${encodeURIComponent(email)}`;
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

/** Push a bcrypt hash to CRM (HTTP API, then shared-DB fallback). */
export async function syncPasswordToCrm(email, passwordHash) {
  if (await updateCrmCustomerPasswordViaApi(email, passwordHash)) return true;
  return updateCrmCustomerPasswordInDb(email, passwordHash);
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
        email: String(email).toLowerCase().trim(),
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
    const normalized = String(email).toLowerCase().trim();
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

export { CRM_API_URL };

