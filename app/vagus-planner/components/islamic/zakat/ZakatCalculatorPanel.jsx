import React, { useState, useEffect } from 'react';
import { Calculator, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Nisab thresholds (approximate — users can override)
const GOLD_PRICE_PER_GRAM = 62;   // USD — approx current
const SILVER_PRICE_PER_GRAM = 0.80;
const NISAB_GOLD_GRAMS = 85;       // 85g gold nisab
const NISAB_SILVER_GRAMS = 595;    // 595g silver nisab
const ZAKAT_RATE = 0.025;          // 2.5%

export default function ZakatCalculatorPanel({ onZakatCalculated }) {
  const [expanded, setExpanded] = useState(true);
  const [form, setForm] = useState({
    gold_grams: '',
    silver_grams: '',
    cash_savings: '',
    investments: '',
    business_assets: '',
    receivables: '',
    liabilities: '',
    gold_price: String(GOLD_PRICE_PER_GRAM),
    silver_price: String(SILVER_PRICE_PER_GRAM),
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const num = (v) => parseFloat(v) || 0;

  const goldValue    = num(form.gold_grams) * num(form.gold_price);
  const silverValue  = num(form.silver_grams) * num(form.silver_price);
  const cashSavings  = num(form.cash_savings);
  const investments  = num(form.investments);
  const bizAssets    = num(form.business_assets);
  const receivables  = num(form.receivables);
  const liabilities  = num(form.liabilities);

  const totalAssets  = goldValue + silverValue + cashSavings + investments + bizAssets + receivables;
  const zakatableWealth = Math.max(0, totalAssets - liabilities);

  const nisabGold   = NISAB_GOLD_GRAMS * num(form.gold_price);
  const nisabSilver = NISAB_SILVER_GRAMS * num(form.silver_price);
  const nisabUsed   = Math.min(nisabGold, nisabSilver); // more conservative: silver nisab usually lower

  const meetsNisab  = zakatableWealth >= nisabUsed;
  const zakatDue    = meetsNisab ? zakatableWealth * ZAKAT_RATE : 0;

  React.useEffect(() => {
    onZakatCalculated({ zakatDue, zakatableWealth, meetsNisab, nisabUsed });
  }, [zakatDue]);

  const Field = ({ label, field, placeholder = '0', prefix = '$', hint }) => (
    <div>
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1 justify-between">
        <span>{label}</span>
        {hint && <span className="text-[10px] text-slate-400 font-normal">{hint}</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{prefix}</span>
        <Input
          type="number"
          min="0"
          placeholder={placeholder}
          value={form[field]}
          onChange={e => set(field, e.target.value)}
          className="pl-7 text-sm border-amber-200 dark:border-amber-800/40 focus:ring-amber-400"
        />
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 overflow-hidden bg-white dark:bg-slate-900">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-slate-900"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow">
          <Calculator className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-black text-slate-900 dark:text-slate-100 text-sm">Zakat Calculator</p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400">Based on gold, silver, and savings</p>
        </div>
        <div className="text-right mr-2">
          {zakatDue > 0 && (
            <p className="text-lg font-black text-amber-600">${zakatDue.toFixed(2)}</p>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="p-5 space-y-5 border-t border-amber-100 dark:border-amber-800/30">
          {/* Price settings */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/50 dark:bg-amber-950/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
            <div>
              <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1 block">Gold price ($/g)</label>
              <Input type="number" value={form.gold_price} onChange={e => set('gold_price', e.target.value)} className="h-8 text-xs border-amber-200 dark:border-amber-800/40" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1 block">Silver price ($/g)</label>
              <Input type="number" value={form.silver_price} onChange={e => set('silver_price', e.target.value)} className="h-8 text-xs border-amber-200 dark:border-amber-800/40" />
            </div>
          </div>

          {/* Asset inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Gold owned" field="gold_grams" placeholder="0" prefix="g" hint="in grams" />
            <Field label="Silver owned" field="silver_grams" placeholder="0" prefix="g" hint="in grams" />
            <Field label="Cash & Savings" field="cash_savings" placeholder="0.00" />
            <Field label="Investments" field="investments" placeholder="0.00" />
            <Field label="Business assets" field="business_assets" placeholder="0.00" />
            <Field label="Receivables" field="receivables" placeholder="0.00" hint="owed to you" />
          </div>

          <div>
            <Field label="Liabilities / Debts" field="liabilities" placeholder="0.00" hint="subtract from wealth" />
          </div>

          {/* Summary */}
          <div className={cn(
            'rounded-2xl p-4 space-y-2 border',
            meetsNisab
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
              : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700'
          )}>
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Total zakatable assets</span>
              <span className="font-semibold">${totalAssets.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Less liabilities</span>
              <span className="font-semibold text-red-500">-${liabilities.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200 border-t border-slate-200 dark:border-slate-700 pt-2">
              <span>Net zakatable wealth</span>
              <span>${zakatableWealth.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Nisab threshold (silver)</span>
              <span>${nisabUsed.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className={cn(
              'flex justify-between items-center pt-2 border-t',
              meetsNisab ? 'border-emerald-200 dark:border-emerald-800' : 'border-slate-200 dark:border-slate-700'
            )}>
              {meetsNisab ? (
                <>
                  <div>
                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">Zakat Due (2.5%)</p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Nisab met — Zakat is obligatory</p>
                  </div>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">${zakatDue.toFixed(2)}</p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-slate-500">
                  <Info className="w-4 h-4" />
                  <p className="text-xs">Wealth is below Nisab — Zakat not yet obligatory</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}