import { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  calculateZakat,
  fetchLiveMetalPrices,
  formatMoney,
  loadStoredAssets,
  saveStoredAssets,
  DEFAULT_ZAKAT_ASSETS,
} from '@/lib/zakat-engine';

/**
 * Shared React state for the canonical Zakat engine:
 * live metal prices + persisted assets + calculated result.
 */
export function useZakatEngine(initialCurrency = 'GBP') {
  const [currency, setCurrency] = useState(() => {
    try {
      return localStorage.getItem('vagus_currency') || initialCurrency;
    } catch {
      return initialCurrency;
    }
  });
  const [assets, setAssetsState] = useState(loadStoredAssets);
  const [goldPricePerGram, setGoldPricePerGram] = useState(0);
  const [silverPricePerGram, setSilverPricePerGram] = useState(0);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceSource, setPriceSource] = useState('fallback');
  const [priceAsOf, setPriceAsOf] = useState(null);

  const setAssets = useCallback((next) => {
    setAssetsState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      saveStoredAssets(resolved);
      return resolved;
    });
  }, []);

  const updateAsset = useCallback((key, value) => {
    setAssets((prev) => ({ ...prev, [key]: value }));
  }, [setAssets]);

  const resetAssets = useCallback(() => {
    setAssets({ ...DEFAULT_ZAKAT_ASSETS });
  }, [setAssets]);

  const refreshPrices = useCallback(async () => {
    setPriceLoading(true);
    const result = await fetchLiveMetalPrices(base44.integrations.Core.InvokeLLM, currency);
    setGoldPricePerGram(result.goldPricePerGram);
    setSilverPricePerGram(result.silverPricePerGram);
    setPriceSource(result.source || 'fallback');
    setPriceAsOf(result.asOf || null);
    setPriceLoading(false);
    return result;
  }, [currency]);

  useEffect(() => {
    refreshPrices();
  }, [refreshPrices]);

  useEffect(() => {
    try {
      localStorage.setItem('vagus_currency', currency);
    } catch {
      // ignore
    }
  }, [currency]);

  const result = useMemo(
    () => calculateZakat(assets, goldPricePerGram, silverPricePerGram),
    [assets, goldPricePerGram, silverPricePerGram],
  );

  const fmt = useCallback((n) => formatMoney(n, currency), [currency]);

  return {
    currency,
    setCurrency,
    assets,
    setAssets,
    updateAsset,
    resetAssets,
    goldPricePerGram,
    silverPricePerGram,
    priceLoading,
    priceSource,
    priceAsOf,
    refreshPrices,
    result,
    fmt,
  };
}
