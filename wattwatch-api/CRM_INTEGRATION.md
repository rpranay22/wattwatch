# WattWatch — CRM Ticket Integration

Wires ticket creation in the mobile app into your existing CRM (the
Sequelize/Express backend you uploaded), so tickets raised in the app appear
in the CRM's Tickets page.

The WattWatch admin portal (`wattwatch-admin`) is **not touched** and keeps
working exactly as it did.

---

## What changed, and why

**One required edit to your CRM backend:**

`models/Ticket.js` — `tableName` changed from `"tickets"` to `"crm_tickets"`.

Your CRM backend and the WattWatch API were about to share one MySQL database,
and WattWatch's API already owns a table literally called `tickets` (used by
the WattWatch admin portal you told me to leave alone). If the CRM's
`sequelize.sync({ alter: true })` ran against a table it didn't create, with a
completely different schema, it would try to reshape it into the CRM's shape
on every restart — corrupting the WattWatch ticket data and breaking the admin
portal. Renaming to `crm_tickets` avoids the collision entirely. Nothing else
in your CRM backend changes; every route file goes through the `Ticket` model
object, never a raw table-name string, so this one line is the only edit
needed.

**Three new files in the WattWatch API**, none of which touch your CRM code
further:

| File | Does |
|---|---|
| `src/crmMapping.js` | Pure functions: WattWatch data → CRM's exact column shape. No database calls — fully unit tested. |
| `src/crmClient.js` | Talks to the CRM's `customers` / `crm_tickets` tables directly over the same MySQL connection. No HTTP call to the CRM backend. |
| `src/db.js` | Gained an optional `DB_SSL` flag, since your CRM's `database.js` hard-requires SSL. |

**One route changed:** `POST /tickets` in the WattWatch API now does two
things instead of one — saves to WattWatch's own `tickets` table exactly as
before, then best-effort mirrors the same ticket into the CRM's tables.

---

## Why direct SQL, not an HTTP call to your CRM's `POST /api/tickets`

Your CRM's own ticket-create route (`ticketRoutes.js`) expects a raw
`customerId` in the request body — it has no idea what a WattWatch app user
is. To use it, the WattWatch API would first need to know the CRM customer's
numeric id, which means duplicating a find-or-create step regardless. Since
both backends already point at the same MySQL database, it's simpler and more
reliable to write directly into the tables your Sequelize models define,
matching their exact column names, than to add a network hop between two
services on the same machine. Your CRM's routes are completely unaffected —
they still work precisely as written, reading whatever is in `customers` and
`crm_tickets`, regardless of which process inserted the rows.

---

## The identity mismatch, handled

Your CRM's `customers` table requires `phone`, `eircode`, `provider`, `mprn`
as NOT NULL — but a WattWatch profile can be incomplete (a user can raise a
ticket before finishing **My Details**). `crmMapping.js` fills gaps with
honest placeholders (`"Not provided"`, `"N/A"`) rather than failing the
request. And a WattWatch profile stores one `full_name` field where the CRM
wants `firstName`/`lastName` split — handled with a name splitter that copes
with a single name, extra whitespace, or nothing at all.

App users are marked `status: "CUSTOMER"` directly rather than `"LEAD"`. They
already have a real login in the WattWatch app; they are not an unconverted
lead waiting on a CRM agent to activate them. This keeps your CRM's **Leads**
page showing only genuine onboarding-form submissions, not every app user who
happened to raise a ticket. Their `passwordHash` stays null — they never use
the CRM's separate customer-login, only the WattWatch app's own.

Ticket `category` (Account/Billing/Technical/Other) has no equivalent field in
your CRM, so it's folded into the top of the description
(`[Category: Billing]\n\n...`) rather than silently dropped.

---

# Steps: build to deploy

## 1. Apply the CRM patch

In your CRM backend project, open `models/Ticket.js` and change:

```js
tableName: "tickets",
```
to:
```js
tableName: "crm_tickets",
```

That's the only change. Nothing else in the CRM project needs to move.

## 2. Point both backends at the same database

In the **CRM's** `.env`, `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_PORT`
already point wherever your CRM currently lives.

In the **WattWatch API's** `.env`, set the same four values, plus:

```
DB_SSL=true
```

(only if that database is a cloud MySQL requiring SSL, which your CRM's
`database.js` assumes — if you're on plain local MySQL for both, leave it
`false`).

## 3. Start the CRM backend once, so Sequelize creates the tables

```powershell
cd path\to\crm-backend
npm install
npm start
```

Watch the log for:

```
Database connected successfully
Database tables synchronized
```

That confirms `customers` and `crm_tickets` now exist with the exact columns
Sequelize expects. You can stop the CRM backend after this if you're not
running the CRM frontend right now — the tables persist in MySQL either way.

> WattWatch's API never creates these tables itself. It only ever reads and
> inserts into ones that already exist, so run the CRM backend at least once
> before raising a ticket from the app.

## 4. Start the WattWatch API

```powershell
cd C:\BCP\v3\wattwatch-api
npm install
npm test          # 27 checks: 15 API guards + 12 CRM-mapping edge cases
npm run dev
```

Check `http://localhost:4000/health` shows `db: connected`.

## 5. Raise a ticket from the app

Open the mobile app, sign in, go to **Profile → Support → Raise a ticket**,
fill it in, send.

## 6. Confirm it landed in the CRM's tables

```sql
SELECT id, firstName, lastName, email, status FROM customers ORDER BY id DESC LIMIT 5;
SELECT id, customerId, subject, priority, status, description FROM crm_tickets ORDER BY id DESC LIMIT 5;
```

You should see a new `customers` row (status `CUSTOMER`) and a new
`crm_tickets` row referencing it.

## 7. Confirm it shows in the CRM frontend

Start the CRM backend (`npm start` in the CRM backend folder) and the CRM
frontend (`npm start` in the CRM React app). Open the **Tickets** page — the
app-created ticket appears there, with the customer's name, subject,
description (with the category prefix), and an `OPEN` status you can move to
`IN_PROGRESS` or `RESOLVED` from the dropdown, exactly as the CRM already
does.

## 8. Confirm the WattWatch admin portal is unaffected

Open the WattWatch admin portal, go to **Tickets** — the same ticket is there
too, in WattWatch's own shape, because the original insert into WattWatch's
`tickets` table still happens first and is untouched.

---

# What happens if the CRM tables aren't there yet

If you raise a ticket in the app before ever starting the CRM backend, nothing
breaks. The WattWatch ticket saves normally, the API logs a warning
(`CRM tables not found — skipping CRM sync`), and the request still returns
success to the app. Once you start the CRM backend and it creates its tables,
every ticket raised **from that point on** syncs across. Tickets raised before
that point are not retroactively synced — say so plainly if asked, rather than
implying otherwise.

---

# Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Ticket saves in the app, nothing in `customers`/`crm_tickets` | CRM backend never started against this DB | Run `npm start` in the CRM backend once (Step 3) |
| API log: `CRM tables not found` | Same as above, or wrong `DB_NAME` | Confirm both `.env` files point at the same database |
| `ER_ACCESS_DENIED` on WattWatch API start | Wrong `DB_PASSWORD`, or SSL mismatch | If the CRM needs SSL, set `DB_SSL=true` in the WattWatch API's `.env` too |
| CRM backend fails to start after the patch | Unrelated — check its own `.env` (`DB_HOST` etc.) | The `tableName` rename alone cannot cause a startup failure |
| Ticket appears in CRM with `firstName: "someone"`, `lastName: "User"` | The WattWatch user has no name in **My Details** yet | Expected fallback behaviour, not a bug — ask them to complete their profile |
