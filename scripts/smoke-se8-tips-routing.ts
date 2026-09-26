/**
 * Evidence: SE8 Tips host mapping + corpus sanity.
 * Usage: npx tsx scripts/smoke-se8-tips-routing.ts
 */
import assert from 'node:assert/strict';
import {
  isSuperEduc8PassthroughPath,
  mapSuperEduc8PathToInternal,
  shiftAiAppPath,
} from '../lib/supereduc8-host';
import { SE8_TIPS, searchSe8Tips } from '../lib/shift-ai/tips-data';

// On SE8 host, /tips must NOT passthrough to NiskBuild app/tips —
// it must rewrite to the SuperEduc8 tips page.
assert.equal(isSuperEduc8PassthroughPath('/tips'), false);
assert.equal(mapSuperEduc8PathToInternal('/tips'), '/builder/shift-ai/tips');
assert.equal(shiftAiAppPath('/tips', 'www.supereduc8.com'), '/tips');
assert.equal(shiftAiAppPath('/tips', 'www.niskbuild.com'), '/builder/shift-ai/tips');
assert.equal(shiftAiAppPath('/billing', 'www.supereduc8.com'), '/billing');

// Corpus: only shipped flows; no deferred features.
const banned = /avatar upload|oauth connected|notification pref/i;
for (const tip of SE8_TIPS) {
  const blob = `${tip.title} ${tip.when} ${tip.why} ${tip.how}`;
  assert.ok(!banned.test(blob), `tip ${tip.id} invents deferred feature`);
  assert.ok(tip.subpath.startsWith('/'), `tip ${tip.id} subpath must be absolute app path`);
  assert.ok(!tip.subpath.startsWith('/builder'), `tip ${tip.id} should use clean subpath`);
}

assert.ok(searchSe8Tips('trial').some((t) => t.id === 'trial-no-card'));
assert.ok(searchSe8Tips('cancel').some((t) => t.id === 'manage-cancel-portal'));
assert.ok(searchSe8Tips('parent dashboard').some((t) => t.id === 'parent-dashboard-scope'));
assert.ok(SE8_TIPS.length >= 15, `expected a full tip set, got ${SE8_TIPS.length}`);

console.log('PASS se8 tips routing + corpus');
console.log('  /tips →', mapSuperEduc8PathToInternal('/tips'));
console.log('  tip count', SE8_TIPS.length);
console.log('  SE8 href example', shiftAiAppPath('/billing', 'supereduc8.com'));
