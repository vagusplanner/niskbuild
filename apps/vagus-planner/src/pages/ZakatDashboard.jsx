import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Save, History, Download, ArrowLeft, RefreshCw,
  TrendingUp, Calculator, Heart, AlertTriangle, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

import NisabStatusCard from '@/components/zakat/NisabStatusCard';
import AssetInputPanel from '@/components/zakat/AssetInputPanel';
import ZakatCharityLinks from '@/components/zakat/ZakatCharityLinks';

const CURRENCIES = ['GBP', 'USD', 'EUR', 'AED', 'SAR', 'MYR', 'PKR'];

const DEFAULT_ASSETS = {
  cash_savings: '', gold_value: '', silver_value: '', investments: '',
  business_assets: '', receivables: '', liabilities: ''
};

// Fallback prices (in USD per gram) if API fails
const FALLBACK_PRICES = { gold: 95, silver: 1.05 };

// Exchange rates to convert from USD (approximate, updated regularly)
const USD_RATES = { GBP: 0.79, USD: 1, EUR: 0.92, AED: 3.67, SAR: 3.75, MYR: 4.72, PKR: 278 };

function GoldSilverCalculator({ goldPricePerGram, silverPricePerGram, priceLoading, goldValue, silverValue, onApply, fmt }) {
  const [goldGrams, setGoldGrams] = useState('');
  const [silverGrams, setSilverGrams] = useState('');
  if (goldValue > 0 && silverValue > 0) return null;
  if (priceLoading || !goldPricePerGram) return null;
  const goldVal = (parseFloat(goldGrams) || 0) * goldPricePerGram;
  const silverVal = (parseFloat(silverGrams) || 0) * silverPricePerGram;
  return (
    <div className="bg-amber-400/8 border border-amber-400/20 rounded-2xl p-4">
      <p className="text-xs font-bold text-amber-400 mb-2">💡 Gold & Silver Calculator</p>
      <p className="text-xs text-white/60 mb-3">Don't know the value? Enter grams and we'll calculate:</p>
      <div className="grid grid-cols-2 gap-3">
        {[['Gold', '🥇', goldGrams, setGoldGrams, goldVal, 'gold_value', goldPricePerGram],
          ['Silver', '🥈', silverGrams, setSilverGrams, silverVal, 'silver_value', silverPricePerGram]].map(([metal, emoji, grams, setGrams, val, key]) => (
          <div key={metal} className="flex flex-col gap-1.5">
            <label className="text-[10px] text-amber-400/70 font-bold uppercase">{emoji} {metal} (grams)</label>
            <div className="flex gap-1">
              <input type="number" value={grams} onChange={e => setGrams(e.target.value)} placeholder="0g"
                className="flex-1 bg-white/5 border border-amber-400/20 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-400/50" />
              {val > 0 && (
                <button onClick={() => { onApply(key, val.toFixed(2)); setGrams(''); }}
                  className="px-2 py-1 bg-amber-400 text-[#071224] text-xs font-bold rounded-lg">✓</button>
              )}
            </div>
            {val > 0 && <p className="text-[10px] text-amber-300">{fmt(val)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ZakatDashboard() {
  const qc = useQueryClient();
  const [assets, setAssets] = useState(DEFAULT_ASSETS);
  const [currency, setCurrency] = useState('GBP');
  const [goldPricePerGram, setGoldPricePerGram] = useState(null);
  const [silverPricePerGram, setSilverPricePerGram] = useState(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('calculator');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: zakatHistory = [] } = useQuery({
    queryKey: ['zakatHistory'],
    queryFn: () => base44.entities.ZakatTracking.list('-snapshot_date', 20),
  });

  const fetchPrices = useCallback(async () => {
    setPriceLoading(true);
    try {
      // Use LLM to get real-time prices since we don't have a metals API key
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Get the current live gold and silver spot prices in USD per troy ounce as of today ${format(new Date(), 'yyyy-MM-dd')}. Return only the numeric values. A troy ounce is 31.1035 grams.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            gold_per_troy_oz_usd: { type: 'number' },
            silver_per_troy_oz_usd: { type: 'number' },
            source: { type: 'string' },
            as_of: { type: 'string' },
          }
        }
      });
      const rate = USD_RATES[currency] || 1;
      const goldPerGram = (result.gold_per_troy_oz_usd / 31.1035) * rate;
      const silverPerGram = (result.silver_per_troy_oz_usd / 31.1035) * rate;
      setGoldPricePerGram(parseFloat(goldPerGram.toFixed(4)));
      setSilverPricePerGram(parseFloat(silverPerGram.toFixed(4)));
      toast.success(`✅ Live prices loaded (${result.as_of || 'today'})`);
    } catch (e) {
      // Fallback
      const rate = USD_RATES[currency] || 1;
      setGoldPricePerGram(parseFloat((FALLBACK_PRICES.gold * rate).toFixed(4)));
      setSilverPricePerGram(parseFloat((FALLBACK_PRICES.silver * rate).toFixed(4)));
      toast.warning('Using approximate prices — check connection for live rates');
    }
    setPriceLoading(false);
  }, [currency]);

  useEffect(() => { fetchPrices(); }, [currency]);

  const handleAssetChange = (key, value) => {
    setAssets(prev => ({ ...prev, [key]: value }));
  };

  // Calculations
  const num = (k) => parseFloat(assets[k]) || 0;
  const totalAssets = num('cash_savings') + num('gold_value') + num('silver_value') +
    num('investments') + num('business_assets') + num('receivables');
  const liabilities = num('liabilities');
  const totalWealth = Math.max(0, totalAssets - liabilities);
  const nisabSilver = 595 * (silverPricePerGram || 0);
  const nisabGold = 85 * (goldPricePerGram || 0);
  const meetsNisab = totalWealth >= nisabSilver && nisabSilver > 0;
  const zakatDue = meetsNisab ? totalWealth * 0.025 : 0;

  const fmt = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n || 0);

  const saveSnapshot = async () => {
    setSaving(true);
    try {
      await base44.entities.ZakatTracking.create({
        snapshot_date: format(new Date(), 'yyyy-MM-dd'),
        cash_savings: num('cash_savings'),
        investments: num('investments'),
        gold_value: num('gold_value'),
        silver_value: num('silver_value'),
        business_assets: num('business_assets'),
        receivables: num('receivables'),
        liabilities: num('liabilities'),
        total_zakatable_wealth: totalWealth,
        zakat_due: zakatDue,
        nisab_threshold: nisabSilver,
        meets_nisab: meetsNisab,
        currency,
        source: 'manual',
        notes: `Calculated via Zakat Dashboard. Gold: ${fmt(num('gold_value'))}, Silver: ${fmt(num('silver_value'))}, Cash: ${fmt(num('cash_savings'))}`,
      });
      qc.invalidateQueries(['zakatHistory']);
      toast.success('✅ Zakat snapshot saved!');
    } catch (_) { toast.error('Failed to save'); }
    setSaving(false);
  };

  const exportReport = () => {
    const lines = [
      'VAGUS PLANNER — ZAKAT REPORT',
      `Date: ${format(new Date(), 'dd MMMM yyyy')}`,
      `Currency: ${currency}`,
      '',
      '=== ASSETS ===',
      `Cash & Savings:      ${fmt(num('cash_savings'))}`,
      `Gold (market value): ${fmt(num('gold_value'))}`,
      `Silver:              ${fmt(num('silver_value'))}`,
      `Investments:         ${fmt(num('investments'))}`,
      `Business Assets:     ${fmt(num('business_assets'))}`,
      `Receivables:         ${fmt(num('receivables'))}`,
      '',
      '=== DEDUCTIONS ===',
      `Liabilities:         ${fmt(num('liabilities'))}`,
      '',
      '=== CALCULATION ===',
      `Total Zakatable Wealth: ${fmt(totalWealth)}`,
      `Nisab Threshold (Silver 595g): ${fmt(nisabSilver)}`,
      `Meets Nisab: ${meetsNisab ? 'YES' : 'NO'}`,
      `Zakat Due (2.5%): ${fmt(zakatDue)}`,
      '',
      `Gold price per gram: ${fmt(goldPricePerGram)} | Silver price per gram: ${fmt(silverPricePerGram)}`,
      '',
      'JazakAllah Khair — May Allah accept your Zakat.',
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `zakat-report-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    toast.success('Report downloaded!');
  };

  const TABS = [
    { id: 'calculator', label: '🧮 Calculator', icon: Calculator },
    { id: 'charities', label: '🤲 Pay Zakat', icon: Heart },
    { id: 'history', label: '📊 History', icon: History },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-3 sm:px-5 py-4 lg:py-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-900/40 via-yellow-900/30 to-amber-800/20 border border-amber-400/30 p-6 shadow-2xl">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23E8B84B' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">🕌</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full uppercase tracking-widest">Islamic Finance</span>
                      <span className="text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full">Live Prices</span>
                    </div>
                  </div>
                </div>
                <h1 className="text-3xl font-black text-white mb-1">Zakat Dashboard</h1>
                <p className="text-white/60 text-sm">Real-time Nisab · Auto calculation · Verified charity payment links</p>
              </div>
              {/* Currency selector */}
              <div className="flex flex-col items-end gap-2">
                <div className="relative">
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="appearance-none bg-amber-400/10 border border-amber-400/30 text-amber-300 font-bold text-sm rounded-xl px-4 py-2 pr-8 focus:outline-none cursor-pointer">
                    {CURRENCIES.map(c => <option key={c} value={c} className="bg-[#071224]">{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400 pointer-events-none" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportReport} className="border-white/20 text-white/70 hover:text-white bg-transparent h-8 text-xs gap-1">
                    <Download className="w-3 h-3" /> Export
                  </Button>
                  <Button size="sm" onClick={saveSnapshot} disabled={saving} className="bg-amber-400 hover:bg-amber-500 text-[#071224] font-bold h-8 text-xs gap-1">
                    <Save className="w-3 h-3" /> {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Nisab Status — always visible */}
        <NisabStatusCard
          goldPricePerGram={goldPricePerGram || 0}
          silverPricePerGram={silverPricePerGram || 0}
          totalWealth={totalWealth}
          zakatDue={zakatDue}
          loading={priceLoading}
          onRefresh={fetchPrices}
          currency={currency}
        />

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl">
          {TABS.map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === id ? 'bg-amber-400 text-[#071224] shadow-sm' : 'text-white/50 hover:text-white'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* CALCULATOR TAB */}
          {activeTab === 'calculator' && (
            <motion.div key="calc" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-5">
                <h3 className="text-sm font-black text-white/70 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" /> Enter Your Assets
                </h3>
                <AssetInputPanel assets={assets} onChange={handleAssetChange} currency={currency} />
              </div>

              {/* Summary breakdown */}
              <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-5 space-y-3">
                <h3 className="text-sm font-black text-white/70 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Calculation Breakdown
                </h3>
                {[
                  ['Cash & Savings', num('cash_savings'), 'emerald'],
                  ['Gold', num('gold_value'), 'yellow'],
                  ['Silver', num('silver_value'), 'slate'],
                  ['Investments', num('investments'), 'blue'],
                  ['Business Assets', num('business_assets'), 'purple'],
                  ['Receivables', num('receivables'), 'teal'],
                ].map(([label, val, col]) => val > 0 && (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-sm text-white/60">{label}</span>
                    <span className="text-sm font-bold text-white">{fmt(val)}</span>
                  </div>
                ))}
                {liabilities > 0 && (
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-sm text-red-400/80">Less: Liabilities</span>
                    <span className="text-sm font-bold text-red-400">− {fmt(liabilities)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 bg-white/5 rounded-xl px-3 mt-2">
                  <span className="text-sm font-bold text-white">Total Zakatable Wealth</span>
                  <span className="text-sm font-black text-white">{fmt(totalWealth)}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3">
                  <span className="text-base font-black text-amber-300">Zakat Due (2.5%)</span>
                  <span className="text-xl font-black text-amber-400">{fmt(zakatDue)}</span>
                </div>
                {!meetsNisab && totalWealth > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mt-2">
                    <AlertTriangle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-300/80 leading-relaxed">
                      Your wealth ({fmt(totalWealth)}) is below the Nisab threshold ({fmt(nisabSilver)}). Zakat is not yet obligatory, but Sadaqah (voluntary charity) is always encouraged.
                    </p>
                  </div>
                )}
                {zakatDue > 0 && (
                  <Button onClick={() => setActiveTab('charities')} className="w-full bg-amber-400 hover:bg-amber-500 text-[#071224] font-bold mt-2 gap-2">
                    <Heart className="w-4 h-4" /> Pay {fmt(zakatDue)} Zakat Now
                  </Button>
                )}
              </div>

              {/* Gold/Silver helper */}
              <GoldSilverCalculator
                goldPricePerGram={goldPricePerGram}
                silverPricePerGram={silverPricePerGram}
                priceLoading={priceLoading}
                goldValue={num('gold_value')}
                silverValue={num('silver_value')}
                onApply={handleAssetChange}
                fmt={fmt}
              />
            </motion.div>
          )}

          {/* CHARITIES TAB */}
          {activeTab === 'charities' && (
            <motion.div key="charities" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-white/[0.02] border border-white/10 rounded-3xl p-5">
              <ZakatCharityLinks zakatDue={zakatDue} currency={currency} />
            </motion.div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-white/[0.02] border border-white/10 rounded-3xl p-5 space-y-4">
              <h3 className="text-sm font-black text-white/70 uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" /> Zakat History
              </h3>
              {zakatHistory.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-white/30 text-sm">No saved snapshots yet.</p>
                  <p className="text-white/20 text-xs mt-1">Calculate your Zakat and tap Save to create a record.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {zakatHistory.map(snap => (
                    <div key={snap.id} className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/8 rounded-2xl hover:border-white/15 transition-all">
                      <div>
                        <p className="text-sm font-bold text-white">{snap.snapshot_date}</p>
                        <p className="text-xs text-white/40 mt-0.5">
                          Wealth: {new Intl.NumberFormat('en-GB', { style: 'currency', currency: snap.currency || 'GBP', maximumFractionDigits: 0 }).format(snap.total_zakatable_wealth || 0)}
                          {' · '}{snap.currency || 'GBP'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-amber-400">
                          {new Intl.NumberFormat('en-GB', { style: 'currency', currency: snap.currency || 'GBP', maximumFractionDigits: 2 }).format(snap.zakat_due || 0)}
                        </p>
                        <p className="text-[10px] text-white/30">Zakat due</p>
                      </div>
                      <div className={`ml-3 w-2.5 h-2.5 rounded-full flex-shrink-0 ${snap.meets_nisab ? 'bg-amber-400' : 'bg-slate-600'}`} />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fiqh note */}
        <div className="bg-blue-500/8 border border-blue-500/15 rounded-2xl p-4">
          <p className="text-xs text-blue-300/80 leading-relaxed">
            <strong className="text-blue-300">Scholarly Note:</strong> Zakat calculations are based on the silver Nisab (595g silver) which is the lower and more inclusive threshold used by many contemporary scholars. Gold Nisab (85g gold = {fmt(nisabGold)}) is also shown for reference. All calculations are 2.5% of net zakatable wealth held for one lunar year (Hawl). Please consult a qualified scholar for your specific situation.
          </p>
        </div>
      </div>
    </div>
  );
}