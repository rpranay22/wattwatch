# Database Repair — corrupted `tickets` table

Only needed if you ran the CRM backend against this database BEFORE applying
the `Ticket.js` patch. Symptom: `DESCRIBE tickets;` shows CRM columns
(`customerId`, `description`, `priority`) instead of WattWatch columns
(`user_id`, `body`, `admin_reply`).

## Why it happens

The CRM's `Ticket.js` originally set `tableName: "tickets"` — the same name
WattWatch uses. The CRM runs `sequelize.sync({ alter: true })` on startup,
which finds the existing `tickets` table and reshapes it into the CRM's model,
dropping WattWatch's columns. The two systems then fight over one table.

## The fix

First check you are not about to lose real data:

```sql
USE wattwatch;
SELECT COUNT(*) FROM tickets;
```

If that number is 0 (or only throwaway test tickets), continue. If it holds
real tickets you need, note that they are already missing half their columns,
so there is no clean recovery — export what you can first, then continue.

Make sure `admin_users` exists (the new tickets table references it):

```sql
CREATE TABLE IF NOT EXISTS admin_users (
  id            CHAR(36) PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(120),
  role          ENUM('super_admin','support','read_only') NOT NULL DEFAULT 'support',
  status        ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL
);
```

Drop the corrupted table and recreate it in WattWatch's correct shape:

```sql
DROP TABLE tickets;

CREATE TABLE tickets (
  id          CHAR(36) PRIMARY KEY,
  user_id     CHAR(36) NOT NULL,
  category    VARCHAR(40),
  subject     VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  status      ENUM('open','in_progress','resolved') NOT NULL DEFAULT 'open',
  admin_reply TEXT,
  replied_by  CHAR(36) NULL,
  crm_id      VARCHAR(80),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (replied_by) REFERENCES admin_users(id) ON DELETE SET NULL,
  INDEX idx_tickets_user (user_id),
  INDEX idx_tickets_status (status)
);
```

Confirm:

```sql
DESCRIBE tickets;
```

You should see 11 columns: `id, user_id, category, subject, body, status,
admin_reply, replied_by, crm_id, created_at, updated_at`.

## Prevent it happening again

Before you EVER start the CRM backend against this database again, patch its
`models/Ticket.js`:

```js
tableName: "crm_tickets",   // was "tickets"
```

With that change, the CRM creates its own separate `crm_tickets` table and
never touches WattWatch's `tickets` table again.
