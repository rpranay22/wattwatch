// Create an admin account (there is no public admin signup).
// Usage: npm run init-db   (uses defaults below; change after first login)
import { randomUUID } from 'crypto';
import readline from 'readline/promises';
import { stdin, stdout } from 'process';
import { db } from './db.js';
import { hashPassword } from './auth.js';

const rl = readline.createInterface({ input: stdin, output: stdout });
const email = (await rl.question('Admin email [admin@wattwatch.ie]: ')) || 'admin@wattwatch.ie';
const name  = (await rl.question('Full name [Admin]: ')) || 'Admin';
const pass  = (await rl.question('Password [ChangeMe123!]: ')) || 'ChangeMe123!';
const role  = (await rl.question('Role super_admin/support/read_only [super_admin]: ')) || 'super_admin';
rl.close();

const [dupe] = await db.execute('SELECT id FROM admin_users WHERE email = ?', [email.toLowerCase()]);
if (dupe.length) { console.log('That admin already exists.'); process.exit(0); }

await db.execute('INSERT INTO admin_users (id, email, password_hash, full_name, role) VALUES (?,?,?,?,?)',
  [randomUUID(), email.toLowerCase(), await hashPassword(pass), name, role]);
console.log(`\nAdmin created: ${email} (${role}). Change the password after first login.`);
process.exit(0);
