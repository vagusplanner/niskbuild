import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp, Coins, DollarSign, PiggyBank, Landmark,
  Calendar, CheckCircle2, AlertCircle, Info, Sparkles,
  ChevronDown, ChevronUp, RefreshCw, Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const NISAB_GOLD_GRAMS = 87.48;
const NISAB_SILVER_GRAMS = 612.36;
const ZAKAT_RATE = 0.025;

const CURRENCIES = [
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
];

// FX rates vs USD (approximate — used to convert gold/silver prices)
const FX_TO_USD = {
  GBP: 0.79, USD: 1, EUR: 0.92, AED: 3.67, SAR: 3.75,
  PKR: 278, BDT: 110, MYR: 4.7, CAD: 1.36, AUD: 1.53, TRY: 32,
};

const ASSET_CATEGORIES = [
  {
    key: 'cash',
    label: 'Cash & Savings',
    color: '#10b981',
    icon: '💵',
    fields: [
      { key: 'cash_on_hand', label: 'Cash on Hand' },
      { key: 'bank_savings', label: 'Bank Savings & Current Accounts' },
      { key: 'fixed_deposits', label: 'Fixed Deposits / ISA' },
    ]
  },
  {
    key: 'precious_metals',
    label: 'Gold & Silver',
    color: '#f59e0b',
    icon: '🥇',
    fields: [
      { key: 'gold_grams', label: 'Gold (grams)', isWeight: true, priceKey: 'gold' },
      { key: 'silver_grams', label: 'Silver (grams)', isWeight: true, priceKey: 'silver' },
    ]
  },
  {
    key: 'investments',
    label: 'Investments',
    color: '#6366f1',
    icon: '📈',
    fields: [
      { key: 'stocks_halal', label: 'Halal Stocks / Shares' },
      { key: 'stocks_mixed', label: 'Mixed/Conventional Stocks (zakatable portion)' },
      { key: 'crypto', label: 'Cryptocurrency' },
      { key: 'pension_savings', label: 'Pension / SIPP (accessible portion)' },
    ]
  },
  {
    key: 'business',
    label: 'Business Assets',
    color: '#0891b2',
    icon: '🏪',
    fields: [
      { key: 'business_inventory', label: 'Business Inventory / Trade Goods' },
      { key: 'business_receivables', label: 'Business Receivables' },
    ]
  },
  {
    key: 'receivables',
    label: 'Money Owed to You',
    color: '#8b5cf6',
    icon: '🤝',
    fields: [
      { key: 'debts_owed_to_me', label: 'Personal Loans Receivable' },
    ]
  },
];

const LIABILITY_FIELDS = [
  { key: 'debts_owed', label: 'Debts & Loans Owed' },
  { key: 'immediate_expenses', label: 'Immediate Expenses Due (this month)' },
];

const STORAGE_KEY = 'vagus_zakat_calc_v2';

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function persist(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function ZakatCalculatorModule() {
  const queryClient = useQueryClient();

  const saved = useMemo(() => loadSaved(), []);

  const [currency, setCurrency] = useState(saved.currency || 'GBP');
  const [assets, setAssets] = useState(saved.assets || {});
  const [liabilities, setLiabilities] = useState(saved.liabilities || {});
  const [goldPrice, setGoldPrice] = useState(null); // per gram in USD
  const [silverPrice, setSilverPrice] = useState(null);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [expandedCats, setExpandedCats] = useState({ cash: true, precious_metals: true });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [nisabBasis, setNisabBasis] = useState('silver'); // 'gold' | 'silver'

  const currencyInfo = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  const sym = currencyInfo.symbol;
  const fxRate = FX_TO_USD[currency] || 1; // how many local units per 1 USD

  // Convert USD price → local currency price
  const goldPriceLocal = goldPrice ? goldPrice * fxRate : null;
  const silverPriceLocal = silverPrice ? silverPrice * fxRate : null;

  // Fetch prices
  useEffect(() => {
    const cached = sessionStorage.getItem('zakat_prices');
    if (cached) {
      const p = JSON.parse(cached);
      setGoldPrice(p.gold); setSilverPrice(p.silver); setLoadingPrices(false); return;
    }
    SDK.integrations.Core.InvokeLLM({
      prompt: `What is today's spot price per gram of gold in USD, and silver per gram in USD? Use current market data.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object', properties: {
          gold_usd_per_gram: { type: 'number' },
          silver_usd_per_gram: { type: 'number' }
        }
      }
    }).then(r => {
      const g = r.gold_usd_per_gram || 92;
      const s = r.silver_usd_per_gram || 0.97;
      setGoldPrice(g); setSilverPrice(s);
      sessionStorage.setItem('zakat_prices', JSON.stringify({ gold: g, silver: s }));
    }).catch(() => {
      setGoldPrice(92); setSilverPrice(0.97);
    }).finally(() => setLoadingPrices(false));
  }, []);

  // Persist state changes
  useEffect(() => {
    persist({ currency, assets, liabilities });
  }, [currency, assets, liabilities]);

  const { data: zakatPayments = [] } = useQuery({
    queryKey: ['zakatPayments'],
    queryFn: () => SDK.entities.ZakatCalculation.list('-created_date', 20),
  });

  const updateAsset = (key, val) => setAssets(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  const updateLiability = (key, val) => setLiabilities(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));

  // Compute per-category values
  const categoryValues = useMemo(() => {
    const result = {};
    ASSET_CATEGORIES.forEach(cat => {
      let total = 0;
      cat.fields.forEach(f => {
        if (f.isWeight) {
          const price = f.priceKey === 'gold' ? (goldPriceLocal || 0) : (silverPriceLocal || 0);
          total += (assets[f.key] || 0) * price;
        } else {
          total += assets[f.key] || 0;
        }
      });
      result[cat.key] = total;
    });
    return result;
  }, [assets, goldPriceLocal, silverPriceLocal]);

  const totalAssets = Object.values(categoryValues).reduce((a, b) => a + b, 0);
  const totalLiabilities = LIABILITY_FIELDS.reduce((s, f) => s + (liabilities[f.key] || 0), 0);
  const netWealth = Math.max(0, totalAssets - totalLiabilities);

  const nisabGold = goldPriceLocal ? goldPriceLocal * NISAB_GOLD_GRAMS : 0;
  const nisabSilver = silverPriceLocal ? silverPriceLocal * NISAB_SILVER_GRAMS : 0;
  const nisabThreshold = nisabBasis === 'gold' ? nisabGold : nisabSilver;

  const isAboveNisab = netWealth >= nisabThreshold && nisabThreshold > 0;
  const zakatDue = isAboveNisab ? netWealth * ZAKAT_RATE : 0;

  const currentYear = new Date().getFullYear();
  const paidThisYear = zakatPayments
    .filter(z => new Date(z.created_date).getFullYear() === currentYear)
    .reduce((s, z) => s + (z.amount_paid || 0), 0);
  const remaining = Math.max(0, zakatDue - paidThisYear);

  // Pie chart data
  const pieData = ASSET_CATEGORIES
    .filter(cat => categoryValues[cat.key] > 0)
    .map(cat => ({ name: cat.label, value: parseFloat(categoryValues[cat.key].toFixed(2)), color: cat.color }));

  const savePaymentMutation = useMutation({
    mutationFn: (amount) => SDK.entities.ZakatCalculation.create({
      year: currentYear,
      calculation_date: new Date().toISOString().split('T')[0],
      gold_value: categoryValues.precious_metals,
      silver_value: 0,
      cash_savings: categoryValues.cash,
      investments: categoryValues.investments,
      property_value: 0,
      debts: totalLiabilities,
      total_zakatable_wealth: netWealth,
      nisab_threshold: nisabThreshold,
      zakat_due: zakatDue,
      amount_paid: amount,
      status: amount >= remaining ? 'completed' : 'in_progress',
      notes: `Currency: ${currency} | Nisab basis: ${nisabBasis} | Gold: ${goldPriceLocal?.toFixed(2)}${sym}/g`,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zakatPayments'] });
      setPaymentAmount('');
      toast.success('Zakat payment recorded. JazakAllah Khayran 🤲');
    }
  });

  const fmt = (n) => `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Scale className="w-6 h-6 text-amber-200" />
          <h1 className="text-xl font-black tracking-tight">Zakāt al-Māl Calculator</h1>
        </div>
        <p className="text-sm text-amber-100">Enter your assets to calculate your annual Zakat obligation (2.5%)</p>
        <p className="text-xs text-amber-200 mt-1 font-arabic" dir="rtl">وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ — Al-Baqarah 2:43</p>
      </div>

      {/* Currency & Nisab Settings */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Nisab Basis</Label>
              <Select value={nisabBasis} onValueChange={setNisabBasis}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="silver">Silver (lower — more common)</SelectItem>
                  <SelectItem value="gold">Gold (higher threshold)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Live prices */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {loadingPrices ? (
              <div className="col-span-2 flex items-center gap-2 text-xs text-slate-500">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fetching live market prices…
              </div>
            ) : (
              <>
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <p className="text-[10px] text-amber-600 font-semibold">Gold / gram</p>
                  <p className="text-sm font-bold text-amber-800">{fmt(goldPriceLocal || 0)}</p>
                  <p className="text-[9px] text-amber-500">Nisab = {fmt(nisabGold)}</p>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <p className="text-[10px] text-slate-600 font-semibold">Silver / gram</p>
                  <p className="text-sm font-bold text-slate-800">{fmt(silverPriceLocal || 0)}</p>
                  <p className="text-[9px] text-slate-500">Nisab = {fmt(nisabSilver)}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Asset Categories */}
      {ASSET_CATEGORIES.map(cat => (
        <Card key={cat.key} className="overflow-hidden">
          <button
            onClick={() => setExpandedCats(p => ({ ...p, [cat.key]: !p[cat.key] }))}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{cat.icon}</span>
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{cat.label}</span>
              {categoryValues[cat.key] > 0 && (
                <Badge className="text-[10px] px-2 py-0" style={{ background: cat.color + '22', color: cat.color, border: `1px solid ${cat.color}44` }}>
                  {fmt(categoryValues[cat.key])}
                </Badge>
              )}
            </div>
            {expandedCats[cat.key]
              ? <ChevronUp className="w-4 h-4 text-slate-400" />
              : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          <AnimatePresence initial={false}>
            {expandedCats[cat.key] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <CardContent className="pt-0 pb-4 px-4 space-y-3">
                  {cat.fields.map(f => (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-xs text-slate-600">
                        {f.label}
                        {f.isWeight && goldPriceLocal && (
                          <span className="ml-1 text-slate-400">
                            (= {fmt((assets[f.key] || 0) * (f.priceKey === 'gold' ? goldPriceLocal : silverPriceLocal))})
                          </span>
                        )}
                      </Label>
                      <div className="relative">
                        {!f.isWeight && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{sym}</span>
                        )}
                        <Input
                          type="number"
                          min="0"
                          value={assets[f.key] || ''}
                          onChange={e => updateAsset(f.key, e.target.value)}
                          placeholder="0"
                          className={`h-9 text-sm ${!f.isWeight ? 'pl-6' : ''}`}
                        />
                        {f.isWeight && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">g</span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      ))}

      {/* Liabilities */}
      <Card className="border-orange-200 bg-orange-50/40 dark:bg-orange-950/20">
        <button
          onClick={() => setExpandedCats(p => ({ ...p, liabilities: !p.liabilities }))}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Liabilities (Deductible)</span>
            {totalLiabilities > 0 && (
              <Badge className="text-[10px] px-2 py-0 bg-orange-100 text-orange-700 border-orange-200">
                -{fmt(totalLiabilities)}
              </Badge>
            )}
          </div>
          {expandedCats.liabilities ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        <AnimatePresence initial={false}>
          {expandedCats.liabilities && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <CardContent className="pt-0 pb-4 px-4 space-y-3">
                {LIABILITY_FIELDS.map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs text-slate-600">{f.label}</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{sym}</span>
                      <Input
                        type="number" min="0"
                        value={liabilities[f.key] || ''}
                        onChange={e => updateLiability(f.key, e.target.value)}
                        placeholder="0" className="h-9 text-sm pl-6"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Results Summary */}
      <Card className={`border-2 ${isAboveNisab ? 'border-teal-300 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20' : 'border-slate-200'}`}>
        <CardContent className="p-4 space-y-4">
          {/* Nisab check */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Net Zakatable Wealth</p>
              <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{fmt(netWealth)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Nisab ({nisabBasis})</p>
              <p className="text-lg font-bold text-slate-600">{fmt(nisabThreshold)}</p>
              {isAboveNisab
                ? <Badge className="bg-teal-100 text-teal-800 border-teal-200 mt-1">✓ Above Nisab</Badge>
                : <Badge variant="outline" className="mt-1 text-slate-500">Below Nisab</Badge>}
            </div>
          </div>

          <Progress
            value={nisabThreshold > 0 ? Math.min(100, (netWealth / nisabThreshold) * 100) : 0}
            className="h-2"
          />

          {isAboveNisab && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-teal-100">Zakat Due (2.5%)</p>
                  <p className="text-4xl font-black">{fmt(zakatDue)}</p>
                </div>
                {paidThisYear > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-teal-200">Paid {currentYear}</p>
                    <p className="text-lg font-bold text-green-200">{fmt(paidThisYear)}</p>
                    <p className="text-xs text-teal-100 mt-1">Remaining: {fmt(remaining)}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {!isAboveNisab && netWealth > 0 && nisabThreshold > 0 && (
            <p className="text-sm text-slate-500 text-center">
              You need {fmt(nisabThreshold - netWealth)} more to reach Nisab. No Zakat is due at this time, but Sadaqa is always encouraged. 🤲
            </p>
          )}
        </CardContent>
      </Card>

      {/* Breakdown Pie Chart */}
      {pieData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" /> Wealth Breakdown by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>

            {/* Category rows */}
            <div className="space-y-1.5 mt-3">
              {ASSET_CATEGORIES.filter(c => categoryValues[c.key] > 0).map(cat => (
                <div key={cat.key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    <span className="text-slate-600">{cat.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-slate-800">{fmt(categoryValues[cat.key])}</span>
                    {isAboveNisab && (
                      <span className="text-xs text-teal-600 ml-2">→ {fmt(categoryValues[cat.key] * ZAKAT_RATE)}</span>
                    )}
                  </div>
                </div>
              ))}
              {totalLiabilities > 0 && (
                <div className="flex items-center justify-between text-sm pt-1 border-t border-slate-100 mt-1">
                  <span className="text-orange-600 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-400 flex-shrink-0" />
                    Less: Liabilities
                  </span>
                  <span className="font-semibold text-orange-600">-{fmt(totalLiabilities)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Record Payment */}
      {isAboveNisab && remaining > 0 && (
        <Card className="border-green-200 bg-green-50/40 dark:bg-green-950/20">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" /> Record Zakat Payment
            </p>
            <p className="text-xs text-slate-500">Log a payment to track your progress. Suggested: {fmt(remaining)}</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{sym}</span>
                <Input
                  type="number" min="0"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  placeholder={remaining.toFixed(2)}
                  className="pl-6 h-10"
                />
              </div>
              <Button
                onClick={() => {
                  const amt = parseFloat(paymentAmount);
                  if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
                  savePaymentMutation.mutate(amt);
                }}
                disabled={savePaymentMutation.isPending}
                className="bg-green-600 hover:bg-green-700 h-10"
              >
                {savePaymentMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Record'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {zakatPayments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" /> Payment History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {zakatPayments.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{sym}{p.amount_paid?.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">{new Date(p.created_date).toLocaleDateString()} · {p.status}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Guidelines */}
      <Card className="border-purple-200 bg-purple-50/40 dark:bg-purple-950/20">
        <CardContent className="p-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <p className="font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Zakat al-Māl Guidelines</p>
          <p>• <strong>Rate:</strong> 2.5% of total net zakatable wealth per lunar year (Hawl)</p>
          <p>• <strong>Nisab (Gold):</strong> 87.48g gold — {goldPriceLocal ? fmt(nisabGold) : '—'}</p>
          <p>• <strong>Nisab (Silver):</strong> 612.36g silver — {silverPriceLocal ? fmt(nisabSilver) : '—'}</p>
          <p>• <strong>Included:</strong> Cash, savings, gold, silver, investments, business inventory, receivables</p>
          <p>• <strong>Excluded:</strong> Primary home, personal vehicle, clothing, furniture, jewellery for personal use (Hanafi: taxable)</p>
          <p className="italic text-purple-600 dark:text-purple-400 pt-1">Consult a qualified Islamic scholar for rulings specific to your situation. This calculator is for guidance only.</p>
        </CardContent>
      </Card>
    </div>
  );
}