/**
 * ZakatSadaqaDashboard — Full Islamic financial obligation tracker.
 * - Calculates annual Zakat from assets (cash, gold, silver, investments, receivables)
 * - Nisab threshold auto-check (gold/silver price based)
 * - Sadaqa tracking and charitable goal allocation
 * - Integrated with the Expense entity (type: zakat / sadaqa)
 * - No new page — embedded in Finance (Islamic tab) and Islam > Charity section
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, Coins, Heart, TrendingUp, Plus, Loader2,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Sparkles, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfYear } from 'date-fns';

// Nisab: approx value based on 85g gold (~$5,500 USD) or 595g silver (~$530).
// We use the gold nisab as it is more common in fiqh today.
const NISAB_USD = 5500;
const ZAKAT_RATE = 0.025; // 2.5%

const CURRENCY_SYMBOLS = { USD: '$', GBP: '£', EUR: '€', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$', TRY: '₺', PKR: '₨' };

const ASSET_FIELDS = [
  { key: 'cash',         label: 'Cash & Bank Savings',    icon: '💵', hint: 'Checking, savings, and cash on hand' },
  { key: 'gold_silver',  label: 'Gold & Silver (value)',   icon: '🥇', hint: 'Market value of your gold/silver holdings' },
  { key: 'investments',  label: 'Investments & Stocks',    icon: '📈', hint: 'Halal investments, pension, crypto' },
  { key: 'receivables',  label: 'Money Owed to You',       icon: '🤝', hint: 'Loans you expect to recover' },
  { key: 'stock_trade',  label: 'Trade Goods (inventory)', icon: '🏪', hint: 'If you run a business: market value of stock' },
];

const DEDUCTIBLE_FIELDS = [
  { key: 'debts',        label: 'Debts / Liabilities',     icon: '📋', hint: 'Loans you must repay this year' },
  { key: 'expenses_due', label: 'Immediate Expenses Due',  icon: '🧾', hint: 'Bills, rent, etc. due within the month' },
];

const CHARITABLE_GOALS = [
  { label: 'Masjid / Mosque', emoji: '🕌' },
  { label: 'Orphan Sponsorship', emoji: '👶' },
  { label: 'Food Aid', emoji: '🍱' },
  { label: 'Education Fund', emoji: '📚' },
  { label: 'Water Well', emoji: '💧' },
  { label: 'Medical Aid', emoji: '🏥' },
  { label: 'Zakat ul-Fitr', emoji: '🌙' },
  { label: 'General Sadaqa', emoji: '🤲' },
];

const ASSETS_KEY = 'vagus_zakat_assets_v2';
function loadAssets() { try { return JSON.parse(localStorage.getItem(ASSETS_KEY) || '{}'); } catch { return {}; } }
function saveAssets(a) { localStorage.setItem(ASSETS_KEY, JSON.stringify(a)); }

export default function ZakatSadaqaDashboard({ currency = 'USD' }) {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  const [assets, setAssets] = useState(loadAssets);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [sadaqaForm, setSadaqaForm] = useState({ amount: '', goal: 'General Sadaqa', notes: '' });
  const [showSadaqa, setShowSadaqa] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const queryClient = useQueryClient();

  // Load this year's zakat & sadaqa payments from Expense entity
  const yearStart = startOfYear(new Date()).toISOString().split('T')[0];
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses-zakat', yearStart],
    queryFn: () => SDK.entities.Expense.filter({ date: { $gte: yearStart } }, '-date', 500),
    staleTime: 30000,
  });

  const zakatPaid = useMemo(() =>
    expenses.filter(e => e.type === 'zakat').reduce((s, e) => s + (e.amount || 0), 0), [expenses]);
  const sadaqaPaid = useMemo(() =>
    expenses.filter(e => e.type === 'sadaqa').reduce((s, e) => s + (e.amount || 0), 0), [expenses]);
  const charityLogs = useMemo(() =>
    expenses.filter(e => e.type === 'zakat' || e.type === 'sadaqa').slice(0, 10), [expenses]);

  // Zakat calculation
  const calc = useMemo(() => {
    const totalAssets = ASSET_FIELDS.reduce((s, f) => s + (parseFloat(assets[f.key]) || 0), 0);
    const totalDeduct = DEDUCTIBLE_FIELDS.reduce((s, f) => s + (parseFloat(assets[f.key]) || 0), 0);
    const zakatable = Math.max(0, totalAssets - totalDeduct);
    const meetsNisab = zakatable >= NISAB_USD;
    const zakatDue = meetsNisab ? zakatable * ZAKAT_RATE : 0;
    const remaining = Math.max(0, zakatDue - zakatPaid);
    const paidPct = zakatDue > 0 ? Math.min(100, (zakatPaid / zakatDue) * 100) : 0;
    return { totalAssets, totalDeduct, zakatable, meetsNisab, zakatDue, remaining, paidPct };
  }, [assets, zakatPaid]);

  const updateAsset = (key, val) => {
    const updated = { ...assets, [key]: val };
    setAssets(updated);
    saveAssets(updated);
  };

  // Save Zakat payment to Expense entity
  const zakatMutation = useMutation({
    mutationFn: (amount) => SDK.entities.Expense.create({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: parseFloat(amount),
      type: 'zakat',
      category: 'charity',
      description: `Zakat payment — ${format(new Date(), 'yyyy')}`,
      is_zakat_deductible: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-zakat'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Zakat payment recorded! JazakAllah Khayran 🤲');
    }
  });

  const sadaqaMutation = useMutation({
    mutationFn: (data) => SDK.entities.Expense.create({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: parseFloat(data.amount),
      type: 'sadaqa',
      category: 'charity',
      description: `Sadaqa — ${data.goal}`,
      notes: data.notes,
      is_sadaqa: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-zakat'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setSadaqaForm({ amount: '', goal: 'General Sadaqa', notes: '' });
      setShowSadaqa(false);
      toast.success('Sadaqa logged! May Allah accept it 💚');
    }
  });

  const getAIAdvice = async () => {
    setAiLoading(true);
    try {
      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `Islamic finance advisor. User's zakatable wealth: ${sym}${calc.zakatable.toFixed(0)}. 
Zakat due: ${sym}${calc.zakatDue.toFixed(0)}. Zakat paid this year: ${sym}${zakatPaid.toFixed(0)}.
Sadaqa given this year: ${sym}${sadaqaPaid.toFixed(0)}.
Give 3 short, practical, spiritually uplifting pieces of advice about their Zakat and Sadaqa situation. 
Include one Quran verse or hadith reference. Be warm and encouraging. Max 120 words total.`,
      });
      setAiAdvice(typeof result === 'string' ? result : result?.advice || '');
    } catch (_) { toast.error('Could not load AI advice'); }
    setAiLoading(false);
  };

  const fullyPaid = calc.zakatDue > 0 && calc.zakatPaid >= calc.zakatDue;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50 to-emerald-50 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-emerald-950/20 border border-amber-200 dark:border-amber-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
            <Scale className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-black text-amber-900 dark:text-amber-100 text-base">Zakāt & Sadaqa Dashboard</h3>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/70">Annual obligation · {format(new Date(), 'yyyy')}</p>
          </div>
          <div className="ml-auto">
            <Badge className={calc.meetsNisab ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-600 border-slate-200'}>
              {calc.meetsNisab ? '⚖️ Nisab met' : '⚖️ Below Nisab'}
            </Badge>
          </div>
        </div>

        {/* Key numbers */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white/70 dark:bg-slate-800/60 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-slate-500 font-semibold mb-0.5">Zakatable Wealth</p>
            <p className="text-base font-black text-slate-800 dark:text-slate-100">{sym}{calc.zakatable.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-amber-500/10 dark:bg-amber-900/30 rounded-xl p-2.5 text-center border border-amber-200/50">
            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mb-0.5">Zakat Due (2.5%)</p>
            <p className="text-base font-black text-amber-700 dark:text-amber-300">{sym}{calc.zakatDue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-emerald-500/10 dark:bg-emerald-900/30 rounded-xl p-2.5 text-center border border-emerald-200/50">
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mb-0.5">Paid This Year</p>
            <p className="text-base font-black text-emerald-700 dark:text-emerald-300">{sym}{zakatPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
        </div>

        {/* Zakat progress */}
        {calc.zakatDue > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Zakat paid</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">{calc.paidPct.toFixed(0)}%</span>
            </div>
            <Progress value={calc.paidPct}
              className="h-2.5 bg-amber-100 dark:bg-amber-900/30"
              indicatorClassName="bg-gradient-to-r from-amber-400 to-yellow-500"
            />
            {calc.remaining > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                {sym}{calc.remaining.toFixed(0)} remaining to fulfill your Zakat obligation
              </p>
            )}
            {calc.remaining <= 0 && (
              <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Zakat obligation fulfilled this year! Alhamdulillah 🤲
              </p>
            )}
          </div>
        )}

        {!calc.meetsNisab && (
          <p className="text-xs text-slate-500 mt-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-2">
            Your net zakatable wealth ({sym}{calc.zakatable.toFixed(0)}) is below the Nisab threshold (~{sym}{NISAB_USD.toLocaleString()}). Zakat is not obligatory at this time, but Sadaqa is always encouraged.
          </p>
        )}
      </div>

      {/* Asset Input */}
      <Card>
        <CardContent className="p-4">
          <button
            onClick={() => setShowAssetForm(p => !p)}
            className="w-full flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200"
          >
            <span className="flex items-center gap-2"><Coins className="w-4 h-4 text-amber-500" /> Enter Your Assets & Liabilities</span>
            {showAssetForm ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          <AnimatePresence>
            {showAssetForm && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Assets (add)</p>
                  {ASSET_FIELDS.map(f => (
                    <div key={f.key} className="flex items-center gap-2">
                      <span className="text-lg w-7 flex-shrink-0">{f.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">{f.label}</p>
                        <p className="text-[10px] text-slate-400">{f.hint}</p>
                      </div>
                      <div className="relative w-28 flex-shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{sym}</span>
                        <Input
                          type="number" min="0" placeholder="0"
                          value={assets[f.key] || ''}
                          onChange={e => updateAsset(f.key, e.target.value)}
                          className="pl-5 h-8 text-sm text-right"
                        />
                      </div>
                    </div>
                  ))}

                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide pt-2">Deductibles (subtract)</p>
                  {DEDUCTIBLE_FIELDS.map(f => (
                    <div key={f.key} className="flex items-center gap-2">
                      <span className="text-lg w-7 flex-shrink-0">{f.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">{f.label}</p>
                        <p className="text-[10px] text-slate-400">{f.hint}</p>
                      </div>
                      <div className="relative w-28 flex-shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{sym}</span>
                        <Input
                          type="number" min="0" placeholder="0"
                          value={assets[f.key] || ''}
                          onChange={e => updateAsset(f.key, e.target.value)}
                          className="pl-5 h-8 text-sm text-right"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Pay Zakat CTA */}
      {calc.meetsNisab && calc.remaining > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 p-4 text-white">
          <p className="font-bold text-sm mb-1">Pay Your Zakat Now</p>
          <p className="text-xs text-white/80 mb-3">Record a Zakat payment of {sym}{calc.remaining.toFixed(0)} to complete your obligation</p>
          <div className="flex gap-2">
            <Input
              type="number" placeholder={`${sym}${calc.remaining.toFixed(0)}`}
              className="bg-white/20 border-white/30 text-white placeholder-white/60 flex-1 h-9"
              id="zakat-pay-input"
            />
            <Button
              onClick={() => {
                const val = document.getElementById('zakat-pay-input')?.value || calc.remaining;
                if (!val || parseFloat(val) <= 0) { toast.error('Enter a valid amount'); return; }
                zakatMutation.mutate(val);
              }}
              disabled={zakatMutation.isPending}
              className="bg-white text-amber-700 hover:bg-amber-50 font-bold h-9"
            >
              {zakatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record'}
            </Button>
          </div>
        </div>
      )}

      {/* Sadaqa Logger */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Sadaqa Log</span>
              <Badge className="bg-rose-50 text-rose-600 border-rose-200 text-[10px]">{sym}{sadaqaPaid.toFixed(0)} this year</Badge>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowSadaqa(p => !p)} className="h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" /> Give Sadaqa
            </Button>
          </div>

          <AnimatePresence>
            {showSadaqa && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-3 pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">Allocate to:</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {CHARITABLE_GOALS.map(g => (
                        <button key={g.label}
                          onClick={() => setSadaqaForm(p => ({ ...p, goal: g.label }))}
                          className={`text-center p-2 rounded-xl text-[10px] font-semibold transition-all ${sadaqaForm.goal === g.label ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-50'}`}
                        >
                          <div className="text-base mb-0.5">{g.emoji}</div>
                          <div className="leading-tight">{g.label.split(' ').slice(0, 2).join(' ')}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{sym}</span>
                      <Input type="number" placeholder="Amount" value={sadaqaForm.amount}
                        onChange={e => setSadaqaForm(p => ({ ...p, amount: e.target.value }))}
                        className="pl-5 h-9" />
                    </div>
                    <Input placeholder="Note (optional)" value={sadaqaForm.notes}
                      onChange={e => setSadaqaForm(p => ({ ...p, notes: e.target.value }))}
                      className="flex-1 h-9 text-sm" />
                  </div>
                  <Button
                    onClick={() => { if (!sadaqaForm.amount) { toast.error('Enter amount'); return; } sadaqaMutation.mutate(sadaqaForm); }}
                    disabled={sadaqaMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-9"
                  >
                    {sadaqaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Heart className="w-4 h-4 mr-2" />}
                    {sadaqaMutation.isPending ? 'Saving…' : 'Log Sadaqa'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent charity log */}
          {charityLogs.length > 0 && (
            <div className="space-y-1.5">
              {charityLogs.map(e => (
                <div key={e.id} className="flex items-center gap-2 text-xs">
                  <span className="text-base">{e.type === 'zakat' ? '⚖️' : '🤲'}</span>
                  <span className="flex-1 text-slate-600 dark:text-slate-400 truncate">{e.description || e.type}</span>
                  <span className="font-bold text-emerald-600">{sym}{(e.amount || 0).toFixed(0)}</span>
                  <span className="text-slate-400">{e.date}</span>
                </div>
              ))}
            </div>
          )}
          {charityLogs.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">No Zakat or Sadaqa recorded yet this year.</p>
          )}
        </CardContent>
      </Card>

      {/* AI Islamic Finance Advice */}
      <Card className="border-teal-100 dark:border-teal-900 bg-gradient-to-br from-teal-50/50 to-emerald-50/30 dark:from-teal-950/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-bold text-teal-800 dark:text-teal-200">Islamic Finance AI Guidance</span>
            </div>
            <Button size="sm" variant="outline" onClick={getAIAdvice} disabled={aiLoading}
              className="h-7 text-xs border-teal-200 text-teal-700 hover:bg-teal-50">
              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
              {aiLoading ? '' : 'Get Advice'}
            </Button>
          </div>
          {aiAdvice ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-teal-700 dark:text-teal-300 leading-relaxed">
              {aiAdvice}
            </motion.p>
          ) : (
            <p className="text-xs text-teal-600/60">Tap "Get Advice" for personalised Zakat and Sadaqa guidance based on your financial data.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}