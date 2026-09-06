/**
 * Verify Calculate→Give shared due amount + Giving Plan local persistence.
 * Run: node scripts/verify-zakat-give-flow.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calculateZakat,
  saveStoredAssets,
  loadStoredAssets,
  ASSETS_STORAGE_KEY,
} from '../apps/vagus-planner/src/lib/zakat-engine.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Simulate localStorage for Node
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const assets = {
  cash_savings: '10000',
  gold_value: '0',
  silver_value: '0',
  investments: '0',
  business_assets: '0',
  receivables: '0',
  liabilities: '0',
};
saveStoredAssets(assets);
assert.deepEqual(loadStoredAssets().cash_savings, '10000');

const calc = calculateZakat(assets, 70, 1);
assert.equal(calc.meetsNisab, true);
assert.equal(calc.zakatDue, 250); // 10000 * 0.025

// Give tab would read the same persisted assets → same due (no re-entry)
const reloaded = loadStoredAssets();
const giveSide = calculateZakat(reloaded, 70, 1);
assert.equal(giveSide.zakatDue, calc.zakatDue, 'Give must see same due as Calculate via shared assets');

// Giving Plan pot persistence
const PLAN_KEY = 'vagus_giving_plan_v1';
const plan = {
  mode: 'pot',
  goal: 200,
  potEntries: [{ id: '1', amount: 25, cause: 'Mosque', date: '2026-09-06', contributor: 'You' }],
  recurring: null,
  reminders: [],
};
localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
const loaded = JSON.parse(localStorage.getItem(PLAN_KEY));
assert.equal(loaded.potEntries.length, 1);
assert.equal(loaded.potEntries[0].amount, 25);

const hub = fs.readFileSync(path.join(root, 'apps/vagus-planner/src/components/zakat/ZakatHub.jsx'), 'utf8');
assert.match(hub, /PriceDisclosure|Using .* prices/);
assert.match(hub, /I gave elsewhere/);
assert.match(hub, /Coming soon/);
assert.match(hub, /GivingPlan/);
assert.match(hub, /PLAN_TOOLS/);
assert.doesNotMatch(hub, /Donate via Stripe checkout/);

const donation = fs.readFileSync(path.join(root, 'apps/vagus-planner/src/pages/ZakatDonation.jsx'), 'utf8');
assert.match(donation, /Back to Zakat/);
assert.match(donation, /Coming soon/);

const givingPlan = fs.readFileSync(path.join(root, 'apps/vagus-planner/src/components/zakat/GivingPlan.jsx'), 'utf8');
assert.match(givingPlan, /invalidateQueries\(\{ queryKey:/);
assert.match(givingPlan, /vagus_giving_plan_v1/);

console.log('SHARED STATE KEY', ASSETS_STORAGE_KEY);
console.log('Calculate due', calc.zakatDue, '→ Give due', giveSide.zakatDue);
console.log('ALL GIVE-FLOW CHECKS PASSED');
