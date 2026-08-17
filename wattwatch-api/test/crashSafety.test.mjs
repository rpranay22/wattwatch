// Proves the exact failure mode reported: one route throwing must not take
// down the whole server. Registers a deliberately-broken route through
// safeRouter, hits it, then confirms the server is still alive and answers
// a completely unrelated request afterward.
process.env.NODE_ENV = 'test';
import assert from 'assert';
import express from 'express';
import { safeRouter } from '../src/safeRouter.js';

const app = express();
const broken = safeRouter();

// Simulates exactly what usage.js did: an async handler that throws because
// of an unexpected value shape (the real bug was r.day.toISOString() on a
// value that wasn't a Date).
broken.get('/boom', async () => {
  const notADate = '2026-03-15'; // a plain string, like a mis-typed DB row
  notADate.toISOString(); // throws: not a function
});

broken.get('/fine', (req, res) => res.json({ ok: true }));

app.use('/test', broken);
app.use((err, req, res, next) => res.status(500).json({ error: 'Server error' })); // same shape as server.js

const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const base = `http://localhost:${server.address().port}`;

let n = 0; const ok = (m) => { n++; console.log('  ok  ' + m); };

const before = await fetch(`${base}/test/fine`);
assert.strictEqual(before.status, 200);
ok('a normal route works before anything goes wrong');

const boom = await fetch(`${base}/test/boom`);
assert.strictEqual(boom.status, 500);
const boomBody = await boom.json();
assert.strictEqual(boomBody.error, 'Server error');
ok('a throwing route returns a clean 500, not a hang or a crash');

// The critical check: is the process (and this server) still alive and
// serving completely unrelated requests right after the crash?
const after = await fetch(`${base}/test/fine`);
assert.strictEqual(after.status, 200);
ok('the server is STILL RUNNING and answers other routes immediately after — this is the bug that broke tickets after Calendar crashed it');

server.close();
console.log(`\n${n} checks passed.`);
process.exit(0);
