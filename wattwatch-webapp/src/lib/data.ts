// Shared reference data for the web app (mirrors the mobile app's dataset).

export const SUPPLIERS = [
  'Electric Ireland', 'Bord Gáis Energy', 'Energia',
  'SSE Airtricity', 'PrePay Power', 'Other',
] as const;

/** Match energy-switch provider labels to WattWatch supplier options. */
export function normalizeSupplier(value: string | null | undefined): string | null {
  if (value == null || String(value).trim() === '') return null;
  const raw = String(value).trim();
  const compact = raw.toLowerCase().replace(/[\s-]+/g, '');
  if (compact === 'prepaypower') return 'PrePay Power';
  const match = SUPPLIERS.find((s) => s.toLowerCase() === raw.toLowerCase());
  return match ?? raw;
}

export type DeviceKey = 'ev' | 'heatpump' | 'solar' | 'battery';

export const DEVICE_OPTIONS: { key: DeviceKey; label: string; icon: string }[] = [
  { key: 'ev', label: 'Electric vehicle', icon: '🚗' },
  { key: 'heatpump', label: 'Heat pump', icon: '🌡️' },
  { key: 'solar', label: 'Solar panels', icon: '☀️' },
  { key: 'battery', label: 'Home battery', icon: '🔋' },
];

export const HOUSEHOLD_SIZES = ['1', '2', '3', '4', '5+'] as const;

export interface Device {
  id: string; name: string; brand: string; status: string;
  tone: 'cheap' | 'moderate' | 'expensive';
  progress: number; cost: number; kwh: number; detail: string; icon: string;
}

export const DEVICES: Device[] = [
  { id: 'ev', name: 'EV Charger', brand: 'Volkswagen ID.4', status: 'Charging', tone: 'cheap',
    progress: 0.7, cost: 2.26, kwh: 9.6, detail: 'Charged 01:30–04:00 on the night rate', icon: '🚗' },
  { id: 'lights', name: 'Smart Lights', brand: 'Philips Hue · 8 bulbs', status: 'On', tone: 'moderate',
    progress: 0.35, cost: 0.42, kwh: 1.8, detail: 'Living room and kitchen active', icon: '💡' },
  { id: 'heatpump', name: 'Heat Pump', brand: 'Daikin Altherma', status: 'Idle', tone: 'cheap',
    progress: 0.15, cost: -1.10, kwh: 4.2, detail: 'Pre-heated during the cheap window', icon: '🌡️' },
  { id: 'washer', name: 'Washing Machine', brand: 'Bosch Series 6', status: 'Scheduled', tone: 'cheap',
    progress: 0, cost: -0.65, kwh: 1.1, detail: 'Delayed to 02:00 to catch the low rate', icon: '🧺' },
  { id: 'dishwasher', name: 'Dishwasher', brand: 'Beko', status: 'Off', tone: 'moderate',
    progress: 0, cost: 0.38, kwh: 1.4, detail: 'Last run at 19:15 during peak', icon: '🍽️' },
];

export const FAQS = [
  { q: 'What is dynamic pricing?',
    a: 'Instead of one flat rate, the price of electricity changes every half hour based on wholesale market conditions. When wind generation is high and demand is low (usually overnight), electricity is cheap. During the evening peak, it costs more.' },
  { q: 'How do alerts work?',
    a: 'A price alert watches the half-hourly price and notifies you when it crosses your threshold. A time alert simply reminds you at a set time each day. You can create either from the Alerts page, or just ask the assistant in plain English.' },
  { q: 'Where do the prices come from?',
    a: 'Prices come from the ENTSO-E Transparency Platform, the official European source for day-ahead electricity prices, using the Irish SEM bidding zone. Until an access token is configured, the app shows a realistic simulated curve and says so clearly.' },
  { q: 'How much can I actually save?',
    a: 'It depends on how much of your usage is flexible. Moving a dishwasher cycle, a washing machine load, and EV charging to the cheapest window typically saves the most. The Analytics page shows the gap between peak and cheapest for your chosen period.' },
  { q: 'Is my data safe?',
    a: 'Your account details and preferences are stored in our database and are only used to run the service. You can request a copy of your data or delete your account from Settings.' },
];

export const TICKET_CATEGORIES = [
  'Billing',
  'Subscription',
  'Account',
  'Technical',
  'App feedback',
  'General',
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export interface BillingInvoice {
  id: string;
  period: string;
  amount: string;
  status: 'Paid' | 'Pending';
  date: string;
  planName: string;
}

export interface BillingState {
  planId: string;
  invoices: BillingInvoice[];
  /** YYYY-MM of last successful payment */
  paidMonth: string | null;
}

export const DEFAULT_INVOICES: BillingInvoice[] = [
  { id: 'INV-2026-07', period: 'Standard — July 2026', amount: '€9.99', status: 'Paid', date: '01 Jul 2026', planName: 'Standard' },
  { id: 'INV-2026-06', period: 'Standard — June 2026', amount: '€9.99', status: 'Paid', date: '01 Jun 2026', planName: 'Standard' },
  { id: 'INV-2026-05', period: 'Standard — May 2026', amount: '€9.99', status: 'Paid', date: '01 May 2026', planName: 'Standard' },
];

const BILLING_KEY = 'ww_billing';

export function loadBillingState(): BillingState {
  try {
    const raw = localStorage.getItem(BILLING_KEY);
    if (raw) return JSON.parse(raw) as BillingState;
  } catch { /* ignore */ }
  return { planId: 'standard', invoices: [...DEFAULT_INVOICES], paidMonth: null };
}

export function saveBillingState(state: BillingState) {
  localStorage.setItem(BILLING_KEY, JSON.stringify(state));
}

export const PLANS = [
  {
    id: 'free', name: 'Free', price: '€0',
    features: [
      { label: 'Live electricity price tracking', included: true },
      { label: 'Daily price chart', included: true },
      { label: 'Up to 3 price alerts', included: true },
      { label: 'Weekly, monthly, yearly charts', included: false },
      { label: 'Device monitoring', included: false },
      { label: 'Data export', included: false },
    ],
  },
  {
    id: 'standard', name: 'Standard', price: '€9.99',
    features: [
      { label: 'Live electricity price tracking', included: true },
      { label: 'Daily, weekly and monthly charts', included: true },
      { label: 'Up to 10 price alerts', included: true },
      { label: 'Device monitoring (4 devices)', included: true },
      { label: 'Monthly bill summary', included: true },
      { label: 'Unlimited alerts', included: false },
      { label: 'EV charging optimiser', included: false },
      { label: 'PDF and Excel export', included: false },
    ],
  },
  {
    id: 'premium', name: 'Premium', price: '€14.99',
    features: [
      { label: 'Everything in Standard', included: true },
      { label: 'Unlimited alerts', included: true },
      { label: 'EV charging optimiser', included: true },
      { label: 'PDF, CSV and JSON export', included: true },
      { label: 'Supplier comparison', included: true },
      { label: 'Priority support', included: true },
    ],
  },
];

export const INVOICES = DEFAULT_INVOICES;
