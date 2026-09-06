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
  Gem, Coins, Building2, Sprout, ExternalLink, Scale, AlertTriangle, Plus, Loader2,
  Calendar, ArrowLeft, ScrollText, Home, ShieldCheck, CheckCircle2,
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
import GivingPlan from '@/components/zakat/GivingPlan';
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

const PLAN_TOOLS = [
  {
    id: 'mirath',
    icon: ScrollText,
    title: 'Islamic Inheritance (Mirath)',
    desc: 'Calculate Qur’anic inheritance shares for heirs.',
    Component: IslamicInheritanceCalculator,
  },
  {
    id: 'fidyah',
    icon: Heart,
    title: 'Fidyah & Kaffarah',
    desc: 'Estimate fidyah/kaffarah amounts for missed obligations.',
    Component: FidyahKaffarahCalculator,
  },
  {
    id: 'halal',
    icon: ShieldCheck,
    title: 'Halal finance screening',
    desc: 'Screen mortgages and investments for Shariah compliance.',
    Component: IslamicFinanceCalculator,
  },
  {
    id: 'marriage',
    icon: Home,
    title: 'Marriage planner',
    desc: 'Plan mahr, budgets, and wedding milestones Islamically.',
    Component: IslamicMarriagePlanner,
  },
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

function PriceDisclosure({ engine }) {
  const {
    goldPricePerGram, silverPricePerGram, priceLoading, priceSource, priceAsOf, fmt, currency,
  } = engine;
  if (priceLoading) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
        Loading live metal prices…
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
      <strong>Using {priceSource === 'live' ? 'live' : 'approximate'} prices:</strong>{' '}
      gold {fmt(goldPricePerGram)}/gram, silver {fmt(silverPricePerGram)}/gram ({currency})
      {priceAsOf ? `, as of ${priceAsOf}` : `, as of ${format(new Date(), 'yyyy-MM-dd HH:mm')}`}
      . Nisab: {NISAB_GOLD_GRAMS}g gold / {NISAB_SILVER_GRAMS}g silver (silver threshold used).
    </div>
  );
}

function CalculateTab({ engine, defaultAdvancedOpen = false }) {
  const {
    currency, setCurrency, assets, updateAsset, result, fmt,
    goldPricePerGram, silverPricePerGram, priceLoading, refreshPrices,
  } = engine;
  const [showAdvanced, setShowAdvanced] = useState(defaultAdvancedOpen);
  const [advTab, setAdvTab] = useState('gold');
  const [goldGrams, setGoldGrams] = useState('');
  const [silverGrams, setSilverGrams] = useState('');
  const [goldGramsConfirmed, setGoldGramsConfirmed] = useState(null);
  const [silverGramsConfirmed, setSilverGramsConfirmed] = useState(null);
  const [appliedFlash, setAppliedFlash] = useState(null); // 'gold_value' | 'silver_value' | 'business_assets'
  const [biz, setBiz] = useState({ inventory: '', receivables: '', cash: '', liabilities: '' });
  const [agri, setAgri] = useState({ value: '', irrigation: 'rain' });

  const flashField = (key, message) => {
    setAppliedFlash(key);
    toast.success(message);
    window.setTimeout(() => setAppliedFlash((cur) => (cur === key ? null : cur)), 2800);
  };

  const applyMetalGrams = (metal) => {
    if (metal === 'gold') {
      const grams = parseFloat(goldGrams) || 0;
      const val = grams * goldPricePerGram;
      if (val > 0) {
        updateAsset('gold_value', val.toFixed(2));
        setGoldGramsConfirmed({ grams, value: val });
        setGoldGrams('');
        flashField('gold_value', `Gold: ${grams}g → ${fmt(val)} applied`);
        window.setTimeout(() => setGoldGramsConfirmed(null), 3500);
      } else {
        toast.error('Enter gold weight in grams first');
      }
    } else {
      const grams = parseFloat(silverGrams) || 0;
      const val = grams * silverPricePerGram;
      if (val > 0) {
        updateAsset('silver_value', val.toFixed(2));
        setSilverGramsConfirmed({ grams, value: val });
        setSilverGrams('');
        flashField('silver_value', `Silver: ${grams}g → ${fmt(val)} applied`);
        window.setTimeout(() => setSilverGramsConfirmed(null), 3500);
      } else {
        toast.error('Enter silver weight in grams first');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
          Enter assets once — Zakat due is shared with the Give tab automatically.
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

      <PriceDisclosure engine={engine} />

      <div className={`rounded-2xl border p-4 ${result.meetsNisab ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40'}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Nisab status</p>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100">
              {result.meetsNisab ? 'Zakat is due' : 'Below nisab'}
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

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-amber-600" /> Your assets
        </h3>
        {ASSET_FIELDS.map((f) => (
          <div key={f.key}>
            <Label className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              {f.label}
              {appliedFlash === f.key && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Applied
                </span>
              )}
            </Label>
            <p className="text-[10px] text-slate-400 mb-1">{f.hint}</p>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={assets[f.key] || ''}
              onChange={(e) => updateAsset(f.key, e.target.value)}
              placeholder="0.00"
              className={`${f.deduct ? 'border-red-200 focus:ring-red-400' : ''} ${
                appliedFlash === f.key ? 'border-emerald-400 ring-2 ring-emerald-200' : ''
              }`}
            />
          </div>
        ))}

        <div className="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Grams → market value</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Gold grams</Label>
              <div className="flex gap-1">
                <Input type="number" value={goldGrams} onChange={(e) => { setGoldGrams(e.target.value); setGoldGramsConfirmed(null); }} className="h-8 text-xs" />
                <Button size="sm" className={`h-8 min-w-[2rem] ${goldGramsConfirmed ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`} onClick={() => applyMetalGrams('gold')} disabled={priceLoading} aria-label="Convert gold grams">
                  {goldGramsConfirmed ? <CheckCircle2 className="w-4 h-4" /> : '✓'}
                </Button>
              </div>
              {goldGramsConfirmed && (
                <p className="mt-1 text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {goldGramsConfirmed.grams}g → {fmt(goldGramsConfirmed.value)} set on Gold
                </p>
              )}
            </div>
            <div>
              <Label className="text-[10px]">Silver grams</Label>
              <div className="flex gap-1">
                <Input type="number" value={silverGrams} onChange={(e) => { setSilverGrams(e.target.value); setSilverGramsConfirmed(null); }} className="h-8 text-xs" />
                <Button size="sm" className={`h-8 min-w-[2rem] ${silverGramsConfirmed ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`} onClick={() => applyMetalGrams('silver')} disabled={priceLoading} aria-label="Convert silver grams">
                  {silverGramsConfirmed ? <CheckCircle2 className="w-4 h-4" /> : '✓'}
                </Button>
              </div>
              {silverGramsConfirmed && (
                <p className="mt-1 text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {silverGramsConfirmed.grams}g → {fmt(silverGramsConfirmed.value)} set on Silver
                </p>
              )}
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
          <PriceDisclosure engine={engine} />
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
              onApplyValue={(v) => {
                updateAsset('gold_value', String(v));
                flashField('gold_value', `Applied ${fmt(Number(v))} to Gold (market value)`);
              }}
            />
          )}
          {advTab === 'silver' && (
            <AdvancedSilver
              price={silverPricePerGram}
              currency={currency}
              onApplyValue={(v) => {
                updateAsset('silver_value', String(v));
                flashField('silver_value', `Applied ${fmt(Number(v))} to Silver (market value)`);
              }}
            />
          )}
          {advTab === 'business' && (
            <AdvancedBusiness
              biz={biz}
              setBiz={setBiz}
              currency={currency}
              onApply={(zakatable) => {
                updateAsset('business_assets', String(zakatable.toFixed(2)));
                flashField('business_assets', `Applied ${fmt(zakatable)} to Business / inventory`);
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
  const [appliedMsg, setAppliedMsg] = useState('');
  const r = calculateGoldWeightZakat(grams, price);
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Nisab: {NISAB_GOLD_GRAMS}g · live gold price/g ({formatMoney(price, currency)})</p>
      <Input type="number" value={grams} onChange={(e) => { setGrams(e.target.value); setAppliedMsg(''); }} placeholder="Weight in grams" />
      <p className="text-sm font-bold">Value {formatMoney(r.totalValue, currency)} · Zakat {formatMoney(r.zakatDue, currency)}</p>
      <Button
        size="sm"
        onClick={() => {
          onApplyValue(r.totalValue.toFixed(2));
          setAppliedMsg(`Applied ${formatMoney(r.totalValue, currency)} to Gold (market value)`);
        }}
        disabled={!r.totalValue}
        className={appliedMsg ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
      >
        {appliedMsg ? (
          <><CheckCircle2 className="w-4 h-4 mr-1" /> Applied</>
        ) : (
          'Apply value to main calc'
        )}
      </Button>
      {appliedMsg && (
        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> {appliedMsg}
        </p>
      )}
    </div>
  );
}

function AdvancedSilver({ price, currency, onApplyValue }) {
  const [grams, setGrams] = useState('');
  const [appliedMsg, setAppliedMsg] = useState('');
  const r = calculateSilverWeightZakat(grams, price);
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Nisab: {NISAB_SILVER_GRAMS}g · live silver price/g ({formatMoney(price, currency)})</p>
      <Input type="number" value={grams} onChange={(e) => { setGrams(e.target.value); setAppliedMsg(''); }} placeholder="Weight in grams" />
      <p className="text-sm font-bold">Value {formatMoney(r.totalValue, currency)} · Zakat {formatMoney(r.zakatDue, currency)}</p>
      <Button
        size="sm"
        onClick={() => {
          onApplyValue(r.totalValue.toFixed(2));
          setAppliedMsg(`Applied ${formatMoney(r.totalValue, currency)} to Silver (market value)`);
        }}
        disabled={!r.totalValue}
        className={appliedMsg ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
      >
        {appliedMsg ? (
          <><CheckCircle2 className="w-4 h-4 mr-1" /> Applied</>
        ) : (
          'Apply value to main calc'
        )}
      </Button>
      {appliedMsg && (
        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> {appliedMsg}
        </p>
      )}
    </div>
  );
}

function AdvancedBusiness({ biz, setBiz, currency, onApply }) {
  const [appliedMsg, setAppliedMsg] = useState('');
  const r = calculateBusinessZakat(biz);
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Inventory + receivables + cash − liabilities · 2.5%</p>
      {['inventory', 'receivables', 'cash', 'liabilities'].map((k) => (
        <Input key={k} type="number" placeholder={k} value={biz[k]} onChange={(e) => { setBiz({ ...biz, [k]: e.target.value }); setAppliedMsg(''); }} />
      ))}
      <p className="text-sm font-bold">Zakatable {formatMoney(r.zakatable, currency)} · Zakat {formatMoney(r.zakatDue, currency)}</p>
      <Button
        size="sm"
        onClick={() => {
          onApply(r.zakatable);
          setAppliedMsg(`Applied ${formatMoney(r.zakatable, currency)} to Business / inventory`);
        }}
        disabled={!r.zakatable}
        className={appliedMsg ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
      >
        {appliedMsg ? (
          <><CheckCircle2 className="w-4 h-4 mr-1" /> Applied</>
        ) : (
          'Apply to business assets'
        )}
      </Button>
      {appliedMsg && (
        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> {appliedMsg}
        </p>
      )}
    </div>
  );
}

function AdvancedAgriculture({ agri, setAgri, currency }) {
  const r = calculateAgricultureZakat(agri.value, agri.irrigation);
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Distinct fiqh rate: 10% rain-fed / 5% irrigated.</p>
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
  const [manual, setManual] = useState({
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'zakat',
    charity: '',
    notes: '',
  });

  const yearStart = startOfYear(new Date()).toISOString().split('T')[0];
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses-zakat', yearStart],
    queryFn: () => base44.entities.Expense.filter({ date: { $gte: yearStart } }, '-date', 500),
    staleTime: 15000,
  });

  const zakatPaid = useMemo(
    () => expenses.filter((e) => e.type === 'zakat').reduce((s, e) => s + (e.amount || 0), 0),
    [expenses],
  );
  const remaining = Math.max(0, result.zakatDue - zakatPaid);
  const paidPct = result.zakatDue > 0 ? Math.min(100, (zakatPaid / result.zakatDue) * 100) : 0;

  const combinedLog = useMemo(() => {
    const fromExpenses = expenses
      .filter((e) => e.type === 'zakat' || e.type === 'sadaqa' || e.category === 'charity')
      .map((e) => ({
        id: e.id,
        date: e.date,
        amount: e.amount,
        label: e.description || e.type || 'Giving',
        kind: e.type === 'zakat' ? 'Zakat' : 'Charity',
        source: 'expense',
      }));
    let pot = [];
    try {
      const plan = JSON.parse(localStorage.getItem('vagus_giving_plan_v1') || '{}');
      pot = (plan.potEntries || []).map((e) => ({
        id: e.id,
        date: e.date,
        amount: e.amount,
        label: e.cause || 'Giving pot',
        kind: 'Charity',
        source: 'pot',
      }));
    } catch {
      pot = [];
    }
    return [...fromExpenses, ...pot]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 25);
  }, [expenses]);

  const logElsewhere = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(manual.amount);
      if (!amount || amount <= 0) throw new Error('Enter a valid amount');
      return base44.entities.Expense.create({
        date: manual.date || format(new Date(), 'yyyy-MM-dd'),
        amount,
        type: manual.type === 'zakat' ? 'zakat' : 'sadaqa',
        category: 'charity',
        description: manual.charity
          ? `${manual.type === 'zakat' ? 'Zakat' : 'Charity'} elsewhere — ${manual.charity}`
          : `${manual.type === 'zakat' ? 'Zakat' : 'Charity'} given elsewhere`,
        notes: manual.notes || '',
        is_zakat_deductible: manual.type === 'zakat',
        is_sadaqa: manual.type !== 'zakat',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-zakat'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Giving logged');
      setManual({
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'zakat',
        charity: '',
        notes: '',
      });
    },
    onError: (err) => toast.error(err.message || 'Could not save'),
  });

  return (
    <div className="space-y-4">
      {/* Due from Calculate — shared engine */}
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
              Zakat due (from Calculate)
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{fmt(result.zakatDue)}</p>
            <p className="text-xs text-slate-500">
              Auto-filled from your shared assets · {currency}
              {!result.zakatDue ? ' — open Calculate and enter assets if this is £0' : ''}
            </p>
          </div>
          <Heart className="w-5 h-5 text-emerald-600" />
        </div>
        <Progress value={paidPct} className="h-2" />
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div><p className="text-slate-400">Paid</p><p className="font-bold">{fmt(zakatPaid)}</p></div>
          <div><p className="text-slate-400">Remaining</p><p className="font-bold text-amber-700">{fmt(remaining)}</p></div>
        </div>
      </div>

      {/* Primary: log elsewhere */}
      <div className="rounded-2xl border-2 border-slate-800/10 dark:border-slate-100/10 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">I gave elsewhere — log it here</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Primary way to track Zakat and charity while verified partners are being onboarded.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={manual.type === 'zakat' ? 'default' : 'outline'} onClick={() => setManual({ ...manual, type: 'zakat' })}>Zakat</Button>
          <Button size="sm" variant={manual.type === 'charity' ? 'default' : 'outline'} onClick={() => setManual({ ...manual, type: 'charity' })}>General charity</Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Amount</Label>
            <Input type="number" value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value })} placeholder="0.00" />
          </div>
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Charity / cause (optional)</Label>
          <Input value={manual.charity} onChange={(e) => setManual({ ...manual, charity: e.target.value })} placeholder="e.g. Local mosque" />
        </div>
        <div>
          <Label className="text-xs">Note (optional)</Label>
          <Input value={manual.notes} onChange={(e) => setManual({ ...manual, notes: e.target.value })} placeholder="Intention or reference" />
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => logElsewhere.mutate()}
            disabled={logElsewhere.isPending}
          >
            {logElsewhere.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Log giving
          </Button>
          {remaining > 0 && manual.type === 'zakat' && (
            <Button variant="outline" onClick={() => setManual({ ...manual, amount: String(remaining.toFixed(2)) })}>
              Fill remaining
            </Button>
          )}
        </div>
      </div>

      {/* Coming soon Stripe / verified charities */}
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 p-4 opacity-90">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Verified charities & Stripe checkout</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Coming soon — new charity partners. In-app vetted directory and secure card payments are not connected yet.
            </p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full whitespace-nowrap">
            Coming soon
          </span>
        </div>
        <button
          type="button"
          disabled
          className="mt-3 w-full rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 text-sm font-semibold py-2.5 cursor-not-allowed"
        >
          Donate securely via Stripe (unavailable)
        </button>
      </div>

      <GivingPlan currency={currency} fmt={fmt} />

      {/* Unified history */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <ScrollText className="w-4 h-4" /> Giving history
        </h3>
        <p className="text-[11px] text-slate-500">Zakat payments and general charity in one combined log.</p>
        {combinedLog.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No giving logged yet this year.</p>
        ) : (
          combinedLog.map((e) => (
            <div key={`${e.source}-${e.id}`} className="flex justify-between text-xs border-b border-slate-100 dark:border-slate-800 py-2 gap-2">
              <span className="text-slate-600 dark:text-slate-300 truncate">
                <span className="font-semibold text-slate-800 dark:text-slate-100">{e.kind}</span>
                {' · '}{e.date} · {e.label}
              </span>
              <span className="font-bold flex-shrink-0">{fmt(e.amount)}</span>
            </div>
          ))
        )}
      </div>

      {/* Keep calendar schedule capability */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" /> Schedule remaining Zakat
        </h3>
        <p className="text-xs text-slate-500">Creates reminder events for the remaining due amount ({fmt(remaining)}).</p>
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
                  toast.success(`Scheduled ${opt.n} Zakat payment(s)`);
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
    </div>
  );
}

function PlanTab() {
  const [openId, setOpenId] = useState(null);
  const openTool = PLAN_TOOLS.find((t) => t.id === openId);

  if (openTool) {
    const Icon = openTool.icon;
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setOpenId(null)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#1D6FB8] transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to planning tools
        </button>
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-700 shadow-md">
          <div className="p-2.5 bg-white/20 rounded-xl">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{openTool.title}</h3>
            <p className="text-xs text-white/75">{openTool.desc}</p>
          </div>
        </div>
        <openTool.Component />
        {/* Keep planner available from Plan as well */}
        {openId === 'halal' && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-500 mb-2">Also available: Islamic financial planner</p>
            <IslamicFinancialPlanner />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Four distinct planning tools — open one at a time.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PLAN_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex flex-col gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{tool.title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tool.desc}</p>
              </div>
              <Button onClick={() => setOpenId(tool.id)} className="w-full">
                Open
              </Button>
            </div>
          );
        })}
      </div>
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-4">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">Islamic financial planner</p>
        <p className="text-xs text-slate-500 mb-3">AI-guided halal budgeting and riba-aware planning (also linked from halal screening).</p>
        <IslamicFinancialPlanner />
      </div>
    </div>
  );
}

export default function ZakatHub({ defaultTab = 'calculate', showAdvancedByDefault = false, showHubBack = true }) {
  const engine = useZakatEngine();
  const tab = ['calculate', 'give', 'plan'].includes(defaultTab) ? defaultTab : 'calculate';

  return (
    <div className="space-y-3">
      {showHubBack && (
        <Link
          to={createPageUrl('Islam')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#1D6FB8] transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Islam
        </Link>
      )}
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
        Full calculator, giving tracker, and planning tools live in the Islam hub.
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
