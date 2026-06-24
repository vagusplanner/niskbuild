import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, Users, Loader2, Calculator, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const HEIRS = [
  { id: 'spouse_wife', label: 'Wife/Wives', group: 'Spouse' },
  { id: 'spouse_husband', label: 'Husband', group: 'Spouse' },
  { id: 'son', label: 'Son(s)', group: 'Children' },
  { id: 'daughter', label: 'Daughter(s)', group: 'Children' },
  { id: 'father', label: 'Father', group: 'Parents' },
  { id: 'mother', label: 'Mother', group: 'Parents' },
  { id: 'paternal_grandfather', label: 'Paternal Grandfather', group: 'Grandparents' },
  { id: 'paternal_grandmother', label: 'Paternal Grandmother', group: 'Grandparents' },
  { id: 'brother_full', label: 'Full Brother(s)', group: 'Siblings' },
  { id: 'sister_full', label: 'Full Sister(s)', group: 'Siblings' },
  { id: 'brother_paternal', label: 'Paternal Half-Brother(s)', group: 'Siblings' },
  { id: 'sister_paternal', label: 'Paternal Half-Sister(s)', group: 'Siblings' },
];

const GROUPS = ['Spouse', 'Children', 'Parents', 'Grandparents', 'Siblings'];

export default function IslamicInheritanceCalculator() {
  const [estate, setEstate] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [heirs, setHeirs] = useState({});
  const [debts, setDebts] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeHeirs = Object.entries(heirs).filter(([, count]) => count > 0);

  const calculate = async () => {
    if (!estate || activeHeirs.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const heirsList = activeHeirs.map(([id, count]) => {
        const h = HEIRS.find(h => h.id === id);
        return `${h?.label || id}: ${count}`;
      }).join(', ');

      const netEstate = parseFloat(estate) - parseFloat(debts || 0);

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert in Islamic inheritance law (Fara'id/Mirath). Calculate shares according to Hanafi school (most common).

Estate: ${currency} ${netEstate} (after deducting debts of ${debts || 0})
Heirs: ${heirsList}

Calculate each heir's share as:
1. A fraction (e.g. 1/2, 1/4, 1/6, 2/3)
2. The monetary amount in ${currency}
3. The Quranic basis (which verse, if applicable)

Also provide:
- shares: array of objects { heir, count, fraction, amount, basis }
- total_shares: total parts used
- asaba_heirs: list of residuary (asaba) heirs if any
- blockers: any heirs that block others from inheriting
- notes: any important fiqh notes (max 3)`,
        response_json_schema: {
          type: 'object',
          properties: {
            shares: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  heir: { type: 'string' },
                  count: { type: 'number' },
                  fraction: { type: 'string' },
                  amount: { type: 'number' },
                  basis: { type: 'string' },
                }
              }
            },
            asaba_heirs: { type: 'array', items: { type: 'string' } },
            blockers: { type: 'array', items: { type: 'string' } },
            notes: { type: 'array', items: { type: 'string' } },
          }
        }
      });
      setResult(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-amber-100 dark:border-amber-900 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="px-5 py-4 bg-gradient-to-r from-amber-600 to-orange-600 flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-xl">
          <Scale className="w-5 h-5 text-amber-200" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Islamic Inheritance Calculator</h3>
          <p className="text-xs text-amber-200">Mirath / Farā'iḍ — Quranic distribution</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900 flex gap-2">
          <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">Enter the net estate value and select all living heirs. Calculations follow Hanafi school (most widely used). Consult a scholar for complex cases.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Net Estate Value</label>
            <input type="number" value={estate} onChange={e => setEstate(e.target.value)} placeholder="100000"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="w-full h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option>GBP</option><option>USD</option><option>EUR</option><option>SAR</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 mb-1 block">Outstanding Debts / Funeral Expenses (to deduct)</label>
            <input type="number" value={debts} onChange={e => setDebts(e.target.value)} placeholder="0"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
        </div>

        {/* Heirs selection */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Select Heirs & Count</p>
          {GROUPS.map(group => (
            <div key={group}>
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1.5">{group}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {HEIRS.filter(h => h.group === group).map(heir => (
                  <div key={heir.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                    <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 leading-tight">{heir.label}</span>
                    <input type="number" min="0" max="10" value={heirs[heir.id] || ''} onChange={e => setHeirs(p => ({...p, [heir.id]: parseInt(e.target.value) || 0}))}
                      placeholder="0" className="w-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-amber-400" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Button onClick={calculate} disabled={loading || !estate || activeHeirs.length === 0}
          className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:opacity-90 h-9">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Calculating…</> : <><Calculator className="w-4 h-4 mr-2" />Calculate Inheritance Shares</>}
        </Button>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-amber-200 dark:border-amber-900">
                <table className="w-full text-xs">
                  <thead className="bg-amber-50 dark:bg-amber-950/40">
                    <tr>
                      <th className="text-left px-3 py-2 text-amber-700 dark:text-amber-400 font-bold">Heir</th>
                      <th className="text-center px-2 py-2 text-amber-700 dark:text-amber-400 font-bold">Fraction</th>
                      <th className="text-right px-3 py-2 text-amber-700 dark:text-amber-400 font-bold">Amount ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 dark:divide-amber-900/50">
                    {result.shares?.map((s, i) => (
                      <tr key={i} className="bg-white dark:bg-slate-900">
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{s.heir}{s.count > 1 ? ` ×${s.count}` : ''}</td>
                        <td className="px-2 py-2 text-center font-bold text-amber-700 dark:text-amber-400">{s.fraction}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-800 dark:text-slate-100">{s.amount?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.blockers?.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900 text-xs">
                  <p className="font-bold text-red-600 mb-1">⚠️ Blocking rules apply</p>
                  {result.blockers.map((b, i) => <p key={i} className="text-red-700 dark:text-red-400">• {b}</p>)}
                </div>
              )}
              {result.notes?.map((n, i) => (
                <p key={i} className="text-xs text-slate-500 dark:text-slate-400 pl-3 border-l-2 border-amber-300">📌 {n}</p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}