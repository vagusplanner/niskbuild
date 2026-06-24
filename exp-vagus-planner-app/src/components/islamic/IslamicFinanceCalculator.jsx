import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, CheckCircle2, XCircle, AlertTriangle, Loader2, Home, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SDK } from '@/lib/custom-sdk.js';

const TOOLS = [
  { id: 'mortgage', label: 'Mortgage Halal Check', icon: Home, gradient: 'from-blue-500 to-cyan-500' },
  { id: 'investment', label: 'Investment / Sukuk', icon: TrendingUp, gradient: 'from-emerald-500 to-teal-500' },
];

export default function IslamicFinanceCalculator() {
  const [activeTool, setActiveTool] = useState('mortgage');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Mortgage fields
  const [mortgageData, setMortgageData] = useState({
    lender: '', product: '', interestRate: '', loanAmount: '', term: '', purpose: 'home purchase'
  });

  // Investment fields
  const [investmentData, setInvestmentData] = useState({
    company: '', sector: '', debtRatio: '', halalRevenuePct: '', instrument: 'stocks'
  });

  const analyse = async () => {
    setLoading(true);
    setResult(null);
    try {
      let prompt = '';
      if (activeTool === 'mortgage') {
        prompt = `You are an Islamic finance scholar (AAOIFI standards). Analyse this mortgage product for Shariah compliance:
- Lender: ${mortgageData.lender || 'Unknown'}
- Product type: ${mortgageData.product || 'Unknown'}
- Interest rate: ${mortgageData.interestRate}%
- Loan amount: £${mortgageData.loanAmount}
- Term: ${mortgageData.term} years
- Purpose: ${mortgageData.purpose}

Provide: verdict (halal/conditional/haram), confidence (0-100), reasoning (2-3 sentences), halal_alternatives (array of 2 Shariah-compliant alternatives like Ijara, Murabaha, diminishing Musharaka), red_flags (array), recommendations (array)`;
      } else {
        prompt = `You are an Islamic finance expert. Analyse this investment for Shariah compliance:
- Company/Fund: ${investmentData.company || 'Unknown'}
- Sector: ${investmentData.sector || 'Unknown'}
- Debt-to-assets ratio: ${investmentData.debtRatio}%
- Halal revenue percentage: ${investmentData.halalRevenuePct}%
- Instrument: ${investmentData.instrument}

Provide: verdict (halal/conditional/haram), confidence (0-100), screening_result (pass/fail/review), reasoning (2-3 sentences), purification_amount_pct (% of dividends to give to charity if conditional), halal_alternatives (2 alternatives), sukuk_equivalent (equivalent sukuk if applicable or null)`;
      }

      const res = await SDK.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            verdict: { type: 'string' },
            confidence: { type: 'number' },
            reasoning: { type: 'string' },
            halal_alternatives: { type: 'array', items: { type: 'string' } },
            red_flags: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } },
            screening_result: { type: 'string' },
            purification_amount_pct: { type: 'number' },
            sukuk_equivalent: { type: 'string' },
          }
        }
      });
      setResult(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const verdictConfig = {
    halal: { color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2, iconColor: 'text-emerald-600' },
    conditional: { color: 'bg-amber-100 text-amber-800 border-amber-300', icon: AlertTriangle, iconColor: 'text-amber-600' },
    haram: { color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle, iconColor: 'text-red-600' },
  };
  const verdict = result?.verdict?.toLowerCase() || 'halal';
  const vConfig = verdictConfig[verdict] || verdictConfig.halal;
  const VIcon = vConfig.icon;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 to-teal-700 flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-xl">
          <Calculator className="w-5 h-5 text-emerald-200" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Islamic Finance Calculator</h3>
          <p className="text-xs text-emerald-200">Mortgage halal check · Investment screening · Sukuk</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Tool selector */}
        <div className="grid grid-cols-2 gap-2">
          {TOOLS.map(tool => (
            <button key={tool.id} onClick={() => { setActiveTool(tool.id); setResult(null); }}
              className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-semibold ${activeTool === tool.id ? 'border-teal-400 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className={`p-1.5 rounded-lg bg-gradient-to-br ${tool.gradient}`}>
                <tool.icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs leading-tight">{tool.label}</span>
            </button>
          ))}
        </div>

        {/* Mortgage form */}
        {activeTool === 'mortgage' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-slate-500 mb-1 block">Lender</label>
                <Input value={mortgageData.lender} onChange={e => setMortgageData(p => ({...p, lender: e.target.value}))} placeholder="e.g. HSBC" className="h-8 text-xs" /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Product Type</label>
                <Input value={mortgageData.product} onChange={e => setMortgageData(p => ({...p, product: e.target.value}))} placeholder="e.g. Ijara" className="h-8 text-xs" /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Interest Rate (%)</label>
                <Input type="number" value={mortgageData.interestRate} onChange={e => setMortgageData(p => ({...p, interestRate: e.target.value}))} placeholder="4.5" className="h-8 text-xs" /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Loan Amount (£)</label>
                <Input type="number" value={mortgageData.loanAmount} onChange={e => setMortgageData(p => ({...p, loanAmount: e.target.value}))} placeholder="200000" className="h-8 text-xs" /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Term (years)</label>
                <Input type="number" value={mortgageData.term} onChange={e => setMortgageData(p => ({...p, term: e.target.value}))} placeholder="25" className="h-8 text-xs" /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Purpose</label>
                <select value={mortgageData.purpose} onChange={e => setMortgageData(p => ({...p, purpose: e.target.value}))}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
                  <option>home purchase</option><option>buy to let</option><option>remortgage</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Investment form */}
        {activeTool === 'investment' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-slate-500 mb-1 block">Company/Fund</label>
                <Input value={investmentData.company} onChange={e => setInvestmentData(p => ({...p, company: e.target.value}))} placeholder="e.g. Apple Inc" className="h-8 text-xs" /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Sector</label>
                <Input value={investmentData.sector} onChange={e => setInvestmentData(p => ({...p, sector: e.target.value}))} placeholder="e.g. Technology" className="h-8 text-xs" /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Debt Ratio (%)</label>
                <Input type="number" value={investmentData.debtRatio} onChange={e => setInvestmentData(p => ({...p, debtRatio: e.target.value}))} placeholder="25" className="h-8 text-xs" /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Halal Revenue (%)</label>
                <Input type="number" value={investmentData.halalRevenuePct} onChange={e => setInvestmentData(p => ({...p, halalRevenuePct: e.target.value}))} placeholder="95" className="h-8 text-xs" /></div>
              <div className="col-span-2"><label className="text-xs text-slate-500 mb-1 block">Instrument</label>
                <select value={investmentData.instrument} onChange={e => setInvestmentData(p => ({...p, instrument: e.target.value}))}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
                  <option>stocks</option><option>sukuk</option><option>ETF</option><option>REITs</option><option>commodities</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <Button onClick={analyse} disabled={loading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90 h-9">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analysing…</> : <><Calculator className="w-4 h-4 mr-2" />Analyse for Shariah Compliance</>}
        </Button>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${vConfig.color}`}>
                <VIcon className={`w-6 h-6 ${vConfig.iconColor} flex-shrink-0`} />
                <div className="flex-1">
                  <p className="font-bold text-sm capitalize">{verdict} — {result.screening_result || ''}</p>
                  <p className="text-xs opacity-80">{result.confidence}% confidence</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">{result.reasoning}</p>
              {result.purification_amount_pct > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                  <strong>Purification required:</strong> Donate {result.purification_amount_pct}% of dividends/returns to charity.
                </div>
              )}
              {result.red_flags?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-red-600">⚠️ Red Flags</p>
                  {result.red_flags.map((f, i) => <p key={i} className="text-xs text-slate-600 dark:text-slate-400 pl-3 border-l-2 border-red-300">• {f}</p>)}
                </div>
              )}
              {result.halal_alternatives?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-emerald-600">✅ Halal Alternatives</p>
                  {result.halal_alternatives.map((a, i) => <p key={i} className="text-xs text-slate-600 dark:text-slate-400 pl-3 border-l-2 border-emerald-300">• {a}</p>)}
                </div>
              )}
              {result.sukuk_equivalent && (
                <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-900 text-xs">
                  <strong className="text-teal-700 dark:text-teal-400">Sukuk equivalent:</strong>
                  <span className="text-teal-800 dark:text-teal-300 ml-1">{result.sukuk_equivalent}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}