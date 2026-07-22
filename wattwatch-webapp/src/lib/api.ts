// Web API client. Talks to the same WattWatch backend the mobile app used.
// Token lives in localStorage (web equivalent of the app's secure store).
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'ww_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {}

async function request(path: string, opts: RequestInit = {}) {
  const token = getToken();
  // Login and signup are the endpoints where a 401 means "wrong credentials",
  // not "your session ended". Treating them the same was a real bug: a simple
  // typo in your password showed a misleading "session expired" message and
  // made it look like sign-in was broken.
  const isAuthAttempt = path === '/auth/login' || path === '/auth/signup';

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        // Never send a stale token on a fresh sign-in attempt.
        ...(token && !isAuthAttempt ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the API running?');
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (res.status === 401 && !isAuthAttempt) {
    clearToken();
    throw new ApiError('Your session expired. Please sign in again.');
  }
  if (!res.ok) throw new ApiError(data?.error ?? `Error ${res.status}`);
  return data;
}

export interface AuthUser { id: string; email: string }
export interface Alert {
  id: string; name: string; kind: 'price' | 'time';
  condition?: 'below' | 'above'; threshold?: number;
  start?: string; end?: string; days: string[]; enabled: boolean;
}

export const api = {
  signup: (email: string, password: string, fullName?: string) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, fullName }) }),
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),
  deleteAccount: (password: string) =>
    request('/auth/account', { method: 'DELETE', body: JSON.stringify({ password }) }),

  getPrices: (): Promise<{ day: string; source: string; prices: number[] }> => request('/prices'),

  getOnboarding: () => request('/onboarding'),
  saveOnboarding: (a: any) => request('/onboarding', { method: 'PUT', body: JSON.stringify(a) }),

  listAlerts: (): Promise<Alert[]> => request('/alerts'),
  createAlert: (a: any) => request('/alerts', { method: 'POST', body: JSON.stringify(a) }),
  toggleAlert: (id: string, enabled: boolean) => request(`/alerts/${id}`, { method: 'PUT', body: JSON.stringify({ enabled }) }),
  deleteAlert: (id: string) => request(`/alerts/${id}`, { method: 'DELETE' }),

  getUsage: (month: string) => request(`/usage?month=${month}`),

  getProfile: () => request('/profile'),
  saveProfile: (p: any) => request('/profile', { method: 'PUT', body: JSON.stringify(p) }),

  listExports: () => request('/exports'),
  requestExport: (format: 'pdf' | 'csv' | 'json', period?: string) =>
    request('/exports', { method: 'POST', body: JSON.stringify({ format, period }) }),

  listTickets: () => request('/tickets'),
  createTicket: (subject: string, body: string, category?: string) =>
    request('/tickets', { method: 'POST', body: JSON.stringify({ subject, body, category }) }),
};
