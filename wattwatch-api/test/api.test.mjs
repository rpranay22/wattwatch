process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
import assert from 'assert';
import { signUserToken, signAdminToken } from '../src/auth.js';
const { default: app } = await import('../src/server.js');

const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const base = `http://localhost:${server.address().port}`;
let n = 0; const ok = (m) => { n++; console.log('  ok  ' + m); };
const get = (p, t) => fetch(base + p, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
const post = (p, b, t) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(t?{Authorization:`Bearer ${t}`}:{}) }, body: JSON.stringify(b) });
const put = (p, b, t) => fetch(base + p, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(t?{Authorization:`Bearer ${t}`}:{}) }, body: JSON.stringify(b) });

const userTok = signUserToken({ id: 'u1' });
const adminTok = signAdminToken({ id: 'a1', role: 'super_admin' });
const readOnlyTok = signAdminToken({ id: 'a2', role: 'read_only' });

// health + routing
let r = await get('/health'); const h = await r.json();
assert.strictEqual(h.version, '0.3.0'); ok(`server boots, /health v${h.version} (db: ${h.db})`);
r = await get('/nope'); assert.strictEqual(r.status, 404); ok('unknown route 404');

// app routes reject anonymous
for (const p of ['/onboarding','/profile','/tickets','/alerts','/exports','/usage']) {
  r = await get(p); assert.strictEqual(r.status, 401, p);
}
ok('all app routes reject anonymous (401)');

// THE KEY TEST: the two identities cannot cross over
r = await get('/profile', adminTok);
assert.strictEqual(r.status, 403);
ok('an ADMIN token CANNOT call app routes (403) — separation holds');

r = await get('/admin/stats', userTok);
assert.strictEqual(r.status, 403);
ok('an APP-USER token CANNOT call admin routes (403) — separation holds');

r = await get('/admin/stats');
assert.strictEqual(r.status, 401);
ok('admin routes reject anonymous (401)');

// read_only admin cannot write
r = await put('/admin/users/some-id/status', { status: 'suspended' }, readOnlyTok);
assert.strictEqual(r.status, 403);
ok('a read_only admin CANNOT change data (403)');

// validation (pre-DB)
r = await post('/auth/signup', { email: 'bad', password: 'xxxxxxxx' });
assert.strictEqual(r.status, 400); ok('signup rejects bad email (400)');
r = await post('/auth/signup', { email: 'a@b.ie', password: 'short' });
assert.strictEqual(r.status, 400); ok('signup rejects short password (400)');
r = await post('/admin/auth/login', { email: 'a@b.ie' });
assert.strictEqual(r.status, 400); ok('admin login needs both fields (400)');
r = await post('/alerts', { name: '', kind: 'price', threshold: 0.2 }, userTok);
assert.strictEqual(r.status, 400); ok('alert without a name rejected (400)');
r = await post('/exports', { format: 'docx' }, userTok);
assert.strictEqual(r.status, 400); ok('export bad format rejected (400)');
r = await get('/usage?month=2026-13', userTok);
assert.strictEqual(r.status, 400); ok('usage rejects an impossible month (400)');
r = await post('/tickets', { subject: 'hi' }, userTok);
assert.strictEqual(r.status, 400); ok('ticket without a body rejected (400)');

// tampered token
r = await get('/profile', 'garbage.token'); assert.strictEqual(r.status, 401);
ok('tampered token rejected (401)');

server.close();
console.log(`\n${n} checks passed.`);
process.exit(0);
