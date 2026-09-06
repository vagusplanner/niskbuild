/**
 * Compact Zakat calculator panel for donation checkout.
 * Uses the canonical lib/zakat-engine (live 85g/595g nisab · 2.5%).
 */
import React, { useEffect } from 'react';
import { Calculator, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useZakatEngine } from '@/hooks/useZakatEngine';
import { NISAB_GOLD_GRAMS, NISAB_SILVER_GRAMS, ZAKAT_CURRENCIES } from '@/lib/zakat-engine';

const FIELDS = [
  { key: 'cash_savings', label: 'Cash & Savings' },
  { key: 'gold_value', label: 'Gold (market value)' },
  { key: 'silver_value', label: 'Silver (market value)' },
  { key: 'investments', label: 'Investments' },
  { key: 'business_assets', label: 'Business assets' },
  { key: 'receivables', label: 'Receivables' },
  { key: 'liabilities', label: 'Liabilities (deducted)' },
];

export default function ZakatCalculatorPanel({ onZakatCalculated }) {
  const [expanded, setExpanded] = React.useState(true);
  const {
    currency, setCurrency, assets, updateAsset, result, fmt,
    goldPricePerGram, silverPricePerGram, priceLoading, refreshPrices,
  } = useZakatEngine();

  useEffect(() => {
    onZakatCalculated?.({
      zakatDue: result.zakatDue,
      zakatableWealth: result.zakatableWealth,
      meetsNisab: result.meetsNisab,
      nisabUsed: result.nisabUsed,
      currency,
    });
  }, [result.zakatDue, result.zakatableWealth, result.meetsNisab, result.nisabUsed, currency]);

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 overflow-hidden bg-white dark:bg-slate-900">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-5 py-4 text-left bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-slate-900"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow">
          <Calculator className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 dark:text-slate-100">Zakat Calculator</p>
          <p className="text-xs text-slate-500">
            Live nisab · {NISAB_GOLD_GRAMS}g gold / {NISAB_SILVER_GRAMS}g silver · 2.5%
          </p>
        </div>
        <div className="text-right mr-2">
          <p className="text-lg font-black text-amber-600">{fmt(result.zakatDue)}</p>
          <p className="text-[10px] text-slate-400">due</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="p-5 space-y-3 border-t border-amber-100 dark:border-amber-900/40">
          <div className="flex items-center justify-between gap-2">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="text-xs font-bold border rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900"
            >
              {ZAKAT_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={refreshPrices} disabled={priceLoading}>
              <RefreshCw className={cn('w-3.5 h-3.5', priceLoading && 'animate-spin')} />
              Refresh prices
            </Button>
          </div>
          <p className="text-[11px] text-slate-500">
            Gold/g {fmt(goldPricePerGram)} · Silver/g {fmt(silverPricePerGram)} · Nisab {fmt(result.nisabUsed)}
          </p>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">{f.label}</label>
              <Input
                type="number"
                min="0"
                value={assets[f.key] || ''}
                onChange={(e) => updateAsset(f.key, e.target.value)}
                className="text-sm border-amber-200 dark:border-amber-800/40"
              />
            </div>
          ))}
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 flex justify-between items-center">
            <span className="text-sm font-bold text-amber-800 dark:text-amber-200">Zakat due</span>
            <span className="text-xl font-black text-amber-600">{fmt(result.zakatDue)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
