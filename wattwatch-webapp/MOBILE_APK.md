# WattWatch — Web UI to Android APK (Firebase: wattwatch-505811)

## Firebase project

| Setting | Value |
|---------|--------|
| Project ID | `wattwatch-505811` |
| Web app ID | `1:417090114795:web:73cfcae7081ee590f4daae` |
| Android package (Capacitor) | `ie.wattwatch.app` |

Client config lives in `.env.production` as `VITE_FIREBASE_*` (loaded by `src/lib/firebase.ts`).

---

## Push notification setup (2 parts)

### A. Client (web + APK)

- **Web / analytics:** Firebase JS SDK — initialized in `src/main.tsx`
- **APK push:** Capacitor + native FCM — requires **Android app** in the same Firebase project

In [Firebase Console](https://console.firebase.google.com/project/wattwatch-505811):

1. **Add Android app** (if not done) → package name **`ie.wattwatch.app`**
2. Download **`google-services.json`**
3. After `npx cap add android`, copy to:
   ```
   wattwatch-webapp/android/app/google-services.json
   ```

### B. Server (sends cheap-window push) — FCM v1

Your Firebase project has **Legacy API disabled** (normal for new projects). Use a **service account** instead — there is no Server key.

1. Firebase Console → **Project settings** → **Service accounts** tab
2. Click **Generate new private key** → downloads a `.json` file
3. On **Render** (WattWatch API) → **Environment** → add:

   **Key:** `FIREBASE_SERVICE_ACCOUNT_JSON`  
   **Value:** paste the **entire contents** of that JSON file (one line is fine)

4. Redeploy the API

The API watcher sends push when ENTSO-E price drops under €0.20/kWh.

> **Not the Web Push key** under Cloud Messaging → Web configuration. That long `BMq5...` key is for browser web push only, not for the server.

---

## Build APK

```bash
cd wattwatch-webapp
npm install
npm run build
npx cap add android          # first time only
# copy google-services.json → android/app/
npm run cap:sync
npm run cap:android
```

Build APK in Android Studio.

---

## What runs where

| Feature | Web browser | Android APK |
|---------|-------------|-------------|
| Firebase Analytics | Yes | WebView (limited) |
| Cheap-window alert | Browser tab open | **FCM push (app closed OK)** |
| Device token | — | `POST /push/register` |

See `src/lib/push.ts` and API `cheapWindowWatcher.js`.
