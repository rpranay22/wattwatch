import { CrmCustomer, Profile, sequelize } from './models/index.js';
import { CRM_API_URL } from './crmApiClient.js';

const ENERGY_SWITCH_API_URL = (
  process.env.ENERGY_SWITCH_API_URL ||
  process.env.ENERGY_SWITCH_BACKEND_URL ||
  'https://ui-dev-backend.onrender.com'
).replace(/\/$/, '');

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

/** Map CRM / energy-switch customer row → WattWatch profile columns. */
export function crmCustomerToProfileFields(customer) {
  const c = customer?.get ? customer.get({ plain: true }) : customer;
  if (!c) return null;

  const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();

  return {
    full_name: fullName || null,
    phone: c.phone || null,
    mprn: c.mprn || null,
    address: c.address || null,
    city: c.city || null,
    eircode: c.eircode || null,
    supplier: c.provider || c.supplier || null,
  };
}

async function fetchCrmCustomerFromDb(email) {
  const normalized = normalizeEmail(email);
  try {
    const tables = await sequelize.getQueryInterface().showAllTables();
    if (!tables.includes('customers')) return null;

    return CrmCustomer.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('email')),
        normalized,
      ),
    });
  } catch {
    return null;
  }
}

async function fetchCrmCustomerFromApi(baseUrl, email) {
  const url = `${baseUrl}/api/customers?email=${encodeURIComponent(email)}`;
  try {
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    const row = json.data?.[0] ?? json.customer ?? null;
    return row && typeof row === 'object' ? row : null;
  } catch {
    return null;
  }
}

/** Load customer record from shared DB, CRM API, or energy-switch backend. */
export async function fetchCrmCustomerRecord(email) {
  const fromDb = await fetchCrmCustomerFromDb(email);
  if (fromDb) return fromDb;

  const fromCrm = await fetchCrmCustomerFromApi(CRM_API_URL, email);
  if (fromCrm) return fromCrm;

  return fetchCrmCustomerFromApi(ENERGY_SWITCH_API_URL, email);
}

/**
 * Copy energy-switch / CRM customer details into WattWatch profiles.
 * Fills empty profile fields by default; set overwrite=true to refresh all mapped fields.
 */
export async function syncProfileFromCrm(userId, email, { overwrite = false } = {}) {
  const crmRow = await fetchCrmCustomerRecord(email);
  if (!crmRow) return false;

  const incoming = crmCustomerToProfileFields(crmRow);
  if (!incoming) return false;

  const existing = await Profile.findByPk(userId);
  const plain = existing?.get({ plain: true }) ?? {};

  const merged = { user_id: userId, updated_at: new Date() };
  for (const [key, value] of Object.entries(incoming)) {
    if (value == null || String(value).trim() === '') continue;
    const current = plain[key];
    if (overwrite || current == null || String(current).trim() === '') {
      merged[key] = value;
    } else {
      merged[key] = current;
    }
  }

  if (Object.keys(merged).length <= 2) return false;

  await Profile.upsert(merged);
  return true;
}

/** True if profile is missing most fields (needs CRM import). */
export function profileNeedsCrmSync(profile) {
  if (!profile) return true;
  const plain = profile.get ? profile.get({ plain: true }) : profile;
  const filled = ['full_name', 'phone', 'mprn', 'address', 'eircode', 'supplier']
    .filter((k) => plain[k] && String(plain[k]).trim() !== '');
  return filled.length < 2;
}

export { ENERGY_SWITCH_API_URL };
