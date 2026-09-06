/**
 * Canonical Islam Zakat hub — Calculate / Give / Plan.
 * All wealth math goes through lib/zakat-engine (85g/595g live nisab, 2.5%).
 */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfYear, addMonths } from 'date-fns';
import { toast } from 'sonner';
import {
  Calculator, Heart, BookOpen, RefreshCw, ChevronDown, ChevronUp,
  Gem, Coins, Building2, Sprout, ExternalLink, Scale, AlertTriangle, Plus, Loader2, Calendar,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useZakatEngine } from '@/hooks/useZakatEngine';
import {
  ZAKAT_CURRENCIES,
  NISAB_GOLD_GRAMS,
  NISAB_SILVER_GRAMS,
  calculateGoldWeightZakat,
  calculateSilverWeightZakat,
  calculateBusinessZakat,
  calculateAgricultureZakat,
  formatMoney,
} from '@/lib/zakat-engine';

import FamilySadaqahJar from '@/components/islamic/unique/FamilySadaqahJar';
import IslamicFinancialPlanner from '@/components/islamic/IslamicFinancialPlanner';
import IslamicInheritanceCalculator from '@/components/islamic/IslamicInheritanceCalculator';
import FidyahKaffarahCalculator from '@/components/islamic/FidyahKaffarahCalculator';
import IslamicFinanceCalculator from '@/components/islamic/IslamicFinanceCalculator';
import IslamicMarriagePlanner from '@/components/islamic/IslamicMarriagePlanner';

const ASSET_FIELDS = [
  { key: 'cash_savings', label: 'Cash & Savings', hint: 'Bank accounts, cash on hand' },
  { key: 'gold_value', label: 'Gold (market value)', hint: 'Jewellery & bullion above personal use' },
  { key: 'silver_value', label: 'Silver (market value)', hint: 'All silver holdings' },
  { key: 'investments', label: 'Investments', hint: 'Stocks, pensions, accessible crypto' },
  { key: 'business_assets', label: 'Business / inventory', hint: 'Trading goods at market value' },
  { key: 'receivables', label: 'Money owed to you', hint: 'Recoverable loans' },
  { key: 'liabilities', label: 'Debts & liabilities', hint: 'Immediate debts due within the year', deduct: true },
];

function CurrencySelect({ currency, setCurrency }) {
  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      className="text-xs font-bold border border-amber-200 dark:border-amber-800 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900"
    >
      {ZAKAT_CURRENCIES.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}

function CalculateTab({ engine, defaultAdvancedOpen = false }) {
  const {
    currency, setCurrency, assets, updateAsset, result, fmt,
    goldPricePerGram, silverPricePerGram, priceLoading, priceSource, refreshPrices,
  } = engine;
  const [showAdvanced, setShowAdvanced] = useState(defaultAdvancedOpen);
  const [advTab, setAdvTab] = useState('gold');
  const [goldGrams, setGoldGrams] = useState('');
  const [silverGrams, setSilverGrams] = useState('');
  const [biz, setBiz] = useState({ inventory: '', receivables: '', cash: '', liabilities: '' });
  const [agri, setAgri] = useState({ value: '', irrigation: 'rain' });

  const applyMetalGrams = (metal) => {
    if (metal === 'gold') {
      const val = (parseFloat(goldGrams) || 0) * goldPricePerGram;
      if (val > 0) {
        updateAsset('gold_value', val.toFixed(2));
        setGoldGrams('');
        toast.success(`Gold value set to ${fmt(val)}`);
      }
    } else {
      const val = (parseFloat(silverGrams) || 0) * silverPricePerGram;
      if (val > 0) {
        updateAsset('silver_value', val.toFixed(2));
        setSilverGrams('');
        toast.success(`Silver value set to ${fmt(val)}`);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
          Canonical engine: live metal prices · nisab {NISAB_GOLD_GRAMS}g gold / {NISAB_SILVER_GRAMS}g silver
          (silver threshold used) · 2.5% of net zakatable wealth.
        </p>
        <div className="flex items-center gap-2">
          <CurrencySelect currency={currency} setCurrency={setCurrency} />
          <Button size="sm" variant="outline" onClick={() => refreshPrices().then((r) => {
            toast[r.source === 'fallback' ? 'warning' : 'success'](
              r.source === 'fallback' ? 'Using approximate metal prices' : 'Live metal prices refreshed',
            );
          })} disabled={priceLoading} className="h-8 text-xs gap-1">
            <RefreshCw className={`w-3.5 h-3.5 ${priceLoading ? 'animate-spin' : ''}`} />
            Prices
          </Button>
        </div>
      </div>

      {/* Nisab summary */}
      <div className={`rounded-2xl border p-4 ${result.meetsNisab ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40'}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Nisab status</p>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100">
              {result.meetsNisab ? 'Zakat is due' : 'Below nisab'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Prices: {priceSource === 'live' ? 'live' : 'approx'} · Gold/g {fmt(goldPricePerGram)} · Silver/g {fmt(silverPricePerGram)}
            </p>
          </div>
          <Scale className="w-5 h-5 text-amber-600" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/80 dark:bg-slate-800/60 p-2 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] text-slate-400 uppercase">Wealth</p>
            <p className="text-sm font-black">{fmt(result.zakatableWealth)}</p>
          </div>
          <div className="rounded-xl bg-amber-100/80 dark:bg-amber-900/30 p-2 border border-amber-200 dark:border-amber-800">
            <p className="text-[10px] text-amber-700 uppercase">Zakat due</p>
            <p className="text-sm font-black text-amber-700 dark:text-amber-300">{fmt(result.zakatDue)}</p>
          </div>
          <div className="rounded-xl bg-white/80 dark:bg-slate-800/60 p-2 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] text-slate-400 uppercase">Nisab (Ag)</p>
            <p className="text-sm font-black">{fmt(result.nisabUsed)}</p>
          </div>
        </div>
      </div>

      {/* Asset inputs */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-amber-600" /> Your assets
        </h3>
        {ASSET_FIELDS.map((f) => (
          <div key={f.key}>
            <Label className="text-xs text-slate-600 dark:text-slate-300">{f.label}</Label>
            <p className="text-[10px] text-slate-400 mb-1">{f.hint}</p>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={assets[f.key] || ''}
              onChange={(e) => updateAsset(f.key, e.target.value)}
              placeholder="0.00"
              className={f.deduct ? 'border-red-200 focus:ring-red-400' : ''}
            />
          </div>
        ))}

        {/* Grams → value helper */}
        <div className="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Grams → market value</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Gold grams</Label>
              <div className="flex gap-1">
                <Input type="number" value={goldGrams} onChange={(e) => setGoldGrams(e.target.value)} className="h-8 text-xs" />
                <Button size="sm" className="h-8" onClick={() => applyMetalGrams('gold')} disabled={priceLoading}>✓</Button>
              </div>
            </div>
            <div>
              <Label className="text-[10px]">Silver grams</Label>
              <div className="flex gap-1">
                <Input type="number" value={silverGrams} onChange={(e) => setSilverGrams(e.target.value)} className="h-8 text-xs" />
                <Button size="sm" className="h-8" onClick={() => applyMetalGrams('silver')} disabled={priceLoading}>✓</Button>
              </div>
            </div>
          </div>
        </div>

        {!result.meetsNisab && result.zakatableWealth > 0 && (
          <div className="flex gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-200">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            Wealth is below silver nisab ({fmt(result.nisabUsed)}). Zakat is not obligatory; Sadaqah is always encouraged.
          </div>
        )}
      </div>

      {/* Advanced */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        Advanced asset calculators
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {showAdvanced && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'gold', icon: Gem, label: 'Gold weight' },
              { id: 'silver', icon: Coins, label: 'Silver weight' },
              { id: 'business', icon: Building2, label: 'Business' },
              { id: 'agriculture', icon: Sprout, label: 'Agriculture' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAdvTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                  advTab === t.id ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>

          {advTab === 'gold' && (
            <AdvancedGold
              price={goldPricePerGram}
              currency={currency}
              onApplyValue={(v) => updateAsset('gold_value', String(v))}
            />
          )}
          {advTab === 'silver' && (
            <AdvancedSilver
              price={silverPricePerGram}
              currency={currency}
              onApplyValue={(v) => updateAsset('silver_value', String(v))}
            />
          )}
          {advTab === 'business' && (
            <AdvancedBusiness
              biz={biz}
              setBiz={setBiz}
              currency={currency}
              onApply={(zakatable) => {
                updateAsset('business_assets', String(zakatable.toFixed(2)));
                toast.success('Business assets applied to main calculator');
              }}
            />
          )}
          {advTab === 'agriculture' && (
            <AdvancedAgriculture agri={agri} setAgri={setAgri} currency={currency} />
          )}
        </div>
      )}
    </div>
  );
}

function AdvancedGold({ price, currency, onApplyValue }) {
  const [grams, setGrams] = useState('');
  const r = calculateGoldWeightZakat(grams, price);
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Nisab: {NISAB_GOLD_GRAMS}g · uses live gold price/g ({formatMoney(price, currency)})</p>
      <Input type="number" value={grams} onChange={(e) => setGrams(e.target.value)} placeholder="Weight in grams" />
      <p className="text-sm font-bold">Value {formatMoney(r.totalValue, currency)} · Zakat {formatMoney(r.zakatDue, currency)}</p>
      <Button size="sm" onClick={() => onApplyValue(r.totalValue.toFixed(2))} disabled={!r.totalValue}>Apply value to main calc</Button>
    </div>
  );
}

function AdvancedSilver({ price, currency, onApplyValue }) {
  const [grams, setGrams] = useState('');
  const r = calculateSilverWeightZakat(grams, price);
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Nisab: {NISAB_SILVER_GRAMS}g · uses live silver price/g ({formatMoney(price, currency)})</p>
      <Input type="number" value={grams} onChange={(e) => setGrams(e.target.value)} placeholder="Weight in grams" />
      <p className="text-sm font-bold">Value {formatMoney(r.totalValue, currency)} · Zakat {formatMoney(r.zakatDue, currency)}</p>
      <Button size="sm" onClick={() => onApplyValue(r.totalValue.toFixed(2))} disabled={!r.totalValue}>Apply value to main calc</Button>
    </div>
  );
}

function AdvancedBusiness({ biz, setBiz, currency, onApply }) {
  const r = calculateBusinessZakat(biz);
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Inventory + receivables + cash − liabilities · 2.5%</p>
      {['inventory', 'receivables', 'cash', 'liabilities'].map((k) => (
        <Input key={k} type="number" placeholder={k} value={biz[k]} onChange={(e) => setBiz({ ...biz, [k]: e.target.value })} />
      ))}
      <p className="text-sm font-bold">Zakatable {formatMoney(r.zakatable, currency)} · Zakat {formatMoney(r.zakatDue, currency)}</p>
      <Button size="sm" onClick={() => onApply(r.zakatable)} disabled={!r.zakatable}>Apply to business assets</Button>
    </div>
  );
}

function AdvancedAgriculture({ agri, setAgri, currency }) {
  const r = calculateAgricultureZakat(agri.value, agri.irrigation);
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Distinct fiqh rate: 10% rain-fed / 5% irrigated (not the 2.5% wealth rate).</p>
      <Input type="number" placeholder="Produce value" value={agri.value} onChange={(e) => setAgri({ ...agri, value: e.target.value })} />
      <div className="flex gap-2">
        <Button size="sm" variant={agri.irrigation === 'rain' ? 'default' : 'outline'} onClick={() => setAgri({ ...agri, irrigation: 'rain' })}>Rain-fed 10%</Button>
        <Button size="sm" variant={agri.irrigation === 'irrigated' ? 'default' : 'outline'} onClick={() => setAgri({ ...agri, irrigation: 'irrigated' })}>Irrigated 5%</Button>
      </div>
      <p className="text-sm font-bold">Zakat due: {formatMoney(r.zakatDue, currency)} ({(r.rate * 100)}%)</p>
    </div>
  );
}

function GiveTab({ engine }) {
  const { result, fmt, currency } = engine;
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [sadaqa, setSadaqa] = useState({ amount: '', notes: '' });

  const yearStart = startOfYear(new Date()).toISOString().split('T')[0];
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses-zakat', yearStart],
    queryFn: () => base44.entities.Expense.filter({ date: { $gte: yearStart } }, '-date', 500),
    staleTime: 30000,
  });

  const zakatPaid = useMemo(
    () => expenses.filter((e) => e.type === 'zakat').reduce((s, e) => s + (e.amount || 0), 0),
    [expenses],
  );
  const sadaqaPaid = useMemo(
    () => expenses.filter((e) => e.type === 'sadaqa').reduce((s, e) => s + (e.amount || 0), 0),
    [expenses],
  );
  const remaining = Math.max(0, result.zakatDue - zakatPaid);
  const paidPct = result.zakatDue > 0 ? Math.min(100, (zakatPaid / result.zakatDue) * 100) : 0;
  const logs = useMemo(
    () => expenses.filter((e) => e.type === 'zakat' || e.type === 'sadaqa').slice(0, 12),
    [expenses],
  );

  const zakatMutation = useMutation({
    mutationFn: (amt) => base44.entities.Expense.create({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: parseFloat(amt),
      type: 'zakat',
      category: 'charity',
      description: `Zakat payment — ${format(new Date(), 'yyyy')}`,
      is_zakat_deductible: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-zakat'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setAmount('');
      toast.success('Zakat payment recorded');
    },
  });

  const sadaqaMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: parseFloat(data.amount),
      type: 'sadaqa',
      category: 'charity',
      description: 'Sadaqa',
      notes: data.notes,
      is_sadaqa: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-zakat'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setSadaqa({ amount: '', notes: '' });
      toast.success('Sadaqa logged');
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">Due vs paid ({currency})</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{fmt(result.zakatDue)}</p>
            <p className="text-xs text-slate-500">Calculated from shared engine assets</p>
          </div>
          <Heart className="w-5 h-5 text-emerald-600" />
        </div>
        <Progress value={paidPct} className="h-2" />
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div><p className="text-slate-400">Paid</p><p className="font-bold">{fmt(zakatPaid)}</p></div>
          <div><p className="text-slate-400">Remaining</p><p className="font-bold text-amber-700">{fmt(remaining)}</p></div>
          <div><p className="text-slate-400">Sadaqa YTD</p><p className="font-bold">{fmt(sadaqaPaid)}</p></div>
        </div>
        <Link
          to={createPageUrl('ZakatDonation')}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm py-3"
        >
          Donate via Stripe checkout <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h3 className="text-sm font-bold">Log a Zakat payment</h3>
        <div className="flex gap-2">
          <Input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button
            onClick={() => zakatMutation.mutate(amount)}
            disabled={!amount || zakatMutation.isPending}
            className="gap-1"
          >
            {zakatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Log
          </Button>
        </div>
        <Button size="sm" variant="outline" disabled={!remaining} onClick={() => setAmount(String(remaining.toFixed(2)))}>
          Fill remaining {fmt(remaining)}
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h3 className="text-sm font-bold">Log Sadaqa</h3>
        <Input type="number" placeholder="Amount" value={sadaqa.amount} onChange={(e) => setSadaqa({ ...sadaqa, amount: e.target.value })} />
        <Input placeholder="Notes (optional)" value={sadaqa.notes} onChange={(e) => setSadaqa({ ...sadaqa, notes: e.target.value })} />
        <Button onClick={() => sadaqaMutation.mutate(sadaqa)} disabled={!sadaqa.amount || sadaqaMutation.isPending}>
          Log Sadaqa
        </Button>
      </div>

      {logs.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <h3 className="text-sm font-bold">Expense log</h3>
          {logs.map((e) => (
            <div key={e.id} className="flex justify-between text-xs border-b border-slate-100 dark:border-slate-800 py-2">
              <span className="capitalize text-slate-600 dark:text-slate-300">{e.type} · {e.date}</span>
              <span className="font-bold">{fmt(e.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" /> Schedule Zakat on calendar
        </h3>
        <p className="text-xs text-slate-500">
          Creates reminder events for the remaining due amount ({fmt(remaining)}).
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'lump_sum', label: 'One payment', n: 1 },
            { id: 'quarterly', label: 'Quarterly', n: 4 },
            { id: 'monthly', label: 'Monthly', n: 12 },
          ].map((opt) => (
            <Button
              key={opt.id}
              size="sm"
              variant="outline"
              disabled={!remaining}
              onClick={async () => {
                const per = remaining / opt.n;
                try {
                  for (let i = 0; i < opt.n; i++) {
                    const d = addMonths(new Date(), opt.id === 'monthly' ? i : opt.id === 'quarterly' ? i * 3 : 0);
                    await base44.entities.Event.create({
                      title: `Zakat Payment ${i + 1}/${opt.n} — ${fmt(per)}`,
                      description: `Scheduled Zakat (${currency}) from Vagus Planner`,
                      start_date: d.toISOString(),
                      end_date: d.toISOString(),
                      category: 'other',
                      is_all_day: true,
                      reminders: [{ minutes_before: 1440, type: 'notification' }],
                    });
                  }
                  queryClient.invalidateQueries({ queryKey: ['events'] });
                  toast.success(`Scheduled ${opt.n} Zakat payment(s) on your calendar`);
                } catch {
                  toast.error('Could not schedule calendar events');
                }
              }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <FamilySadaqahJar />
    </div>
  );
}

function PlanTab() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Islamic financial planning tools — Mirath (inheritance), Fidyah/Kaffarah, halal screening, and planners.
      </p>
      <IslamicFinancialPlanner />
      <IslamicInheritanceCalculator />
      <FidyahKaffarahCalculator />
      <IslamicFinanceCalculator />
      <IslamicMarriagePlanner />
    </div>
  );
}

export default function ZakatHub({ defaultTab = 'calculate', showAdvancedByDefault = false }) {
  const engine = useZakatEngine();
  const tab = ['calculate', 'give', 'plan'].includes(defaultTab) ? defaultTab : 'calculate';

  return (
    <div className="space-y-3">
      <Tabs defaultValue={tab}>
        <TabsList className="grid grid-cols-3 w-full h-auto">
          <TabsTrigger value="calculate" className="text-[11px] sm:text-xs py-2 gap-1">
            <Calculator className="w-3.5 h-3.5" /> Calculate
          </TabsTrigger>
          <TabsTrigger value="give" className="text-[11px] sm:text-xs py-2 gap-1">
            <Heart className="w-3.5 h-3.5" /> Give
          </TabsTrigger>
          <TabsTrigger value="plan" className="text-[11px] sm:text-xs py-2 gap-1">
            <BookOpen className="w-3.5 h-3.5" /> Plan
          </TabsTrigger>
        </TabsList>
        <TabsContent value="calculate" className="mt-4">
          <CalculateTab engine={engine} defaultAdvancedOpen={showAdvancedByDefault} />
        </TabsContent>
        <TabsContent value="give" className="mt-4">
          <GiveTab engine={engine} />
        </TabsContent>
        <TabsContent value="plan" className="mt-4">
          <PlanTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Thin Finance-page summary — no duplicate calculator. */
export function ZakatFinanceSummaryCard() {
  const { result, fmt, currency, priceLoading } = useZakatEngine();
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-slate-900 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Zakat summary</p>
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {priceLoading ? '…' : fmt(result.zakatDue)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {result.meetsNisab ? 'Due this year (canonical engine)' : 'Below nisab'} · {currency}
          </p>
        </div>
        <Scale className="w-6 h-6 text-amber-600" />
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Full calculator, giving tracker, family jar, and Islamic planning tools live in the Islam hub — not duplicated here.
      </p>
      <Link
        to={`${createPageUrl('Islam')}?section=zakat`}
        className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm py-3"
      >
        Open Zakat in Islam <ExternalLink className="w-4 h-4" />
      </Link>
    </div>
  );
}
