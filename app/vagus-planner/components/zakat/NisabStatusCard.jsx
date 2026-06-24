import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, RefreshCw, Scale } from 'lucide-react';

export default function NisabStatusCard({ goldPricePerGram, silverPricePerGram, totalWealth, zakatDue, loading, onRefresh, currency }) {
  // Nisab = 85g gold OR 595g silver (lower of two used as threshold per most scholars)
  const nisabGold = 85 * goldPricePerGram;
  const nisabSilver = 595 * silverPricePerGram;
  const nisabUsed = nisabSilver; // More accessible threshold (lower value)
  const meetsNisab = totalWealth >= nisabUsed;
  const progressPct = nisabUsed > 0 ? Math.min((totalWealth / nisabUsed) * 100, 200) : 0;

  const fmt = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP', maximumFractionDigits: 2 }).format(n || 0);

  return (
    <div className={`relative overflow-hidden rounded-3xl border-2 p-6 ${meetsNisab ? 'border-amber-400/60 bg-gradient-to-br from-amber-900/20 to-yellow-900/10' : 'border-slate-600/40 bg-gradient-to-br from-slate-900/40 to-slate-800/20'}`}>
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none"
        style={{ background: meetsNisab ? 'rgba(232,184,75,0.08)' : 'rgba(100,116,139,0.06)' }} />

      <div className="flex items-start justify-between mb-5">
        <div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black mb-3 ${meetsNisab ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'}`}>
            {meetsNisab ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {meetsNisab ? 'Zakat is Due' : 'Below Nisab Threshold'}
          </div>
          <h2 className="text-2xl font-black text-white">Nisab Status</h2>
          <p className="text-white/50 text-xs mt-1">Based on silver threshold (595g) — most accessible</p>
        </div>
        <button onClick={onRefresh} disabled={loading}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
          <RefreshCw className={`w-4 h-4 text-white/60 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-white/50 mb-2">
          <span>Your Zakatable Wealth</span>
          <span className={meetsNisab ? 'text-amber-400 font-bold' : 'text-slate-400'}>{Math.round(progressPct)}% of Nisab</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(progressPct, 100)}%` }} transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full rounded-full ${meetsNisab ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-slate-500 to-slate-400'}`} />
        </div>
      </div>

      {/* Key figures */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 border border-white/8 text-center">
          <p className="text-[10px] text-white/40 font-semibold uppercase tracking-widest mb-1">Your Wealth</p>
          <p className="text-base font-black text-white">{fmt(totalWealth)}</p>
        </div>
        <div className="bg-amber-400/10 rounded-2xl p-3 border border-amber-400/20 text-center">
          <p className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-widest mb-1">Zakat Due</p>
          <p className="text-base font-black text-amber-400">{fmt(zakatDue)}</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 border border-white/8 text-center">
          <p className="text-[10px] text-white/40 font-semibold uppercase tracking-widest mb-1">Nisab (Silver)</p>
          <p className="text-base font-black text-white/70">{fmt(nisabUsed)}</p>
        </div>
      </div>

      {/* Live prices */}
      <div className="flex gap-3">
        <div className="flex items-center gap-2 flex-1 bg-yellow-400/8 border border-yellow-400/15 rounded-xl px-3 py-2">
          <span className="text-lg">🥇</span>
          <div>
            <p className="text-[9px] text-yellow-400/70 font-bold uppercase">Gold /g</p>
            <p className="text-sm font-black text-yellow-300">{loading ? '...' : fmt(goldPricePerGram)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1 bg-slate-400/8 border border-slate-400/15 rounded-xl px-3 py-2">
          <span className="text-lg">🥈</span>
          <div>
            <p className="text-[9px] text-slate-400/70 font-bold uppercase">Silver /g</p>
            <p className="text-sm font-black text-slate-300">{loading ? '...' : fmt(silverPricePerGram)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1 bg-blue-400/8 border border-blue-400/15 rounded-xl px-3 py-2">
          <Scale className="w-4 h-4 text-blue-400/70 flex-shrink-0" />
          <div>
            <p className="text-[9px] text-blue-400/70 font-bold uppercase">Zakat Rate</p>
            <p className="text-sm font-black text-blue-300">2.5%</p>
          </div>
        </div>
      </div>

      {meetsNisab && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-amber-400/10 border border-amber-400/25 rounded-2xl">
          <p className="text-xs text-amber-300/90 text-center font-semibold">
            🤲 "Take from their wealth a charity by which you cleanse them" — Quran 9:103
          </p>
        </motion.div>
      )}
    </div>
  );
}