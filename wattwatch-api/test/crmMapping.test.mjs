import assert from 'assert';
import { splitName, buildCrmCustomerPayload, buildCrmTicketPayload, mapCrmStatusToWattWatch, FALLBACK } from '../src/crmMapping.js';

let n = 0; const ok = (m) => { n++; console.log('  ok  ' + m); };

// splitName
assert.deepStrictEqual(splitName('Jey Murphy'), { firstName: 'Jey', lastName: 'Murphy' });
ok('splitName: normal two-part name');

assert.deepStrictEqual(splitName('Jey Anne Murphy'), { firstName: 'Jey', lastName: 'Anne Murphy' });
ok('splitName: middle name folds into lastName');

assert.deepStrictEqual(splitName('  Jey   Murphy  '), { firstName: 'Jey', lastName: 'Murphy' });
ok('splitName: trims and collapses whitespace');

assert.deepStrictEqual(splitName('Jey'), { firstName: 'Jey', lastName: 'User' });
ok('splitName: single word gets lastName "User"');

assert.deepStrictEqual(splitName(null, 'jey@wattwatch.ie'), { firstName: 'jey', lastName: 'User' });
ok('splitName: null name falls back to email local-part');

assert.deepStrictEqual(splitName('', ''), { firstName: 'WattWatch', lastName: 'User' });
ok('splitName: everything empty still returns a usable name, never crashes');

// buildCrmCustomerPayload — the NOT NULL fields the CRM requires
let c = buildCrmCustomerPayload(null, 'new@wattwatch.ie');
assert.strictEqual(c.phone, FALLBACK.phone);
assert.strictEqual(c.eircode, FALLBACK.eircode);
assert.strictEqual(c.provider, FALLBACK.provider);
assert.strictEqual(c.mprn, FALLBACK.mprn);
assert.strictEqual(c.status, 'CUSTOMER');
assert.strictEqual(c.passwordHash, undefined); // never set — CRM login not used
ok('buildCrmCustomerPayload: null profile never violates NOT NULL columns');

c = buildCrmCustomerPayload({ full_name: 'Sean O Brien', phone: '0871234567', eircode: 'D15 XY42', address: '1 Main St', supplier: 'Electric Ireland', mprn: '1001' }, 'sean@wattwatch.ie');
assert.strictEqual(c.firstName, 'Sean');
assert.strictEqual(c.phone, '0871234567');
assert.strictEqual(c.provider, 'Electric Ireland');
ok('buildCrmCustomerPayload: a complete profile passes through untouched');

// buildCrmTicketPayload
let t = buildCrmTicketPayload({ customerId: 5, subject: 'App not showing price', body: 'It just spins.', category: 'Technical' });
assert.strictEqual(t.priority, 'MEDIUM');
assert.strictEqual(t.status, 'OPEN');
assert.match(t.description, /^\[Category: Technical\]/);
assert.match(t.description, /It just spins\.$/);
ok('buildCrmTicketPayload: category folded into description, defaults applied');

t = buildCrmTicketPayload({ customerId: 5, subject: 'x', body: 'y', category: null, priority: 'high' });
assert.strictEqual(t.priority, 'HIGH');
assert.strictEqual(t.description, 'y'); // no category prefix when none given
ok('buildCrmTicketPayload: priority is case-normalised, no category = clean description');

t = buildCrmTicketPayload({ customerId: 5, subject: 'x', body: 'y', priority: 'urgent-ish' });
assert.strictEqual(t.priority, 'MEDIUM'); // invalid value never reaches the DB
ok('buildCrmTicketPayload: an invalid priority falls back instead of violating the CRM\'s isIn validator');

t = buildCrmTicketPayload({ customerId: 5, subject: 'x'.repeat(300), body: 'y' });
assert.strictEqual(t.subject.length, 180);
ok('buildCrmTicketPayload: an over-long subject is truncated to fit STRING(180)');

assert.strictEqual(mapCrmStatusToWattWatch('RESOLVED'), 'resolved');
assert.strictEqual(mapCrmStatusToWattWatch('IN_PROGRESS'), 'in_progress');
// Profile field mapping tests
import { crmCustomerToProfileFields, normalizeSupplier } from '../src/crmProfileSync.js';

const mapped = crmCustomerToProfileFields({
  firstName: 'Jane',
  lastName: 'Murphy',
  phone: '0871234567',
  mprn: '10001234567',
  address: '12 Main St',
  eircode: 'D01 AB12',
  provider: 'Electric Ireland',
});
assert.strictEqual(mapped.full_name, 'Jane Murphy');
assert.strictEqual(mapped.supplier, 'Electric Ireland');
assert.strictEqual(mapped.eircode, 'D01 AB12');
ok('crmCustomerToProfileFields: maps energy-switch customer to WattWatch profile');

assert.strictEqual(normalizeSupplier('PrepayPower'), 'PrePay Power');
assert.strictEqual(normalizeSupplier('electric ireland'), 'Electric Ireland');
ok('normalizeSupplier: aligns FormPage provider names');

import { extractPasswordHash } from '../src/crmApiClient.js';
assert.strictEqual(extractPasswordHash({ data: '$2b$10$abc' }), '$2b$10$abc');
assert.strictEqual(extractPasswordHash(null), null);
ok('extractPasswordHash: reads CRM lookup payload');

console.log(`\n${n} checks passed.`);
