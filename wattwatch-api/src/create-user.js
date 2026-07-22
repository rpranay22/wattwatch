// Creates a WattWatch app user directly in the database. Used when the app
// has no signup flow — you seed known-good login credentials from here.
//
// Usage: npm run add-user
import { randomUUID } from 'crypto';
import readline from 'readline/promises';
import { stdin, stdout } from 'process';
import { db } from './db.js';
import { hashPassword } from './auth.js';

const rl = readline.createInterface({ input: stdin, output: stdout });
const email = (await rl.question('User email: ')).trim().toLowerCase();
const fullName = (await rl.question('Full name (optional): ')).trim();
const pass = await rl.question('Password (at least 8 characters): ');
rl.close();

if (!email || !pass || pass.length < 8) {
  console.error('Email and a password of at least 8 characters are required.');
  process.exit(1);
}

const [dupe] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
if (dupe.length) {
  console.log('That email already exists. Nothing changed.');
  process.exit(0);
}

const id = randomUUID();
await db.execute('INSERT INTO users (id, email, password_hash) VALUES (?,?,?)',
  [id, email, await hashPassword(pass)]);
await db.execute('INSERT INTO profiles (user_id, full_name) VALUES (?,?)',
  [id, fullName || null]);

console.log(`\nUser created:  ${email}\nSign into the app with this email and password.`);
process.exit(0);
