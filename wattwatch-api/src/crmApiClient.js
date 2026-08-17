const CRM_API_URL = (process.env.CRM_API_URL || 'https://crm-backend-bj1l.onrender.com').replace(/\/$/, '');

/** Look up a CRM customer by email. Returns null if not found or CRM unreachable. */
export async function lookupCrmCustomer(email) {
  const url = `https://crm-backend-bj1l.onrender.com/api/customers/lookup?email=${encodeURIComponent(email)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || data.error) return null;
    return data.customer ?? data;
  } catch (e) {
    console.warn('CRM customer lookup failed:', e.message);
    return null;
  }
}
