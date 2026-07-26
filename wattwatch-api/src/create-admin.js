import { randomUUID } from 'crypto';
import readline from 'readline/promises';
import { stdin, stdout } from 'process';
import { initDatabase } from './db.js';
import { AdminUser } from './models/index.js';
import { hashPassword } from './auth.js';

await initDatabase();

const rl = readline.createInterface({ input: stdin, output: stdout });
const email = (await rl.question('Admin email [admin@wattwatch.ie]: ')) || 'admin@wattwatch.ie';
const name = (await rl.question('Full name [Admin]: ')) || 'Admin';
const pass = (await rl.question('Password [ChangeMe123!]: ')) || 'ChangeMe123!';
const role = (await rl.question('Role super_admin/support/read_only [super_admin]: ')) || 'super_admin';
rl.close();

const dupe = await AdminUser.findOne({ where: { email: email.toLowerCase() } });
if (dupe) { console.log('That admin already exists.'); process.exit(0); }

await AdminUser.create({
  id: randomUUID(),
  email: email.toLowerCase(),
  password_hash: await hashPassword(pass),
  full_name: name,
  role,
});
console.log(`\nAdmin created: ${email} (${role}). Change the password after first login.`);
process.exit(0);
