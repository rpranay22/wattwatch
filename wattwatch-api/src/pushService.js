// FCM push via Firebase Admin SDK (HTTP v1).
// Legacy Server key is disabled on new Firebase projects — use a service account JSON instead.
//
// Firebase Console → Project settings → Service accounts → Generate new private key
// → set entire JSON as FIREBASE_SERVICE_ACCOUNT_JSON on Render

const CHEAP_MAX = 0.2;

let messaging = null;

async function getMessaging() {
  if (messaging) return messaging;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    const { default: admin } = await import('firebase-admin');
    const serviceAccount = JSON.parse(raw);
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    messaging = admin.messaging();
    return messaging;
  } catch (e) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_JSON invalid:', e.message);
    return null;
  }
}

export async function sendFcmToTokens(tokens, { title, body, data = {} }) {
  const msg = await getMessaging();
  if (!msg) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications skipped');
    return { sent: 0, skipped: tokens.length };
  }
  if (!tokens.length) return { sent: 0, skipped: 0 };

  const stringData = Object.fromEntries(
    Object.entries({ ...data, title, body }).map(([k, v]) => [k, String(v)])
  );

  const response = await msg.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: stringData,
    android: { priority: 'high', notification: { sound: 'default', channelId: 'cheap_window' } },
  });

  return {
    sent: response.successCount,
    failed: response.failureCount,
  };
}

export function tierForPrice(price) {
  if (price < CHEAP_MAX) return 'cheap';
  if (price < 0.28) return 'moderate';
  return 'expensive';
}

export function cheapWindowMessage(price, entering) {
  const fmt = `€${Number(price).toFixed(3)}`;
  if (entering) {
    return {
      title: 'Price dropped — cheap window',
      body: `${fmt}/kWh (under €0.20). Good time to run appliances or charge your EV.`,
    };
  }
  return {
    title: 'Cheap electricity now',
    body: `${fmt}/kWh — you're in a cheap window. Good time to use heavy loads.`,
  };
}

export { CHEAP_MAX };
