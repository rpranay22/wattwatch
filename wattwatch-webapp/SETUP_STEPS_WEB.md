# WattWatch Web App — Complete Feature Set

Browser-based WattWatch. Every feature from the mobile app, plus login/signup.
package.json name = "wattwatch-web". Runs on port 5174.

## Pages (14)

| Page | What it does |
|---|---|
| Login / Signup | Real JWT authentication against the API |
| Onboarding | Welcome explainer + 3 setup questions (devices, household, supplier) |
| Dashboard | Current price, tier, cheapest window, today's range |
| Analytics | Dynamic Daily / Weekly / Monthly / Yearly chart |
| Alerts | Create, pause, delete price and time alerts |
| Calendar | Monthly usage grid, colour-coded, per-day breakdown |
| Devices | Per-device usage, cost, and savings from shifting |
| How it works | Dynamic pricing explainer with today's real figures |
| My details | Name, phone, MPRN, address, Eircode, supplier |
| Plan & billing | Subscription plans and invoice history |
| Settings | Theme, notifications, privacy, data export |
| Support | Raise and track tickets (flows to the CRM) |
| Help | FAQ accordion |

## Features
- **Authentication** — signup, login, protected routes, session persistence
- **Floating AI assistant** — rule-based, on every page, confirm-before-create alerts
- **Dark mode** — sidebar toggle or Settings, remembered across sessions
- **Browser notifications** — enable in Settings; alerts fire while the app is open
- **ENTSO-E pricing** — live when a token is set on the API, clearly labelled otherwise
- **Data export** — request PDF / CSV / JSON, recorded in the exports table
- **All data persisted** — users, profiles, onboarding, alerts, tickets, exports

## Prerequisites
The WattWatch API must be running (port 4000) against your MySQL database:
    cd wattwatch-api
    npm install
    npm run dev
Confirm http://localhost:4000/health shows db: connected.

## Run the web app
    cd wattwatch-web
    npm install
    copy .env.example .env
    npm run dev
Opens http://localhost:5174

## First use
1. Click "Create an account", sign up (8+ character password)
2. Complete the short onboarding
3. Explore. Click the assistant button (bottom-right) and try
   "alert me when price is below 0.18"
4. Go to Settings and enable notifications to see alerts fire

## Build for hosting
    npm run build
Deploy the `dist/` folder to Netlify, Vercel, or any static host.
Set VITE_API_URL to your public API URL before building.

## Honest scope
- Prices are simulated until an ENTSO-E token is set on the API. The app shows
  the current source on the Dashboard and Analytics.
- Device figures and billing/invoices are illustrative for the prototype.
- Notifications work while the app is open in a browser tab. Notifications
  when the app is fully closed would need server-side push infrastructure.
