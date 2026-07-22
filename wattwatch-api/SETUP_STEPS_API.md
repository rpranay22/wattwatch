# WattWatch API — Setup Steps (this folder ONLY)

This folder is the **backend API**. It is a Node server. It does NOT run in
Expo. If you ever see `expo start` here, you are in the wrong folder.

How to know you are in the right folder:
- `package.json` says `"name": "wattwatch-api"`
- there is a `schema.sql` file
- there is a `src/server.js` file

---

## Step A1 — Confirm you are in the API folder

Open PowerShell in this folder and run:

```powershell
Get-Content package.json | Select-String '"name"'
```

It MUST print:  `"name": "wattwatch-api",`

If it prints `"name": "wattwatch"` (no `-api`), you extracted the app zip
here by mistake. Delete this folder's contents and extract
`wattwatch-api-v0.3-crm.zip` again.

---

## Step A2 — Create the database

Open MySQL Workbench, open the `schema.sql` file from this folder, and run the
whole thing (the lightning-bolt button). Then confirm:

```sql
USE wattwatch;
SHOW TABLES;
```

You should see 9 tables (users, profiles, onboarding, alerts, tickets,
exports, usage_daily, activity_log, admin_users).

---

## Step A3 — Install dependencies

```powershell
npm install
```

---

## Step A4 — Create your .env

```powershell
Copy-Item .env.example .env
notepad .env
```

Set these lines to your real values:

```
DB_PASSWORD=your_mysql_password
JWT_SECRET=paste_the_generated_value
DB_SSL=false
```

Generate the JWT secret in another PowerShell line and paste the output in:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Save and close Notepad.

> Watch the `.env.txt` trap: Windows may secretly name it `.env.txt`.
> Check with `Get-ChildItem -Force | Where-Object Name -like ".env*"`.
> Rename with `Rename-Item .env.txt .env` if needed.

---

## Step A5 — Run the tests (optional but reassuring)

```powershell
npm test
```

Should print `27 checks passed` (15 API + 12 CRM mapping).

---

## Step A6 — Start the API

```powershell
npm run dev
```

You should see: `WattWatch API v0.3 on http://localhost:4000`

Open `http://localhost:4000/health` in a browser. It MUST show:

```json
{ "api": "ok", "db": "connected", "version": "0.3.0" }
```

If `db` says `unreachable`, your `.env` MySQL details are wrong or MySQL is
not running. Fix that before doing anything with the app.

**Leave this window running.** The app talks to it.

---

## Common errors

| Error | Meaning | Fix |
|---|---|---|
| `Missing script: "dev"` | You are in the app folder, not the API | Check Step A1 |
| `Access denied ... using password: NO` | `.env` not found | `.env.txt` trap — see Step A4 |
| `Access denied ... using password: YES` | Wrong `DB_PASSWORD` | Fix it in `.env` |
| `Unknown database 'wattwatch'` | Schema not run | Do Step A2 |
| `/health` shows `db: unreachable` | MySQL off or wrong creds | Start MySQL, recheck `.env` |
