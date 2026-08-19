// CRM backend base URL for server-to-server calls (login lookup, etc.).
// Set CRM_API_URL in Render/your host — do NOT use localhost in production.
// Falls back to the deployed CRM on Render if the env var is missing.
const CRM_API_URL = (
  process.env.CRM_API_URL ||
  'http://localhost:5000' // fallback for local dev
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

export { CRM_API_URL };

