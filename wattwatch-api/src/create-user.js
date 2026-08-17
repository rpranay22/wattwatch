import { randomUUID } from 'crypto';
import readline from 'readline/promises';
import { stdin, stdout } from 'process';
import { initDatabase } from './db.js';
import { User, Profile } from './models/index.js';
import { hashPassword } from './auth.js';

await initDatabase();

const rl = readline.createInterface({ input: stdin, output: stdout });
const email = (await rl.question('User email: ')).trim().toLowerCase();
const fullName = (await rl.question('Full name (optional): ')).trim();
const pass = await rl.question('Password (at least 8 characters): ');
rl.close();

if (!email || !pass || pass.length < 8) {
  console.error('Email and a password of at least 8 characters are required.');
  process.exit(1);
}

const dupe = await User.findOne({ where: { email } });
if (dupe) {
  console.log('That email already exists. Nothing changed.');
  process.exit(0);
}

const id = randomUUID();
await User.create({ id, email, password_hash: await hashPassword(pass) });
await Profile.create({ user_id: id, full_name: fullName || null });

console.log(`\nUser created:  ${email}\nSign into the app with this email and password.`);
process.exit(0);
