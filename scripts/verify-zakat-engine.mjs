/**
 * Verify canonical zakat-engine math and that active UI surfaces import it.
 * Run: node scripts/verify-zakat-engine.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calculateZakat,
  calculateGoldWeightZakat,
  calculateAgricultureZakat,
  NISAB_GOLD_GRAMS,
  NISAB_SILVER_GRAMS,
  ZAKAT_RATE,
} from '../apps/vagus-planner/src/lib/zakat-engine.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

assert.equal(NISAB_GOLD_GRAMS, 85);
assert.equal(NISAB_SILVER_GRAMS, 595);
assert.equal(ZAKAT_RATE, 0.025);

// Silver nisab = 595 * 1 = 595; wealth 1000 → due 25
const r = calculateZakat(
  {
    cash_savings: 1000,
    gold_value: 0,
    silver_value: 0,
    investments: 0,
    business_assets: 0,
    receivables: 0,
    liabilities: 0,
  },
  70, // gold/g
  1,  // silver/g → nisab 595
);
assert.equal(r.nisabUsed, 595);
assert.equal(r.meetsNisab, true);
assert.equal(r.zakatDue, 25);

const below = calculateZakat(
  { cash_savings: 100, gold_value: 0, silver_value: 0, investments: 0, business_assets: 0, receivables: 0, liabilities: 0 },
  70,
  1,
);
assert.equal(below.meetsNisab, false);
assert.equal(below.zakatDue, 0);

const goldW = calculateGoldWeightZakat(100, 60);
assert.equal(goldW.meetsNisab, true);
assert.equal(goldW.zakatDue, 100 * 60 * 0.025);

const agri = calculateAgricultureZakat(1000, 'rain');
assert.equal(agri.rate, 0.1);
assert.equal(agri.zakatDue, 100);

const mustImportEngine = [
  'apps/vagus-planner/src/components/zakat/ZakatHub.jsx',
  'apps/vagus-planner/src/components/islamic/zakat/ZakatCalculatorPanel.jsx',
  'apps/vagus-planner/src/hooks/useZakatEngine.js',
  'apps/vagus-planner/src/components/islamic/SpecificZakatCalculators.jsx',
  'apps/vagus-planner/src/pages/Finance.jsx',
  'apps/vagus-planner/src/pages/Islam.jsx',
];

for (const rel of mustImportEngine) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  if (rel.endsWith('Islam.jsx')) {
    assert.match(text, /ZakatHub/, `${rel} should mount ZakatHub`);
  } else if (rel.endsWith('Finance.jsx')) {
    assert.match(text, /ZakatFinanceSummaryCard/, `${rel} should use thin summary card`);
    assert.doesNotMatch(text, /ZakatSadaqaDashboard/, `${rel} must not embed old dashboard`);
  } else {
    assert.match(text, /zakat-engine|useZakatEngine|ZakatHub/, `${rel} must use shared engine`);
  }
  assert.doesNotMatch(text, /NISAB_USD\s*=\s*5500/, `${rel} must not hardcode $5500 nisab`);
  assert.doesNotMatch(text, /87\.48/, `${rel} must not use old 87.48g nisab`);
}

const redirects = [
  'apps/vagus-planner/src/pages/ZakatDashboard.jsx',
  'apps/vagus-planner/src/pages/IslamicFinance.jsx',
];
for (const rel of redirects) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  assert.match(text, /section=zakat/, `${rel} should redirect to Islam zakat hub`);
}

console.log('ALL ZAKAT ENGINE CHECKS PASSED');
