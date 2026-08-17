import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { Capacitor } from '@capacitor/core';

function readConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };
}

let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;

export async function initFirebase(): Promise<FirebaseApp | null> {
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }

  const config = readConfig();
  if (!config.apiKey || !config.projectId) {
    console.warn('Firebase env vars missing (VITE_FIREBASE_*) — skipping init');
    return null;
  }

  app = initializeApp(config);

  if (!Capacitor.isNativePlatform() && typeof window !== 'undefined') {
    try {
      if (await isSupported()) analytics = getAnalytics(app);
    } catch {
      // analytics optional
    }
  }

  return app;
}

export function getFirebaseApp() {
  return app;
}

export function getFirebaseAnalytics() {
  return analytics;
}

export function getFirebaseProjectId() {
  return import.meta.env.VITE_FIREBASE_PROJECT_ID || 'wattwatch-505811';
}
