import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Loader2, Info, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SDK } from '@/lib/custom-sdk.js';

const FIDYAH_TYPES = [
  { id: 'fidyah_missed_fast', label: 'Fidyah — Missed Ramadan Fast (illness/old age)' },
  { id: 'fidyah_late_qada', label: 'Fidyah — Delayed Qada after next Ramadan' },
  { id: 'kaffarah_fast', label: "Kaffarah — Deliberately broken Ramadan fast" },
  { id: 'kaffarah_oath', label: "Kaffarah — Broken oath (Kaffarah Yameen)" },
  { id: 'kaffarah_zihar', label: "Kaffarah — Zihar (unlawful comparison to mother)" },
  { id: 'fidyah_hajj', label: 'Fidyah — Missed Hajj obligation/ritual' },
];

export default function FidyahKaffarahCalculator() {
  const [type, setType] = useState(FIDYAH_TYPES[0].id);
  const [days, setDays] = useState('');
  const [country, setCountry] = useState('UK');
  const [currency, setCurrency] = useState('GBP');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await SDK.integrations.Core.InvokeLLM({
        prompt: `You are an Islamic scholar expert in fiqh (Islamic jurisprudence). Calculate the following Islamic expiation:

Type: ${FIDYAH_TYPES.find(t => t.id === type)?.label}
Number of days/instances: ${days || 1}
Country: ${country}
Currency: ${currency}

Provide:
1. type_explanation: what this expiation is and when it applies (2-3 sentences)
2. method_options: array of objects { method, description, priority_order } listing ALL valid methods (e.g. freeing a slave [historical], fasting, feeding, etc.)
3. feeding_calculation: { per_day_amount, total_amount, currency, food_type_description } for the feeding option
4. total_amount: total monetary amount if paying (number)
5. ruling_school: which madhab this follows
6. intention_arabic: the niyyah (intention) to make in Arabic and transliteration
7. important_notes: array of up to 3 important fiqh notes`,
        response_json_schema: {
          type: 'object',
          properties: {
            type_explanation: { type: 'string' },
            method_options: { type: 'array', items: { type: 'object', properties: { method: { type: 'string' }, description: { type: 'string' }, priority_order: { type: 'number' } } } },
            feeding_calculation: { type: 'object', properties: { per_day_amount: { type: 'number' }, total_amount: { type: 'number' }, currency: { type: 'string' }, food_type_description: { type: 'string' } } },
            total_amount: { type: 'number' },
            ruling_school: { type: 'string' },
            intention_arabic: { type: 'string' },
            important_notes: { type: 'array', items: { type: 'string' } },
          }
        }
      });
      setResult(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-teal-100 dark:border-teal-900 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="px-5 py-4 bg-gradient-to-r from-teal-700 to-cyan-700 flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-xl">
          <Coins className="w-5 h-5 text-teal-200" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Fidyah / Kaffarah Calculator</h3>
          <p className="text-xs text-teal-200">Islamic expiation for missed obligations</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Type of Expiation</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
            {FIDYAH_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Days/Count</label>
            <input type="number" min="1" value={days} onChange={e => setDays(e.target.value)} placeholder="1"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Country</label>
            <select value={country} onChange={e => setCountry(e.target.value)}
              className="w-full h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option>UK</option><option>USA</option><option>Canada</option><option>UAE</option><option>Saudi Arabia</option><option>Pakistan</option><option>Egypt</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="w-full h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option>GBP</option><option>USD</option><option>CAD</option><option>AED</option><option>SAR</option><option>PKR</option>
            </select>
          </div>
        </div>

        <Button onClick={calculate} disabled={loading} className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:opacity-90 h-9">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Calculating…</> : <><Calculator className="w-4 h-4 mr-2" />Calculate Expiation</>}
        </Button>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-900">
                <p className="text-xs text-teal-800 dark:text-teal-300 leading-relaxed">{result.type_explanation}</p>
              </div>

              {/* Feeding calc */}
              {result.feeding_calculation && (
                <div className="p-4 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl text-white">
                  <p className="text-[10px] font-bold uppercase opacity-70 mb-1">💰 Monetary Value (Feeding Option)</p>
                  <p className="text-3xl font-black">{result.feeding_calculation.currency} {result.feeding_calculation.total_amount?.toLocaleString()}</p>
                  <p className="text-xs opacity-80 mt-1">{result.feeding_calculation.currency} {result.feeding_calculation.per_day_amount} × {days || 1} day(s) · {result.feeding_calculation.food_type_description}</p>
                </div>
              )}

              {/* Methods */}
              {result.method_options?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">📋 Valid Methods (in order of priority)</p>
                  <div className="space-y-1.5">
                    {result.method_options.sort((a, b) => a.priority_order - b.priority_order).map((m, i) => (
                      <div key={i} className="flex gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-[10px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{m.method}</p>
                          <p className="text-xs text-slate-500">{m.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Niyyah */}
              {result.intention_arabic && (
                <div className="p-3 bg-slate-800 rounded-xl text-center">
                  <p className="text-[10px] text-slate-400 mb-1">Intention (Niyyah)</p>
                  <p className="text-sm text-white italic">{result.intention_arabic}</p>
                </div>
              )}

              {/* Notes */}
              {result.important_notes?.map((n, i) => (
                <p key={i} className="text-xs text-slate-500 dark:text-slate-400 pl-3 border-l-2 border-teal-300">📌 {n}</p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}