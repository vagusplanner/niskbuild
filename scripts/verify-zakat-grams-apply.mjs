/**
 * End-to-end verification: grams → market value → main calculate wealth.
 * Also guards against NaN prices from bad LLM responses.
 * Run: node scripts/verify-zakat-grams-apply.mjs
 */
import assert from 'node:assert/strict';
import {
  calculateZakat,
  calculateGoldWeightZakat,
  troyOzUsdToPerGram,
  fallbackPricesForCurrency,
  fetchLiveMetalPrices,
  pricesAreValid,
  num,
} from '../apps/vagus-planner/src/lib/zakat-engine.js';

// 1) Bad LLM numbers must NOT yield NaN prices
assert.equal(troyOzUsdToPerGram('GBP', undefined, 30), null);
assert.equal(troyOzUsdToPerGram('GBP', 0, 30), null);
assert.equal(troyOzUsdToPerGram('GBP', NaN, 30), null);

const good = troyOzUsdToPerGram('GBP', 2650, 30);
assert.ok(good);
assert.ok(pricesAreValid(good.goldPricePerGram, good.silverPricePerGram));

// 2) fetchLiveMetalPrices falls back when invoke returns junk
const junk = await fetchLiveMetalPrices(async () => ({
  gold_per_troy_oz_usd: null,
  silver_per_troy_oz_usd: null,
}), 'GBP');
assert.equal(junk.source, 'fallback');
assert.ok(pricesAreValid(junk.goldPricePerGram, junk.silverPricePerGram));

const fb = fallbackPricesForCurrency('GBP');
// Fallback: gold $95/g USD × 0.79 = 75.05 GBP/g
assert.equal(fb.goldPricePerGram, 75.05);

// ── Worked example (GBP fallback prices) ─────────────────────────────────────
const GRAMS = 100;
const expectedGoldValue = GRAMS * fb.goldPricePerGram; // 7505
assert.equal(expectedGoldValue, 7505);

const empty = {
  cash_savings: 0,
  gold_value: 0,
  silver_value: 0,
  investments: 0,
  business_assets: 0,
  receivables: 0,
  liabilities: 0,
};

const before = calculateZakat(empty, fb.goldPricePerGram, fb.silverPricePerGram);
assert.equal(before.zakatableWealth, 0);
assert.equal(before.zakatDue, 0);

// Simulate Grams → market value ✓  (sets gold_value)
const afterGrams = calculateZakat(
  { ...empty, gold_value: expectedGoldValue.toFixed(2) },
  fb.goldPricePerGram,
  fb.silverPricePerGram,
);
assert.equal(afterGrams.breakdown.gold_value, 7505);
assert.equal(afterGrams.zakatableWealth, 7505);
// Silver nisab = 595 * 0.8295 ≈ 493.55; 7505 >= nisab → zakat due
assert.equal(afterGrams.meetsNisab, true);
assert.equal(afterGrams.zakatDue, 7505 * 0.025);

// Simulate Advanced Apply (same math path)
const adv = calculateGoldWeightZakat(GRAMS, fb.goldPricePerGram);
assert.equal(adv.totalValue, expectedGoldValue);
const afterApply = calculateZakat(
  { ...empty, gold_value: adv.totalValue.toFixed(2) },
  fb.goldPricePerGram,
  fb.silverPricePerGram,
);
assert.equal(afterApply.zakatableWealth, afterGrams.zakatableWealth);
assert.equal(afterApply.zakatDue, afterGrams.zakatDue);

// Wealth delta must equal applied gold value when starting from empty
assert.equal(afterGrams.zakatableWealth - before.zakatableWealth, expectedGoldValue);

console.log('Worked example (GBP fallback prices):');
console.log(`  Price: £${fb.goldPricePerGram}/g gold`);
console.log(`  Input: ${GRAMS}g gold`);
console.log(`  → Gold (market value) = ${GRAMS} × ${fb.goldPricePerGram} = £${expectedGoldValue.toFixed(2)}`);
console.log(`  Wealth: £${before.zakatableWealth} → £${afterGrams.zakatableWealth}`);
console.log(`  Zakat due: £${before.zakatDue} → £${afterGrams.zakatDue.toFixed(2)} (2.5%)`);
console.log('All grams→apply verification checks passed.');
