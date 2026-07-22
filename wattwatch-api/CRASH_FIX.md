# WattWatch API — Server Crash Fix

## What was actually happening

Opening the **Calendar** screen crashed the entire API process. Once it
crashed, every other feature — including sending tickets — failed too,
because the server was no longer running. Two symptoms, one bug.

## Root cause

`src/usage.js` line 36 called `.toISOString()` on a MySQL `DATE` value. Not
every driver/timezone combination returns that as a JS `Date` object, and the
conversion could also silently shift the calendar day depending on the
server's timezone. When it threw, nothing caught it.

That second part is the real problem: **not one route handler in this API
had a try/catch.** In Express 4, if an `async` route handler throws, nothing
catches the rejected promise automatically. On Node 15+ (you're on Node 24),
an unhandled promise rejection **terminates the entire process by default**.
So a bug in `/usage` didn't just break the Calendar — it killed the whole
server, and every request after that — including ticket creation — failed
until you restarted it by hand.

## What was fixed

1. **`src/db.js`** — MySQL `DATE` columns now come back as plain
   `'YYYY-MM-DD'` strings instead of JS `Date` objects, removing the
   timezone-conversion bug at its source.
2. **`src/usage.js`** — uses that string directly; no more `.toISOString()`.
3. **`src/safeRouter.js`** (new) — a drop-in replacement for Express's
   `Router()` that catches a rejected promise from every route handler and
   turns it into a clean `500` response instead of an unhandled rejection.
   Applied to **all 9 route files**, not just the one that broke. This means
   *any* future bug in *any* endpoint can only ever fail its own request —
   it can no longer take the whole server down with it.
4. **`src/server.js`** — added `process.on('unhandledRejection', ...)` and
   `process.on('uncaughtException', ...)` as a second safety net, logging
   instead of crashing, in case anything outside a route handler ever slips
   through.

## Proof

A new test (`test/crashSafety.test.mjs`) registers a route that reproduces
the exact original bug, hits it, and confirms:
- it returns a clean `500`, not a hang or a crash
- the server is **still running** immediately after, and answers a
  completely unrelated request normally

`npm test` now runs 30 checks total (15 API guards + 12 CRM mapping + 3
crash-safety) and all pass.

## What you need to do

Just redeploy this updated API — nothing else changed. The app, the CRM
patch, and your database schema are untouched.

```powershell
cd C:\BCP\v3\wattwatch-api
# stop the currently running npm run dev (Ctrl+C) if it's up
npm install
npm test          # confirm 30 checks pass
npm run dev
```

Open `http://localhost:4000/health` — confirm `db: connected`. Then reopen
the Calendar in the app and try raising a ticket again. Both should now work,
and if either ever throws again, it'll return a clean error instead of taking
the server down.
