-- =====================================================================
-- WattWatch v0.3 schema (MySQL 8+). Safe to re-run.
-- New in v0.3: admin_users (separate from app users), usage_daily
-- (powers the Calendar screen), and tickets.replied_by.
-- =====================================================================
CREATE DATABASE IF NOT EXISTS wattwatch
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wattwatch;

-- ---------------- app users (the mobile app only) ----------------
CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36) PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status        ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL
);

-- ---------------- admin users (the portal only) ------------------
-- Deliberately separate: an app user can never sign into the portal
-- and an admin can never sign into the app. Different table, different
-- login endpoint, different token type.
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

CREATE TABLE IF NOT EXISTS profiles (
  user_id     CHAR(36) PRIMARY KEY,
  full_name   VARCHAR(120), phone VARCHAR(40), mprn VARCHAR(20),
  address     VARCHAR(255), city VARCHAR(80), eircode VARCHAR(10), supplier VARCHAR(80),
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS onboarding (
  user_id CHAR(36) PRIMARY KEY,
  devices JSON, household_size VARCHAR(8), supplier VARCHAR(80),
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alerts (
  id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL, kind ENUM('price','time') NOT NULL,
  condition_t ENUM('below','above') NULL, threshold DECIMAL(6,3) NULL,
  start_time VARCHAR(5) NULL, end_time VARCHAR(5) NULL,
  days JSON NOT NULL, enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_alerts_user (user_id)
);

-- tickets: created in the app, answered in the portal. replied_by links
-- to the admin who answered, so you can see who did what.
CREATE TABLE IF NOT EXISTS tickets (
  id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL,
  category VARCHAR(40), subject VARCHAR(200) NOT NULL, body TEXT NOT NULL,
  status ENUM('open','in_progress','resolved') NOT NULL DEFAULT 'open',
  admin_reply TEXT, replied_by CHAR(36) NULL, crm_id VARCHAR(80),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (replied_by) REFERENCES admin_users(id) ON DELETE SET NULL,
  INDEX idx_tickets_user (user_id), INDEX idx_tickets_status (status)
);

CREATE TABLE IF NOT EXISTS exports (
  id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL,
  format ENUM('pdf','csv','json') NOT NULL, period VARCHAR(20),
  status ENUM('queued','ready','failed') NOT NULL DEFAULT 'queued',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_exports_user (user_id)
);

-- usage_daily: one row per user per day. Powers the Calendar screen's
-- colour-coded grid and the daily breakdown (kWh, cost, avg/peak/low, best window).
CREATE TABLE IF NOT EXISTS usage_daily (
  user_id      CHAR(36) NOT NULL,
  day          DATE NOT NULL,
  kwh          DECIMAL(7,2) NOT NULL,
  cost         DECIMAL(7,2) NOT NULL,
  avg_price    DECIMAL(6,3) NOT NULL,
  peak_price   DECIMAL(6,3) NOT NULL,
  low_price    DECIMAL(6,3) NOT NULL,
  best_window  VARCHAR(20) NOT NULL,
  PRIMARY KEY (user_id, day),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NULL, admin_id CHAR(36) NULL,
  action VARCHAR(60) NOT NULL, detail JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_time (created_at)
);
