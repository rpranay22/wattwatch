import { DataTypes, Sequelize } from 'sequelize';

const useSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';

export const sequelize = new Sequelize(
  process.env.DB_NAME || 'wattwatch',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: false,
    dialectOptions: useSsl ? { ssl: { rejectUnauthorized: false } } : {},
    define: { underscored: true, timestamps: false },
  }
);

// User model - using INTEGER for id (auto-increment)
export const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  status: { type: DataTypes.ENUM('active', 'suspended'), allowNull: false, defaultValue: 'active' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  last_login_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'users' });

// AdminUser model - using UUID/CHAR(36) for id (for external system compatibility)
export const AdminUser = sequelize.define('AdminUser', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  full_name: { type: DataTypes.STRING(120), allowNull: true },
  role: { type: DataTypes.ENUM('super_admin', 'support', 'read_only'), allowNull: false, defaultValue: 'support' },
  status: { type: DataTypes.ENUM('active', 'disabled'), allowNull: false, defaultValue: 'active' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  last_login_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'admin_users' });

// Profile model - FIXED: user_id now matches User.id type (INTEGER)
export const Profile = sequelize.define('Profile', {
  user_id: { type: DataTypes.INTEGER, primaryKey: true },
  full_name: { type: DataTypes.STRING(120), allowNull: true },
  phone: { type: DataTypes.STRING(40), allowNull: true },
  mprn: { type: DataTypes.STRING(20), allowNull: true },
  address: { type: DataTypes.STRING(255), allowNull: true },
  city: { type: DataTypes.STRING(80), allowNull: true },
  eircode: { type: DataTypes.STRING(10), allowNull: true },
  supplier: { type: DataTypes.STRING(80), allowNull: true },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'profiles' });

// Onboarding model - FIXED: user_id now matches User.id type (INTEGER)
export const Onboarding = sequelize.define('Onboarding', {
  user_id: { type: DataTypes.INTEGER, primaryKey: true },
  devices: { type: DataTypes.JSON, allowNull: true },
  household_size: { type: DataTypes.STRING(8), allowNull: true },
  supplier: { type: DataTypes.STRING(80), allowNull: true },
  completed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'onboarding' });

// Alert model - FIXED: user_id now matches User.id type (INTEGER)
export const Alert = sequelize.define('Alert', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(120), allowNull: false },
  kind: { type: DataTypes.ENUM('price', 'time'), allowNull: false },
  condition_t: { type: DataTypes.ENUM('below', 'above'), allowNull: true },
  threshold: { type: DataTypes.DECIMAL(6, 3), allowNull: true },
  start_time: { type: DataTypes.STRING(5), allowNull: true },
  end_time: { type: DataTypes.STRING(5), allowNull: true },
  days: { type: DataTypes.JSON, allowNull: false },
  enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'alerts' });

// Ticket model - FIXED: user_id now matches User.id type (INTEGER), replied_by matches AdminUser.id (CHAR(36))
export const Ticket = sequelize.define('Ticket', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  category: { type: DataTypes.STRING(40), allowNull: true },
  subject: { type: DataTypes.STRING(200), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM('open', 'in_progress', 'resolved'), allowNull: false, defaultValue: 'open' },
  admin_reply: { type: DataTypes.TEXT, allowNull: true },
  replied_by: { type: DataTypes.CHAR(36), allowNull: true },
  crm_id: { type: DataTypes.STRING(80), allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'tickets' });

// Export model - FIXED: user_id now matches User.id type (INTEGER)
export const Export = sequelize.define('Export', {
  id: { type: DataTypes.CHAR(36), primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  format: { type: DataTypes.ENUM('pdf', 'csv', 'json'), allowNull: false },
  period: { type: DataTypes.STRING(20), allowNull: true },
  status: { type: DataTypes.ENUM('queued', 'ready', 'failed'), allowNull: false, defaultValue: 'queued' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'exports' });

// UsageDaily model - FIXED: user_id now matches User.id type (INTEGER)
export const UsageDaily = sequelize.define('UsageDaily', {
  user_id: { type: DataTypes.INTEGER, primaryKey: true },
  day: { type: DataTypes.DATEONLY, primaryKey: true },
  kwh: { type: DataTypes.DECIMAL(7, 2), allowNull: false },
  cost: { type: DataTypes.DECIMAL(7, 2), allowNull: false },
  avg_price: { type: DataTypes.DECIMAL(6, 3), allowNull: false },
  peak_price: { type: DataTypes.DECIMAL(6, 3), allowNull: false },
  low_price: { type: DataTypes.DECIMAL(6, 3), allowNull: false },
  best_window: { type: DataTypes.STRING(20), allowNull: false },
}, { tableName: 'usage_daily' });

// ActivityLog model - FIXED: user_id matches User.id (INTEGER), admin_id matches AdminUser.id (CHAR(36))
export const ActivityLog = sequelize.define('ActivityLog', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  admin_id: { type: DataTypes.CHAR(36), allowNull: true },
  action: { type: DataTypes.STRING(60), allowNull: false },
  detail: { type: DataTypes.JSON, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'activity_log' });

// CRM tables (camelCase columns — managed by external CRM but synced here too)
export const CrmCustomer = sequelize.define('CrmCustomer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  phone: { type: DataTypes.STRING, allowNull: false },
  eircode: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING, allowNull: true },
  provider: { type: DataTypes.STRING, allowNull: false },
  mprn: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'CUSTOMER' },
  mustChangePassword: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  passwordHash: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'customers',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  underscored: false,
});

export const CrmTicket = sequelize.define('CrmTicket', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  customerId: { type: DataTypes.INTEGER, allowNull: false },
  subject: { type: DataTypes.STRING(180), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  priority: { type: DataTypes.STRING, allowNull: false, defaultValue: 'MEDIUM' },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'OPEN' },
}, {
  tableName: 'crm_tickets',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  underscored: false,
});

// ---- associations ----
User.hasOne(Profile, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Profile.belongsTo(User, { foreignKey: 'user_id' });

User.hasOne(Onboarding, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Onboarding.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Alert, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Alert.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Ticket, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Ticket.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Export, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Export.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(UsageDaily, { foreignKey: 'user_id', onDelete: 'CASCADE' });
UsageDaily.belongsTo(User, { foreignKey: 'user_id' });

AdminUser.hasMany(Ticket, { foreignKey: 'replied_by', onDelete: 'SET NULL' });
Ticket.belongsTo(AdminUser, { foreignKey: 'replied_by', as: 'replier' });

User.hasMany(ActivityLog, { foreignKey: 'user_id' });
ActivityLog.belongsTo(User, { foreignKey: 'user_id' });

AdminUser.hasMany(ActivityLog, { foreignKey: 'admin_id' });
ActivityLog.belongsTo(AdminUser, { foreignKey: 'admin_id', as: 'admin' });

CrmTicket.belongsTo(CrmCustomer, { foreignKey: 'customerId' });
CrmCustomer.hasMany(CrmTicket, { foreignKey: 'customerId' });

export const PushToken = sequelize.define('PushToken', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  token: { type: DataTypes.STRING(512), allowNull: false, unique: true },
  platform: { type: DataTypes.ENUM('android', 'ios', 'web'), allowNull: false, defaultValue: 'android' },
  cheap_window: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'push_tokens' });

User.hasMany(PushToken, { foreignKey: 'user_id', onDelete: 'CASCADE' });
PushToken.belongsTo(User, { foreignKey: 'user_id' });