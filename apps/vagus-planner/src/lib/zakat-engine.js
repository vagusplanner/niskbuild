/**
 * Canonical Zakat calculation engine (from ZakatDashboard).
 *
 * Rules (do not fork elsewhere):
 * - Nisab gold: 85g × live gold price/gram
 * - Nisab silver: 595g × live silver price/gram
 * - Threshold used: silver nisab (lower / more inclusive)
 * - Rate on net zakatable wealth: 2.5%
 * - Agriculture (advanced): 10% rain-fed / 5% irrigated — separate fiqh rate
 */

export const ZAKAT_RATE = 0.025;
export const NISAB_GOLD_GRAMS = 85;
export const NISAB_SILVER_GRAMS = 595;
export const TROY_OUNCE_GRAMS = 31.1035;

/** Fallback USD/gram if live fetch fails (same as ZakatDashboard). */
export const FALLBACK_PRICES_USD_PER_GRAM = { gold: 95, silver: 1.05 };

export const USD_RATES = {
  GBP: 0.79,
  USD: 1,
  EUR: 0.92,
  AED: 3.67,
  SAR: 3.75,
  MYR: 4.72,
  PKR: 278,
  CAD: 1.36,
  AUD: 1.52,
  TRY: 34,
};

export const ZAKAT_CURRENCIES = Object.keys(USD_RATES);

export const DEFAULT_ZAKAT_ASSETS = {
  cash_savings: '',
  gold_value: '',
  silver_value: '',
  investments: '',
  business_assets: '',
  receivables: '',
  liabilities: '',
};

export const ASSETS_STORAGE_KEY = 'vagus_zakat_assets_canonical_v1';

export function num(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(amount, currency = 'GBP') {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${currency} ${(amount || 0).toFixed(2)}`;
  }
}

export function loadStoredAssets() {
  try {
    const raw = localStorage.getItem(ASSETS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ZAKAT_ASSETS };
    return { ...DEFAULT_ZAKAT_ASSETS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_ZAKAT_ASSETS };
  }
}

export function saveStoredAssets(assets) {
  try {
    localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(assets));
  } catch {
    // ignore
  }
}

/**
 * Convert troy-oz USD prices into per-gram prices in the target currency.
 */
export function troyOzUsdToPerGram(currency, goldPerTroyOzUsd, silverPerTroyOzUsd) {
  const rate = USD_RATES[currency] || 1;
  return {
    goldPricePerGram: parseFloat(((goldPerTroyOzUsd / TROY_OUNCE_GRAMS) * rate).toFixed(4)),
    silverPricePerGram: parseFloat(((silverPerTroyOzUsd / TROY_OUNCE_GRAMS) * rate).toFixed(4)),
  };
}

export function fallbackPricesForCurrency(currency) {
  const rate = USD_RATES[currency] || 1;
  return {
    goldPricePerGram: parseFloat((FALLBACK_PRICES_USD_PER_GRAM.gold * rate).toFixed(4)),
    silverPricePerGram: parseFloat((FALLBACK_PRICES_USD_PER_GRAM.silver * rate).toFixed(4)),
    source: 'fallback',
  };
}

/**
 * Core wealth → nisab → zakat math.
 * @param {object} assets - DEFAULT_ZAKAT_ASSETS shape (values or numbers)
 * @param {number} goldPricePerGram
 * @param {number} silverPricePerGram
 */
export function calculateZakat(assets, goldPricePerGram = 0, silverPricePerGram = 0) {
  const cash = num(assets.cash_savings);
  const gold = num(assets.gold_value);
  const silver = num(assets.silver_value);
  const investments = num(assets.investments);
  const business = num(assets.business_assets);
  const receivables = num(assets.receivables);
  const liabilities = num(assets.liabilities);

  const totalAssets = cash + gold + silver + investments + business + receivables;
  const zakatableWealth = Math.max(0, totalAssets - liabilities);

  const nisabGold = NISAB_GOLD_GRAMS * (goldPricePerGram || 0);
  const nisabSilver = NISAB_SILVER_GRAMS * (silverPricePerGram || 0);
  // Canonical: silver threshold (lower / more inclusive), matching ZakatDashboard.
  const nisabUsed = nisabSilver;
  const meetsNisab = nisabUsed > 0 && zakatableWealth >= nisabUsed;
  const zakatDue = meetsNisab ? zakatableWealth * ZAKAT_RATE : 0;

  return {
    breakdown: {
      cash_savings: cash,
      gold_value: gold,
      silver_value: silver,
      investments,
      business_assets: business,
      receivables,
      liabilities,
    },
    totalAssets,
    zakatableWealth,
    nisabGold,
    nisabSilver,
    nisabUsed,
    meetsNisab,
    zakatDue,
    rate: ZAKAT_RATE,
    goldPricePerGram: goldPricePerGram || 0,
    silverPricePerGram: silverPricePerGram || 0,
  };
}

/** Gold-by-weight helper for Advanced mode (uses canonical 85g nisab). */
export function calculateGoldWeightZakat(grams, pricePerGram) {
  const g = num(grams);
  const p = num(pricePerGram);
  const totalValue = g * p;
  const meetsNisab = g >= NISAB_GOLD_GRAMS && p > 0;
  return {
    totalValue,
    meetsNisab,
    zakatDue: meetsNisab ? totalValue * ZAKAT_RATE : 0,
    nisabGrams: NISAB_GOLD_GRAMS,
  };
}

/** Silver-by-weight helper for Advanced mode (uses canonical 595g nisab). */
export function calculateSilverWeightZakat(grams, pricePerGram) {
  const g = num(grams);
  const p = num(pricePerGram);
  const totalValue = g * p;
  const meetsNisab = g >= NISAB_SILVER_GRAMS && p > 0;
  return {
    totalValue,
    meetsNisab,
    zakatDue: meetsNisab ? totalValue * ZAKAT_RATE : 0,
    nisabGrams: NISAB_SILVER_GRAMS,
  };
}

/** Business inventory helper (2.5% of net). */
export function calculateBusinessZakat({ inventory, receivables, cash, liabilities }) {
  const zakatable = Math.max(0, num(inventory) + num(receivables) + num(cash) - num(liabilities));
  return {
    zakatable,
    zakatDue: zakatable > 0 ? zakatable * ZAKAT_RATE : 0,
  };
}

/** Agriculture: 10% rain-fed, 5% irrigated (distinct fiqh rate — keep). */
export function calculateAgricultureZakat(produceValue, irrigationType = 'rain') {
  const value = num(produceValue);
  const rate = irrigationType === 'irrigated' ? 0.05 : 0.1;
  return { value, rate, zakatDue: value * rate };
}

/**
 * Fetch live metal prices via base44 InvokeLLM (same approach as ZakatDashboard).
 * @param {object} invokeLLM - base44.integrations.Core.InvokeLLM
 * @param {string} currency
 */
export async function fetchLiveMetalPrices(invokeLLM, currency = 'GBP') {
  try {
    const result = await invokeLLM({
      prompt: `Get the current live gold and silver spot prices in USD per troy ounce as of today. Return only the numeric values. A troy ounce is ${TROY_OUNCE_GRAMS} grams.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          gold_per_troy_oz_usd: { type: 'number' },
          silver_per_troy_oz_usd: { type: 'number' },
          source: { type: 'string' },
          as_of: { type: 'string' },
        },
      },
    });
    const converted = troyOzUsdToPerGram(
      currency,
      result.gold_per_troy_oz_usd,
      result.silver_per_troy_oz_usd,
    );
    return {
      ...converted,
      source: result.source || 'live',
      asOf: result.as_of || null,
    };
  } catch {
    return fallbackPricesForCurrency(currency);
  }
}
