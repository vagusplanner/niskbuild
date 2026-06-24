import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Zap, Clock, CheckCircle2, AlertCircle,
  RefreshCw, Sparkles, Calendar, ChevronDown, ChevronUp, Plus, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CURRENCY = localStorage.getItem('vagus_currency') || 'USD';

function WealthTrendChart({ snapshots }) {
  if (snapshots.length < 2) return null;
  const last6 = snapshots.slice(-6);
  const max = Math.max(...last6.map(s => s.total_zakatable_wealth), 1);
  return (
    <div className="flex items-end gap-1 h-14">
      {last6.map((s, i) => {
        const h = Math.max(4, (s.total_zakatable_wealth / max) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={cn('w-full rounded-t-sm transition-all', s.meets_nisab ? 'bg-emerald-500' : 'bg-amber-400')}
              style={{ height: `${h}%` }}
            />
            <span className="text-[8px] text-slate-400">{s.snapshot_date?.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

function SuggestionCard({ suggestion, index }) {
  const urgencyColor = { high: 'bg-red-100 text-red-700 border-red-200', medium: 'bg-amber-100 text-amber-700 border-amber-200', low: 'bg-blue-100 text-blue-700 border-blue-200' };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
      className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{suggestion.time}</p>
        </div>
        <Badge className={cn('text-[10px] border capitalize', urgencyColor[suggestion.urgency] || urgencyColor.medium)}>
          {suggestion.urgency}
        </Badge>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{suggestion.reason}</p>
      {suggestion.recommended_amount && (
        <div className="flex items-center gap-1.5 pt-1">
          <Heart className="w-3 h-3 text-pink-500" />
          <span className="text-xs font-semibold text-pink-600 dark:text-pink-400">Suggested: {suggestion.recommended_amount}</span>
        </div>
      )}
    </motion.div>
  );
}

function ManualSnapshotForm({ onSave, onClose }) {
  const [form, setForm] = useState({ cash_savings: '', investments: '', gold_value: '', silver_value: '', business_assets: '', receivables: '', liabilities: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const num = v => parseFloat(v) || 0;
  const nisabThreshold = 595 * 0.80;
  const totalWealth = num(form.cash_savings) + num(form.investments) + num(form.gold_value) + num(form.silver_value) + num(form.business_assets) + num(form.receivables) - num(form.liabilities);
  const meetsNisab = totalWealth >= nisabThreshold;
  const zakatDue = meetsNisab ? totalWealth * 0.025 : 0;

  const queryClient = useQueryClient();
  const saveMutation = useMutation({
    mutationFn: () => SDK.entities.ZakatTracking.create({
      snapshot_date: new Date().toISOString().split('T')[0],
      cash_savings: num(form.cash_savings),
      investments: num(form.investments),
      gold_value: num(form.gold_value),
      silver_value: num(form.silver_value),
      business_assets: num(form.business_assets),
      receivables: num(form.receivables),
      liabilities: num(form.liabilities),
      total_zakatable_wealth: Math.round(totalWealth * 100) / 100,
      zakat_due: Math.round(zakatDue * 100) / 100,
      nisab_threshold: Math.round(nisabThreshold * 100) / 100,
      meets_nisab: meetsNisab,
      currency: CURRENCY,
      source: 'manual',
      hawl_start_date: meetsNisab ? new Date().toISOString().split('T')[0] : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zakatSnapshots'] });
      toast.success('Wealth snapshot saved');
      onSave();
    }
  });

  const fields = [
    { label: 'Cash & Savings', key: 'cash_savings' }, { label: 'Investments', key: 'investments' },
    { label: 'Gold value', key: 'gold_value' }, { label: 'Silver value', key: 'silver_value' },
    { label: 'Business assets', key: 'business_assets' }, { label: 'Receivables', key: 'receivables' },
    { label: 'Liabilities / Debts', key: 'liabilities' }
  ];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {fields.map(f => (
          <div key={f.key}>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">{f.label}</label>
            <Input type="number" min="0" placeholder="0" value={form[f.key]} onChange={e => set(f.key, e.target.value)} className="h-8 text-sm" />
          </div>
        ))}
      </div>
      <div className={cn('rounded-xl p-3 text-sm font-bold text-center', meetsNisab ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300')}>
        {meetsNisab ? `✅ Zakat Due: ${CURRENCY} ${zakatDue.toFixed(2)}` : `⏳ Below Nisab threshold (${CURRENCY} ${nisabThreshold.toFixed(2)})`}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1 h-8 text-xs">Cancel</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
          {saveMutation.isPending ? 'Saving…' : 'Save Snapshot'}
        </Button>
      </div>
    </div>
  );
}

export default function AutoZakatTracker() {
  const [showForm, setShowForm] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingAutoSnap, setLoadingAutoSnap] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const queryClient = useQueryClient();

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['zakatSnapshots'],
    queryFn: async () => {
      const all = await SDK.entities.ZakatTracking.list('-snapshot_date', 30);
      return all;
    }
  });

  const latest = snapshots[0];
  const prev = snapshots[1];

  const wealthChange = latest && prev
    ? ((latest.total_zakatable_wealth - prev.total_zakatable_wealth) / Math.max(prev.total_zakatable_wealth, 1)) * 100
    : null;

  const hawlStartDate = latest?.hawl_start_date ? new Date(latest.hawl_start_date) : null;
  const hawlEndDate = hawlStartDate ? new Date(hawlStartDate.getTime() + 354 * 24 * 60 * 60 * 1000) : null; // 354 days = lunar year
  const daysUntilHawl = hawlEndDate ? Math.max(0, Math.ceil((hawlEndDate - new Date()) / (24 * 60 * 60 * 1000))) : null;

  const handleAutoSnapshot = async () => {
    setLoadingAutoSnap(true);
    try {
      const res = await SDK.functions.invoke('autoZakatAnalysis', { action: 'auto_snapshot', currency: CURRENCY });
      queryClient.invalidateQueries({ queryKey: ['zakatSnapshots'] });
      toast.success(`Auto-snapshot saved! Net change: ${CURRENCY} ${res.data?.netSavingsChange?.toFixed(2) || 0}`);
    } catch (e) {
      toast.error('Could not auto-snapshot. Try manual entry.');
    }
    setLoadingAutoSnap(false);
  };

  const handleGetSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await SDK.functions.invoke('autoZakatAnalysis', { action: 'get_suggestions', currency: CURRENCY });
      setSuggestions(res.data?.suggestions);
    } catch (e) {
      toast.error('Could not generate suggestions.');
    }
    setLoadingSuggestions(false);
  };

  const markZakatPaid = useMutation({
    mutationFn: (snapshotId) => SDK.entities.ZakatTracking.update(snapshotId, {
      zakat_paid: true,
      zakat_paid_date: new Date().toISOString().split('T')[0],
      zakat_paid_amount: latest?.zakat_due || 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zakatSnapshots'] });
      toast.success('Zakat marked as paid! May Allah accept it. 🤲');
    }
  });

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-slate-900 px-5 py-4 border-b border-amber-100 dark:border-amber-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-slate-100">Auto Zakat Tracker</h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">Wealth monitoring · Hawl tracking · Optimal giving times</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleAutoSnapshot} disabled={loadingAutoSnap}
              className="h-8 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300">
              {loadingAutoSnap ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              <span className="ml-1 hidden sm:inline">Auto-Sync</span>
            </Button>
            <Button size="sm" onClick={() => setShowForm(v => !v)}
              className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white">
              <Plus className="w-3 h-3 mr-1" /> Manual
            </Button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* Manual snapshot form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <ManualSnapshotForm onSave={() => setShowForm(false)} onClose={() => setShowForm(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          </div>
        ) : !latest ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
              <Zap className="w-7 h-7 text-amber-500" />
            </div>
            <p className="font-bold text-slate-700 dark:text-slate-200">No wealth snapshots yet</p>
            <p className="text-xs text-slate-400">Click "Auto-Sync" to import from your expense logs, or add manually.</p>
          </div>
        ) : (
          <>
            {/* Current wealth status */}
            <div className={cn('rounded-2xl p-4', latest.meets_nisab ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40' : 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40')}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Current Zakatable Wealth</span>
                {wealthChange !== null && (
                  <div className={cn('flex items-center gap-1 text-xs font-semibold', wealthChange >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {wealthChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(wealthChange).toFixed(1)}%
                  </div>
                )}
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {CURRENCY} {(latest.total_zakatable_wealth || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-4 mt-2">
                {latest.meets_nisab ? (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      Zakat Due: {CURRENCY} {(latest.zakat_due || 0).toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-amber-600 dark:text-amber-400">Below Nisab — no Zakat yet</span>
                  </div>
                )}
              </div>
              {latest.meets_nisab && !latest.zakat_paid && (
                <Button size="sm" onClick={() => markZakatPaid.mutate(latest.id)} disabled={markZakatPaid.isPending}
                  className="mt-3 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Zakat Paid
                </Button>
              )}
              {latest.zakat_paid && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Zakat paid on {latest.zakat_paid_date} — May Allah accept it 🤲
                </div>
              )}
            </div>

            {/* Hawl countdown */}
            {hawlStartDate && daysUntilHawl !== null && (
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50 dark:bg-indigo-950/20 p-3 flex items-center gap-3">
                <Clock className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Hawl Countdown</p>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400">
                    {daysUntilHawl > 0 ? `${daysUntilHawl} days until your Hawl completes (${hawlEndDate?.toLocaleDateString()})` : '⚡ Hawl complete — Zakat is now due!'}
                  </p>
                </div>
              </div>
            )}

            {/* Wealth trend chart */}
            {snapshots.length > 1 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Wealth Trend</p>
                <WealthTrendChart snapshots={[...snapshots].reverse()} />
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald-500" /><span className="text-[10px] text-slate-400">Meets Nisab</span></div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-amber-400" /><span className="text-[10px] text-slate-400">Below Nisab</span></div>
                </div>
              </div>
            )}

            {/* History toggle */}
            {snapshots.length > 1 && (
              <div>
                <button onClick={() => setShowHistory(v => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                  {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showHistory ? 'Hide' : 'Show'} History ({snapshots.length} snapshots)
                </button>
                <AnimatePresence>
                  {showHistory && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="mt-2 space-y-2 overflow-hidden">
                      {snapshots.slice(0, 8).map((s, i) => (
                        <div key={s.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                          <span className="text-slate-500">{s.snapshot_date}</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{CURRENCY} {s.total_zakatable_wealth?.toFixed(2)}</span>
                          <div className="flex items-center gap-1.5">
                            {s.meets_nisab ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[9px]">Nisab Met</Badge> : <Badge className="bg-amber-100 text-amber-700 border-0 text-[9px]">Below</Badge>}
                            {s.zakat_paid && <Badge className="bg-blue-100 text-blue-700 border-0 text-[9px]">Paid</Badge>}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* AI Optimal Giving Suggestions */}
        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Optimal Giving Times</span>
            </div>
            <Button size="sm" variant="outline" onClick={handleGetSuggestions} disabled={loadingSuggestions}
              className="h-7 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300">
              {loadingSuggestions ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
              {loadingSuggestions ? 'Analysing…' : 'Get AI Suggestions'}
            </Button>
          </div>

          {suggestions ? (
            <div className="space-y-3">
              {suggestions.wealth_observation && (
                <div className="rounded-xl p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800/30">
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">💡 {suggestions.wealth_observation}</p>
                </div>
              )}
              {suggestions.hawl_status && (
                <div className="rounded-xl p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800/30">
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">🕐 {suggestions.hawl_status}</p>
                </div>
              )}
              {(suggestions.suggestions || []).map((s, i) => (
                <SuggestionCard key={i} suggestion={s} index={i} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">AI will suggest the best times to give Zakat based on the Islamic calendar and your wealth trend.</p>
          )}
        </div>

      </div>
    </div>
  );
}